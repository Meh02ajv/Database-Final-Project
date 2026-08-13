const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireManager } = require('../middleware/auth');
const { validateReservation } = require('../middleware/validate');

// POST /api/reservations — Create reservation (client)
router.post('/', verifyToken, validateReservation, async (req, res) => {
  const { RoomNumber, CheckInDate, CheckOutDate, NumOccupants } = req.body;
  const CustomerID = req.user.id;
  try {
    // Check room availability
    const [conflicts] = await pool.query(`
      SELECT ReservationID FROM RESERVATION
      WHERE RoomNumber = ? AND Status IN ('Confirmed','Checked-In')
      AND CheckInDate < ? AND CheckOutDate > ?
    `, [RoomNumber, CheckOutDate, CheckInDate]);
    if (conflicts.length > 0) return res.status(409).json({ error: 'Room is not available for the selected dates.' });

    // Check room status
    const [room] = await pool.query('SELECT Status, MaxOccupants FROM ROOM WHERE RoomNumber = ?', [RoomNumber]);
    if (!room.length) return res.status(404).json({ error: 'Room not found.' });
    if (room[0].Status === 'Under Maintenance') return res.status(400).json({ error: 'Room is under maintenance.' });
    if (NumOccupants > room[0].MaxOccupants) return res.status(400).json({ error: `Room max occupancy is ${room[0].MaxOccupants}.` });

    // Generate booking reference
    const ref = `GH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*99999).toString().padStart(5,'0')}`;

    const [result] = await pool.query(`
      INSERT INTO RESERVATION (CustomerID, RoomNumber, CheckInDate, CheckOutDate, NumOccupants, Status, BookingReference)
      VALUES (?,?,?,?,?,'Confirmed',?)
    `, [CustomerID, RoomNumber, CheckInDate, CheckOutDate, NumOccupants, ref]);

    res.status(201).json({ message: 'Reservation confirmed.', ReservationID: result.insertId, BookingReference: ref });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reservations/my — Client's own reservations
router.get('/my', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT res.*, rc.CategoryName, rc.PricePerNight,
             i.TotalAmount, i.PaymentStatus, i.InvoiceID
      FROM RESERVATION res
      JOIN ROOM r ON res.RoomNumber = r.RoomNumber
      JOIN ROOM_CATEGORY rc ON r.CategoryID = rc.CategoryID
      LEFT JOIN INVOICE i ON i.ReservationID = res.ReservationID
      WHERE res.CustomerID = ?
      ORDER BY res.CheckInDate DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reservations — All reservations (manager)
router.get('/', verifyToken, requireManager, async (req, res) => {
  const { status, date, search } = req.query;
  try {
    let query = `
      SELECT res.*, CONCAT(c.FirstName,' ',c.LastName) AS GuestName,
             c.Email, c.ContactNumber, rc.CategoryName,
             i.TotalAmount, i.PaymentStatus
      FROM RESERVATION res
      JOIN CUSTOMER c ON res.CustomerID = c.CustomerID
      JOIN ROOM r ON res.RoomNumber = r.RoomNumber
      JOIN ROOM_CATEGORY rc ON r.CategoryID = rc.CategoryID
      LEFT JOIN INVOICE i ON i.ReservationID = res.ReservationID
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND res.Status = ?'; params.push(status); }
    if (date) { query += ' AND DATE(res.CheckInDate) = ?'; params.push(date); }
    if (search) { query += ' AND (c.FirstName LIKE ? OR c.LastName LIKE ? OR res.BookingReference LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    query += ' ORDER BY res.CheckInDate DESC LIMIT 200';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reservations/:id/checkin — Check in (manager)
router.put('/:id/checkin', verifyToken, requireManager, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM RESERVATION WHERE ReservationID = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Reservation not found.' });
    if (rows[0].Status !== 'Confirmed') return res.status(400).json({ error: 'Reservation must be Confirmed to check in.' });
    await pool.query(`UPDATE RESERVATION SET Status='Checked-In', ActualCheckIn=NOW() WHERE ReservationID=?`, [req.params.id]);
    res.json({ message: 'Guest checked in successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reservations/:id/checkout — Check out (manager)
router.put('/:id/checkout', verifyToken, requireManager, async (req, res) => {
  const { lateCheckoutFee } = req.body;
  try {
    const [inv] = await pool.query('SELECT * FROM INVOICE WHERE ReservationID = ?', [req.params.id]);
    if (!inv.length) return res.status(404).json({ error: 'Invoice not found.' });
    if (inv[0].PaymentStatus !== 'Paid') return res.status(400).json({ error: 'Invoice must be paid before checkout.' });
    if (lateCheckoutFee > 0) {
      await pool.query(`UPDATE INVOICE SET AdditionalCharges=AdditionalCharges+?, TotalAmount=TotalAmount+? WHERE ReservationID=?`,
        [lateCheckoutFee, lateCheckoutFee, req.params.id]);
    }
    await pool.query(`UPDATE RESERVATION SET Status='Checked-Out', ActualCheckOut=NOW() WHERE ReservationID=?`, [req.params.id]);
    res.json({ message: 'Guest checked out successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reservations/:id/cancel — Cancel reservation
router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM RESERVATION WHERE ReservationID = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Reservation not found.' });
    if (req.user.role === 'client' && rows[0].CustomerID !== req.user.id)
      return res.status(403).json({ error: 'Not authorized.' });
    if (!['Confirmed'].includes(rows[0].Status))
      return res.status(400).json({ error: 'Only Confirmed reservations can be cancelled.' });
    await pool.query(`UPDATE RESERVATION SET Status='Cancelled' WHERE ReservationID=?`, [req.params.id]);
    res.json({ message: 'Reservation cancelled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;