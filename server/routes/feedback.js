const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireManager } = require('../middleware/auth');
const { validateFeedback } = require('../middleware/validate');

// POST /api/feedback — Submit feedback (client)
router.post('/', verifyToken, validateFeedback, async (req, res) => {
  const { ReservationID, EventID, Rating, Comments } = req.body;
  const CustomerID = req.user.id;
  if (!ReservationID && !EventID) return res.status(400).json({ error: 'Must link feedback to a reservation or event.' });
  try {
    // Validate eligibility
    if (ReservationID) {
      const [res_] = await pool.query('SELECT Status, CustomerID FROM RESERVATION WHERE ReservationID = ?', [ReservationID]);
      if (!res_.length) return res.status(404).json({ error: 'Reservation not found.' });
      if (res_[0].CustomerID !== CustomerID) return res.status(403).json({ error: 'Not authorized.' });
      if (res_[0].Status !== 'Checked-Out') return res.status(400).json({ error: 'Feedback only allowed after check-out.' });
    }
    if (EventID) {
      const [ev] = await pool.query('SELECT Status, CustomerID FROM EVENT_BOOKING WHERE EventID = ?', [EventID]);
      if (!ev.length) return res.status(404).json({ error: 'Event not found.' });
      if (ev[0].CustomerID !== CustomerID) return res.status(403).json({ error: 'Not authorized.' });
      if (ev[0].Status !== 'Completed') return res.status(400).json({ error: 'Feedback only allowed after event completion.' });
    }
    const [result] = await pool.query(
      'INSERT INTO FEEDBACK (CustomerID, ReservationID, EventID, Rating, Comments) VALUES (?,?,?,?,?)',
      [CustomerID, ReservationID || null, EventID || null, Rating, Comments || null]
    );
    res.status(201).json({ message: 'Feedback submitted. Thank you!', FeedbackID: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback — All feedback (manager)
router.get('/', verifyToken, requireManager, async (req, res) => {
  const { rating, type } = req.query;
  try {
    let query = `
      SELECT f.*, CONCAT(c.FirstName,' ',c.LastName) AS CustomerName, c.Email,
        CASE WHEN f.ReservationID IS NOT NULL THEN 'Room Stay' ELSE 'Event' END AS FeedbackType,
        COALESCE(res.BookingReference, CONCAT('EVT-',eb.EventID)) AS Reference
      FROM FEEDBACK f
      JOIN CUSTOMER c ON f.CustomerID = c.CustomerID
      LEFT JOIN RESERVATION res ON f.ReservationID = res.ReservationID
      LEFT JOIN EVENT_BOOKING eb ON f.EventID = eb.EventID
      WHERE 1=1
    `;
    const params = [];
    if (rating) { query += ' AND f.Rating = ?'; params.push(rating); }
    if (type === 'room') { query += ' AND f.ReservationID IS NOT NULL'; }
    if (type === 'event') { query += ' AND f.EventID IS NOT NULL'; }
    query += ' ORDER BY f.SubmittedDate DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/my — Client's own feedback
router.get('/my', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.*,
        CASE WHEN f.ReservationID IS NOT NULL THEN 'Room Stay' ELSE 'Event' END AS FeedbackType,
        COALESCE(res.BookingReference, CONCAT('EVT-',eb.EventID)) AS Reference
      FROM FEEDBACK f
      LEFT JOIN RESERVATION res ON f.ReservationID = res.ReservationID
      LEFT JOIN EVENT_BOOKING eb ON f.EventID = eb.EventID
      WHERE f.CustomerID = ?
      ORDER BY f.SubmittedDate DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;