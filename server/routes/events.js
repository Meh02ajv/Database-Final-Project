const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireManager } = require('../middleware/auth');
const { validateEventBooking } = require('../middleware/validate');

// GET /api/events/halls — Available halls with optional filters
router.get('/halls', async (req, res) => {
  const { date, startTime, endTime, attendees } = req.query;
  try {
    let query = `SELECT * FROM HALL WHERE IsAvailable = TRUE`;
    const params = [];
    if (attendees) { query += ' AND Capacity >= ?'; params.push(attendees); }
    if (date && startTime && endTime) {
      query += ` AND HallID NOT IN (
        SELECT HallID FROM EVENT_BOOKING
        WHERE EventDate = ? AND Status IN ('Confirmed','In Progress')
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

// POST /api/events — Book an event (client)
router.post('/', verifyToken, validateEventBooking, async (req, res) => {
  const { HallID, EventType, EventDate, StartTime, EndTime, ExpectedAttendees } = req.body;
  const CustomerID = req.user.id;
  try {
    // Check hall capacity
    const [hall] = await pool.query('SELECT * FROM HALL WHERE HallID = ?', [HallID]);
    if (!hall.length) return res.status(404).json({ error: 'Hall not found.' });
    if (ExpectedAttendees > hall[0].Capacity)
      return res.status(400).json({ error: `Hall capacity is ${hall[0].Capacity}. Reduce attendees.` });

    // Check overlap
    const [conflicts] = await pool.query(`
      SELECT EventID FROM EVENT_BOOKING
      WHERE HallID = ? AND EventDate = ? AND Status IN ('Confirmed','In Progress')
      AND StartTime < ? AND EndTime > ?
    `, [HallID, EventDate, EndTime, StartTime]);
    if (conflicts.length > 0) return res.status(409).json({ error: 'Hall is already booked for that time slot.' });

    const [result] = await pool.query(`
      INSERT INTO EVENT_BOOKING (CustomerID, HallID, EventType, EventDate, StartTime, EndTime, ExpectedAttendees, Status)
      VALUES (?,?,?,?,?,?,'Confirmed')
    `, [CustomerID, HallID, EventType, EventDate, StartTime, EndTime, ExpectedAttendees]);

    // Auto-create invoice
    const hours = (new Date(`1970-01-01T${EndTime}`) - new Date(`1970-01-01T${StartTime}`)) / 3600000;
    const eventCharge = parseFloat((hall[0].BookingPricePerHour * hours).toFixed(2));
    await pool.query(`
      INSERT INTO INVOICE (EventID, RoomCharges, EventCharges, AdditionalCharges, TotalAmount, PaymentStatus)
      VALUES (?,0,?,0,?,'Unpaid')
    `, [result.insertId, eventCharge, eventCharge]);

    res.status(201).json({ message: 'Event booked successfully.', EventID: result.insertId, TotalCharge: eventCharge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/my — Client's own event bookings
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

// GET /api/events — All events (manager)
router.get('/', verifyToken, requireManager, async (req, res) => {
  const { status, date, search } = req.query;
  try {
    let query = `
      SELECT eb.*, h.HallName, h.Capacity,
             CONCAT(c.FirstName,' ',c.LastName) AS CustomerName,
             c.Email, c.ContactNumber,
             i.TotalAmount, i.PaymentStatus
      FROM EVENT_BOOKING eb
      JOIN HALL h ON eb.HallID = h.HallID
      JOIN CUSTOMER c ON eb.CustomerID = c.CustomerID
      LEFT JOIN INVOICE i ON i.EventID = eb.EventID
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND eb.Status = ?'; params.push(status); }
    if (date) { query += ' AND eb.EventDate = ?'; params.push(date); }
    if (search) { query += ' AND (c.FirstName LIKE ? OR c.LastName LIKE ? OR eb.EventType LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    query += ' ORDER BY eb.EventDate DESC LIMIT 200';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/events/:id/status — Update event status (manager)
router.put('/:id/status', verifyToken, requireManager, async (req, res) => {
  const { status } = req.body;
  const valid = ['Confirmed', 'In Progress', 'Completed', 'Cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  try {
    await pool.query('UPDATE EVENT_BOOKING SET Status = ? WHERE EventID = ?', [status, req.params.id]);
    res.json({ message: `Event status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/events/:id/cancel — Cancel event (client or manager)
router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM EVENT_BOOKING WHERE EventID = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Event not found.' });
    if (req.user.role === 'client' && rows[0].CustomerID !== req.user.id)
      return res.status(403).json({ error: 'Not authorized.' });
    if (rows[0].Status !== 'Confirmed') return res.status(400).json({ error: 'Only Confirmed events can be cancelled.' });
    await pool.query(`UPDATE EVENT_BOOKING SET Status='Cancelled' WHERE EventID=?`, [req.params.id]);
    res.json({ message: 'Event booking cancelled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;