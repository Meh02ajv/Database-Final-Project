const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireManager } = require('../middleware/auth');
const { validatePayment } = require('../middleware/validate');

// GET /api/invoices/my — Client's own invoices
router.get('/my', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*,
        CASE WHEN i.ReservationID IS NOT NULL THEN 'Room Reservation' ELSE 'Event Booking' END AS InvoiceType,
        COALESCE(res.BookingReference, CONCAT('EVT-', eb.EventID)) AS Reference,
        COALESCE(res.CheckInDate, eb.EventDate) AS ServiceDate
      FROM INVOICE i
      LEFT JOIN RESERVATION res ON i.ReservationID = res.ReservationID
      LEFT JOIN EVENT_BOOKING eb ON i.EventID = eb.EventID
      WHERE res.CustomerID = ? OR eb.CustomerID = ?
      ORDER BY i.IssuedDate DESC
    `, [req.user.id, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices — All invoices (manager)
router.get('/', verifyToken, requireManager, async (req, res) => {
  const { status, search, type } = req.query;
  try {
    let query = `
      SELECT i.*,
        CASE WHEN i.ReservationID IS NOT NULL THEN 'Room Reservation' ELSE 'Event Booking' END AS InvoiceType,
        COALESCE(CONCAT(c1.FirstName,' ',c1.LastName), CONCAT(c2.FirstName,' ',c2.LastName)) AS CustomerName,
        COALESCE(res.BookingReference, CONCAT('EVT-', eb.EventID)) AS Reference
      FROM INVOICE i
      LEFT JOIN RESERVATION res ON i.ReservationID = res.ReservationID
      LEFT JOIN EVENT_BOOKING eb ON i.EventID = eb.EventID
      LEFT JOIN CUSTOMER c1 ON res.CustomerID = c1.CustomerID
      LEFT JOIN CUSTOMER c2 ON eb.CustomerID = c2.CustomerID
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND i.PaymentStatus = ?'; params.push(status); }
    if (type === 'room') { query += ' AND i.ReservationID IS NOT NULL'; }
    if (type === 'event') { query += ' AND i.EventID IS NOT NULL'; }
    if (search) { query += ' AND (c1.FirstName LIKE ? OR c1.LastName LIKE ? OR c2.FirstName LIKE ? OR c2.LastName LIKE ? OR res.BookingReference LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    query += ' ORDER BY i.IssuedDate DESC LIMIT 200';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id — Single invoice detail
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*,
        CASE WHEN i.ReservationID IS NOT NULL THEN 'Room Reservation' ELSE 'Event Booking' END AS InvoiceType,
        COALESCE(CONCAT(c1.FirstName,' ',c1.LastName), CONCAT(c2.FirstName,' ',c2.LastName)) AS CustomerName,
        COALESCE(c1.Email, c2.Email) AS CustomerEmail,
        COALESCE(c1.ContactNumber, c2.ContactNumber) AS CustomerContact,
        COALESCE(res.BookingReference, CONCAT('EVT-', eb.EventID)) AS Reference,
        res.CheckInDate, res.CheckOutDate, res.RoomNumber,
        eb.EventType, eb.EventDate, eb.StartTime, eb.EndTime, h.HallName
      FROM INVOICE i
      LEFT JOIN RESERVATION res ON i.ReservationID = res.ReservationID
      LEFT JOIN EVENT_BOOKING eb ON i.EventID = eb.EventID
      LEFT JOIN CUSTOMER c1 ON res.CustomerID = c1.CustomerID
      LEFT JOIN CUSTOMER c2 ON eb.CustomerID = c2.CustomerID
      LEFT JOIN HALL h ON eb.HallID = h.HallID
      WHERE i.InvoiceID = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Invoice not found.' });
    // Clients can only see their own invoices
    if (req.user.role === 'client') {
      const inv = rows[0];
      const [check] = await pool.query(`
        SELECT 1 FROM RESERVATION WHERE ReservationID = ? AND CustomerID = ?
        UNION
        SELECT 1 FROM EVENT_BOOKING WHERE EventID = ? AND CustomerID = ?
      `, [inv.ReservationID, req.user.id, inv.EventID, req.user.id]);
      if (!check.length) return res.status(403).json({ error: 'Not authorized.' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/pay — Record payment (manager)
router.post('/:id/pay', verifyToken, requireManager, validatePayment, async (req, res) => {
  const { AmountPaid } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM INVOICE WHERE InvoiceID = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Invoice not found.' });
    const inv = rows[0];
    const newStatus = AmountPaid >= inv.TotalAmount ? 'Paid' : 'Partially Paid';
    await pool.query('UPDATE INVOICE SET PaymentStatus = ? WHERE InvoiceID = ?', [newStatus, req.params.id]);
    res.json({ message: `Payment recorded. Status: ${newStatus}.`, PaymentStatus: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;