const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { verifyToken, requireStaff, requireEventStaff, requireCustomer } = require('../middleware/auth');
const { validateEventBooking } = require('../middleware/validate');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events/halls — Search available halls with filters (Public)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/halls', async (req, res) => {
  const { date, startTime, endTime, attendees } = req.query;
  try {
    let query = `SELECT * FROM HALL WHERE IsAvailable = TRUE`;
    const params = [];
    if (attendees) { query += ' AND Capacity >= ?'; params.push(attendees); }
    if (date && startTime && endTime) {
      query += ` AND HallID NOT IN (
        SELECT HallID FROM EVENT_BOOKING
        WHERE EventDate = ? AND Status IN ('Confirmed', 'In Progress')
        AND StartTime < ? AND EndTime > ?
      )`;
      params.push(date, endTime, startTime);
    }
    query += ' ORDER BY Capacity';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/events — Book an event + invoice atomically (Customer)
//
// TRANSACTION SCOPE:
//   BEGIN
//     1. Lock hall row (FOR UPDATE) to prevent concurrent double-bookings
//     2. Validate hall capacity
//     3. Check time-slot overlap (within the locked transaction)
//     4. INSERT into EVENT_BOOKING
//     5. Calculate event charges
//     6. INSERT into INVOICE
//   COMMIT  ← both writes succeed together
//   ROLLBACK ← if either INSERT fails, nothing is persisted
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', verifyToken, validateEventBooking, async (req, res) => {
  const { HallID, EventType, EventDate, StartTime, EndTime, ExpectedAttendees } = req.body;
  const CustomerID = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── Step 1: Lock hall row to prevent concurrent bookings ─────────────────
    const [hall] = await conn.query(
      'SELECT * FROM HALL WHERE HallID = ? FOR UPDATE',
      [HallID]
    );
    if (!hall.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Hall not found.' });
    }

    // ── Step 2: Validate capacity ─────────────────────────────────────────────
    if (ExpectedAttendees > hall[0].Capacity) {
      await conn.rollback();
      return res.status(400).json({
        error: `Hall capacity is ${hall[0].Capacity}. Reduce expected attendees.`
      });
    }

    // ── Step 3: Check time-slot overlap (within locked transaction) ───────────
    const [conflicts] = await conn.query(`
      SELECT EventID FROM EVENT_BOOKING
      WHERE  HallID    = ?
        AND  EventDate = ?
        AND  Status    IN ('Confirmed', 'In Progress')
        AND  StartTime < ?
        AND  EndTime   > ?
    `, [HallID, EventDate, EndTime, StartTime]);

    if (conflicts.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'Hall is already booked for that date and time slot.' });
    }

    // ── Step 4: INSERT EVENT_BOOKING ──────────────────────────────────────────
    const [result] = await conn.query(`
      INSERT INTO EVENT_BOOKING
        (CustomerID, HallID, EventType, EventDate, StartTime, EndTime, ExpectedAttendees, Status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed')
    `, [CustomerID, HallID, EventType, EventDate, StartTime, EndTime, ExpectedAttendees]);

    const eventID = result.insertId;

    // ── Step 5: Calculate event charges ──────────────────────────────────────
    const hours       = (new Date(`1970-01-01T${EndTime}`) - new Date(`1970-01-01T${StartTime}`)) / 3600000;
    const eventCharge = parseFloat((hall[0].BookingPricePerHour * hours).toFixed(2));

    // ── Step 6: INSERT INVOICE atomically with the event booking ─────────────
    // If this fails, ROLLBACK undoes the EVENT_BOOKING INSERT above.
    await conn.query(`
      INSERT INTO INVOICE
        (EventID, RoomCharges, EventCharges, AdditionalCharges, TotalAmount, PaymentStatus, IssuedDate)
      VALUES (?, 0.00, ?, 0.00, ?, 'Unpaid', NOW())
    `, [eventID, eventCharge, eventCharge]);

    // ── Step 7: COMMIT ────────────────────────────────────────────────────────
    await conn.commit();

    res.status(201).json({
      message:     'Event booked successfully.',
      EventID:     eventID,
      TotalCharge: eventCharge,
      Hours:       hours
    });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events/my — Customer's own event bookings
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT eb.*, h.HallName, h.Capacity, h.BookingPricePerHour,
             i.TotalAmount, i.PaymentStatus, i.InvoiceID
      FROM EVENT_BOOKING eb
      JOIN HALL h ON eb.HallID = h.HallID
      LEFT JOIN INVOICE i ON i.EventID = eb.EventID
      WHERE eb.CustomerID = ?
      ORDER BY eb.EventDate DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events — All events (any staff role)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', verifyToken, requireStaff, async (req, res) => {
  const { status, date, search } = req.query;
  try {
    let query = `
      SELECT eb.*, h.HallName, h.Capacity,
             CONCAT(c.FirstName, ' ', c.LastName) AS CustomerName,
             c.Email, c.ContactNumber,
             i.TotalAmount, i.PaymentStatus, i.InvoiceID
      FROM EVENT_BOOKING eb
      JOIN HALL     h ON eb.HallID     = h.HallID
      JOIN CUSTOMER c ON eb.CustomerID = c.CustomerID
      LEFT JOIN INVOICE i ON i.EventID = eb.EventID
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND eb.Status = ?';    params.push(status); }
    if (date)   { query += ' AND eb.EventDate = ?'; params.push(date); }
    if (search) {
      query += ' AND (c.FirstName LIKE ? OR c.LastName LIKE ? OR eb.EventType LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY eb.EventDate DESC LIMIT 200';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/events/:id/status — Update event status (Event Staff or Administrator)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/status', verifyToken, requireEventStaff, async (req, res) => {
  const { status } = req.body;
  const valid = ['Confirmed', 'In Progress', 'Completed', 'Cancelled'];
  if (!valid.includes(status))
    return res.status(400).json({ error: 'Invalid status. Must be Confirmed, In Progress, Completed, or Cancelled.' });
  try {
    const [existing] = await pool.query(
      'SELECT EventID FROM EVENT_BOOKING WHERE EventID = ?',
      [req.params.id]
    );
    if (!existing.length)
      return res.status(404).json({ error: 'Event not found.' });

    await pool.query(
      'UPDATE EVENT_BOOKING SET Status = ? WHERE EventID = ?',
      [status, req.params.id]
    );
    res.json({ message: `Event status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/events/:id/cancel — Cancel event (Customer or Administrator)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM EVENT_BOOKING WHERE EventID = ?',
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ error: 'Event not found.' });

    // Customers can only cancel their own event bookings
    if (req.user.role === 'customer' && rows[0].CustomerID !== req.user.id)
      return res.status(403).json({ error: 'Not authorized to cancel this event.' });

    if (rows[0].Status !== 'Confirmed')
      return res.status(400).json({ error: 'Only Confirmed events can be cancelled.' });

    await pool.query(
      "UPDATE EVENT_BOOKING SET Status = 'Cancelled' WHERE EventID = ?",
      [req.params.id]
    );
    res.json({ message: 'Event booking cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;