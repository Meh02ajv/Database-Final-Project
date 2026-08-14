const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { verifyToken, requireStaff, requireAdmin } = require('../middleware/auth');
const { validateReservation } = require('../middleware/validate');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reservations — Create reservation + invoice atomically (Customer)
//
// TRANSACTION SCOPE:
//   BEGIN
//     1. Validate room availability (SELECT with FOR UPDATE lock)
//     2. Validate room status and occupancy
//     3. INSERT into RESERVATION
//     4. Calculate room charges
//     5. INSERT into INVOICE
//     6. UPDATE ROOM status → 'Reserved'
//   COMMIT  ← all 3 writes succeed together
//   ROLLBACK ← if any step fails, nothing is persisted
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', verifyToken, validateReservation, async (req, res) => {
  const { RoomNumber, CheckInDate, CheckOutDate, NumOccupants } = req.body;
  const CustomerID = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── Step 1: Lock the room row to prevent concurrent double-bookings ──────
    const [room] = await conn.query(
      'SELECT Status, MaxOccupants, CategoryID FROM ROOM WHERE RoomNumber = ? FOR UPDATE',
      [RoomNumber]
    );
    if (!room.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Room not found.' });
    }

    // ── Step 2: Validate room status ─────────────────────────────────────────
    if (room[0].Status === 'Under Maintenance') {
      await conn.rollback();
      return res.status(400).json({ error: 'Room is under maintenance and cannot be reserved.' });
    }

    // ── Step 3: Check for date-range conflicts ────────────────────────────────
    const [conflicts] = await conn.query(`
      SELECT ReservationID FROM RESERVATION
      WHERE RoomNumber = ?
        AND Status IN ('Confirmed', 'Checked-In')
        AND CheckInDate  < ?
        AND CheckOutDate > ?
    `, [RoomNumber, CheckOutDate, CheckInDate]);

    if (conflicts.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'Room is not available for the selected dates.' });
    }

    // ── Step 4: Validate occupancy ────────────────────────────────────────────
    if (NumOccupants > room[0].MaxOccupants) {
      await conn.rollback();
      return res.status(400).json({
        error: `Number of occupants (${NumOccupants}) exceeds room maximum (${room[0].MaxOccupants}).`
      });
    }

    // ── Step 5: Generate unique booking reference ─────────────────────────────
    const ref = `GH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*99999).toString().padStart(5,'0')}`;

    // ── Step 6: INSERT RESERVATION ────────────────────────────────────────────
    const [resResult] = await conn.query(`
      INSERT INTO RESERVATION
        (CustomerID, RoomNumber, CheckInDate, CheckOutDate, NumOccupants, Status, BookingReference)
      VALUES (?, ?, ?, ?, ?, 'Confirmed', ?)
    `, [CustomerID, RoomNumber, CheckInDate, CheckOutDate, NumOccupants, ref]);

    const reservationID = resResult.insertId;

    // ── Step 7: Calculate room charges ───────────────────────────────────────
    const [catRows] = await conn.query(
      'SELECT PricePerNight FROM ROOM_CATEGORY WHERE CategoryID = ?',
      [room[0].CategoryID]
    );
    const pricePerNight = parseFloat(catRows[0].PricePerNight);
    const nights        = Math.max(
      1,
      Math.round((new Date(CheckOutDate) - new Date(CheckInDate)) / 86400000)
    );
    const roomCharges   = parseFloat((pricePerNight * nights).toFixed(2));

    // ── Step 8: INSERT INVOICE atomically with the reservation ────────────────
    await conn.query(`
      INSERT INTO INVOICE
        (ReservationID, EventID, RoomCharges, EventCharges, AdditionalCharges, TotalAmount, PaymentStatus, IssuedDate)
      VALUES (?, NULL, ?, 0.00, 0.00, ?, 'Unpaid', NOW())
    `, [reservationID, roomCharges, roomCharges]);

    // ── Step 9: UPDATE ROOM status → Reserved ────────────────────────────────
    await conn.query(
      "UPDATE ROOM SET Status = 'Reserved' WHERE RoomNumber = ?",
      [RoomNumber]
    );

    // ── Step 10: COMMIT ───────────────────────────────────────────────────────
    await conn.commit();

    res.status(201).json({
      message:          'Reservation confirmed.',
      ReservationID:    reservationID,
      BookingReference: ref,
      RoomCharges:      roomCharges,
      Nights:           nights
    });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reservations/my — Customer's own reservations
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT res.*, rc.CategoryName, rc.PricePerNight,
             i.TotalAmount, i.PaymentStatus, i.InvoiceID
      FROM   RESERVATION res
      JOIN   ROOM r          ON res.RoomNumber = r.RoomNumber
      JOIN   ROOM_CATEGORY rc ON r.CategoryID  = rc.CategoryID
      LEFT JOIN INVOICE i    ON i.ReservationID = res.ReservationID
      WHERE  res.CustomerID = ?
      ORDER  BY res.CheckInDate DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reservations — All reservations (any staff role)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', verifyToken, requireStaff, async (req, res) => {
  const { status, date, search } = req.query;
  try {
    let query = `
      SELECT res.*,
             CONCAT(c.FirstName,' ',c.LastName) AS GuestName,
             c.Email, c.ContactNumber,
             rc.CategoryName,
             i.TotalAmount, i.PaymentStatus, i.InvoiceID
      FROM   RESERVATION res
      JOIN   CUSTOMER      c  ON res.CustomerID = c.CustomerID
      JOIN   ROOM          r  ON res.RoomNumber  = r.RoomNumber
      JOIN   ROOM_CATEGORY rc ON r.CategoryID   = rc.CategoryID
      LEFT JOIN INVOICE    i  ON i.ReservationID = res.ReservationID
      WHERE  1=1
    `;
    const params = [];
    if (status) { query += ' AND res.Status = ?'; params.push(status); }
    if (date)   { query += ' AND DATE(res.CheckInDate) = ?'; params.push(date); }
    if (search) {
      query += ' AND (c.FirstName LIKE ? OR c.LastName LIKE ? OR res.BookingReference LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY res.CheckInDate DESC LIMIT 200';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/reservations/:id/checkin — Check in guest (any staff)
//
// TRANSACTION SCOPE:
//   BEGIN
//     1. Lock + validate reservation (FOR UPDATE)
//     2. UPDATE RESERVATION → Checked-In
//     3. UPDATE ROOM → Occupied
//   COMMIT / ROLLBACK
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/checkin', verifyToken, requireStaff, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM RESERVATION WHERE ReservationID = ? FOR UPDATE',
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    if (rows[0].Status !== 'Confirmed') {
      await conn.rollback();
      return res.status(400).json({ error: 'Reservation must be Confirmed to check in.' });
    }

    await conn.query(
      "UPDATE RESERVATION SET Status = 'Checked-In', ActualCheckIn = NOW() WHERE ReservationID = ?",
      [req.params.id]
    );
    await conn.query(
      "UPDATE ROOM SET Status = 'Occupied' WHERE RoomNumber = ?",
      [rows[0].RoomNumber]
    );

    await conn.commit();
    res.json({ message: 'Guest checked in successfully.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/reservations/:id/checkout — Check out guest (any staff)
//
// TRANSACTION SCOPE:
//   BEGIN
//     1. Lock + validate reservation (FOR UPDATE)
//     2. Lock invoice (FOR UPDATE)
//     3. Apply late check-out fee (if provided)
//     4. Validate invoice is fully Paid
//     5. UPDATE RESERVATION → Checked-Out
//     6. UPDATE ROOM → Available
//   COMMIT / ROLLBACK
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/checkout', verifyToken, requireStaff, async (req, res) => {
  const { lateCheckoutFee } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM RESERVATION WHERE ReservationID = ? FOR UPDATE',
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    if (rows[0].Status !== 'Checked-In') {
      await conn.rollback();
      return res.status(400).json({ error: 'Guest is not currently Checked-In.' });
    }

    const [inv] = await conn.query(
      'SELECT * FROM INVOICE WHERE ReservationID = ? FOR UPDATE',
      [req.params.id]
    );
    if (!inv.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Invoice not found for this reservation.' });
    }

    // Apply late check-out fee if provided
    const fee = parseFloat(lateCheckoutFee) || 0;
    if (fee > 0) {
      await conn.query(`
        UPDATE INVOICE
        SET    AdditionalCharges = AdditionalCharges + ?,
               TotalAmount       = TotalAmount + ?
        WHERE  ReservationID = ?
      `, [fee, fee, req.params.id]);
    }

    // Re-read invoice after fee update
    const [updatedInv] = await conn.query(
      'SELECT PaymentStatus FROM INVOICE WHERE ReservationID = ?',
      [req.params.id]
    );
    if (updatedInv[0].PaymentStatus !== 'Paid') {
      await conn.rollback();
      return res.status(400).json({
        error: 'Check-out blocked: customer must settle all outstanding payments first.'
      });
    }

    await conn.query(
      "UPDATE RESERVATION SET Status = 'Checked-Out', ActualCheckOut = NOW() WHERE ReservationID = ?",
      [req.params.id]
    );
    await conn.query(
      "UPDATE ROOM SET Status = 'Available' WHERE RoomNumber = ?",
      [rows[0].RoomNumber]
    );

    await conn.commit();
    res.json({ message: 'Guest checked out successfully.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/reservations/:id/cancel — Cancel reservation (Customer or Admin)
//
// TRANSACTION SCOPE:
//   BEGIN
//     1. Lock + validate reservation (FOR UPDATE)
//     2. Authorisation check
//     3. UPDATE RESERVATION → Cancelled
//     4. UPDATE ROOM → Available
//   COMMIT / ROLLBACK
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/cancel', verifyToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM RESERVATION WHERE ReservationID = ? FOR UPDATE',
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Customers can only cancel their own reservations
    if (req.user.role === 'customer' && rows[0].CustomerID !== req.user.id) {
      await conn.rollback();
      return res.status(403).json({ error: 'Not authorised to cancel this reservation.' });
    }

    if (rows[0].Status !== 'Confirmed') {
      await conn.rollback();
      return res.status(400).json({ error: 'Only Confirmed reservations can be cancelled.' });
    }

    await conn.query(
      "UPDATE RESERVATION SET Status = 'Cancelled' WHERE ReservationID = ?",
      [req.params.id]
    );
    await conn.query(
      "UPDATE ROOM SET Status = 'Available' WHERE RoomNumber = ?",
      [rows[0].RoomNumber]
    );

    await conn.commit();
    res.json({ message: 'Reservation cancelled successfully.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;