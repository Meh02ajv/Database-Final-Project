const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireManager } = require('../middleware/auth');

// GET /api/rooms — Search available rooms with filters
router.get('/', async (req, res) => {
  const { checkIn, checkOut, category, minPrice, maxPrice, occupants } = req.query;
  try {
    let query = `
      SELECT r.RoomNumber, r.Floor, r.MaxOccupants, r.Status,
             rc.CategoryName, rc.Description, rc.PricePerNight
      FROM ROOM r
      JOIN ROOM_CATEGORY rc ON r.CategoryID = rc.CategoryID
      WHERE r.Status != 'Under Maintenance'
    `;
    const params = [];
    if (category) { query += ' AND rc.CategoryName = ?'; params.push(category); }
    if (minPrice) { query += ' AND rc.PricePerNight >= ?'; params.push(minPrice); }
    if (maxPrice) { query += ' AND rc.PricePerNight <= ?'; params.push(maxPrice); }
    if (occupants) { query += ' AND r.MaxOccupants >= ?'; params.push(occupants); }
    if (checkIn && checkOut) {
      query += ` AND r.RoomNumber NOT IN (
        SELECT RoomNumber FROM RESERVATION
        WHERE Status IN ('Confirmed','Checked-In')
        AND CheckInDate < ? AND CheckOutDate > ?
      )`;
      params.push(checkOut, checkIn);
    }
    query += ' ORDER BY rc.PricePerNight, r.RoomNumber';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/categories — All room categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ROOM_CATEGORY ORDER BY PricePerNight');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/all — All rooms (manager)
router.get('/all', verifyToken, requireManager, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, rc.CategoryName, rc.PricePerNight
      FROM ROOM r JOIN ROOM_CATEGORY rc ON r.CategoryID = rc.CategoryID
      ORDER BY r.RoomNumber
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/:roomNumber — Single room details
router.get('/:roomNumber', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, rc.CategoryName, rc.Description, rc.PricePerNight
      FROM ROOM r JOIN ROOM_CATEGORY rc ON r.CategoryID = rc.CategoryID
      WHERE r.RoomNumber = ?
    `, [req.params.roomNumber]);
    if (rows.length === 0) return res.status(404).json({ error: 'Room not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rooms/:roomNumber/status — Update room status (manager)
router.put('/:roomNumber/status', verifyToken, requireManager, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Available', 'Reserved', 'Occupied', 'Under Maintenance'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  try {
    await pool.query('UPDATE ROOM SET Status = ? WHERE RoomNumber = ?', [status, req.params.roomNumber]);
    res.json({ message: `Room ${req.params.roomNumber} status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
