const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { verifyToken, requireAdmin, requireStaff, requireEventStaff } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rooms — Search available rooms with filters (Public)
// ─────────────────────────────────────────────────────────────────────────────
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
    if (category)  { query += ' AND rc.CategoryName = ?';      params.push(category); }
    if (minPrice)  { query += ' AND rc.PricePerNight >= ?';    params.push(minPrice); }
    if (maxPrice)  { query += ' AND rc.PricePerNight <= ?';    params.push(maxPrice); }
    if (occupants) { query += ' AND r.MaxOccupants >= ?';      params.push(occupants); }
    if (checkIn && checkOut) {
      query += ` AND r.RoomNumber NOT IN (
        SELECT RoomNumber FROM RESERVATION
        WHERE Status IN ('Confirmed', 'Checked-In')
        AND CheckInDate  < ?
        AND CheckOutDate > ?
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rooms/categories — All room categories (Public)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM ROOM_CATEGORY ORDER BY PricePerNight'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rooms/all — All rooms with full details (any staff role)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/all', verifyToken, requireStaff, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, rc.CategoryName, rc.PricePerNight
      FROM ROOM r
      JOIN ROOM_CATEGORY rc ON r.CategoryID = rc.CategoryID
      ORDER BY r.RoomNumber
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rooms/:roomNumber — Single room details (Public)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:roomNumber', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, rc.CategoryName, rc.Description, rc.PricePerNight
      FROM ROOM r
      JOIN ROOM_CATEGORY rc ON r.CategoryID = rc.CategoryID
      WHERE r.RoomNumber = ?
    `, [req.params.roomNumber]);
    if (!rows.length) return res.status(404).json({ error: 'Room not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/rooms/:roomNumber/status — Update room status only (Administrator)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:roomNumber/status', verifyToken, requireAdmin, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Available', 'Reserved', 'Occupied', 'Under Maintenance'];
  if (!validStatuses.includes(status))
    return res.status(400).json({ error: 'Invalid status. Must be Available, Reserved, Occupied, or Under Maintenance.' });
  try {
    const [existing] = await pool.query(
      'SELECT RoomNumber FROM ROOM WHERE RoomNumber = ?',
      [req.params.roomNumber]
    );
    if (!existing.length)
      return res.status(404).json({ error: 'Room not found.' });

    await pool.query(
      'UPDATE ROOM SET Status = ? WHERE RoomNumber = ?',
      [status, req.params.roomNumber]
    );
    res.json({ message: `Room ${req.params.roomNumber} status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rooms — Create a new room (Administrator only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { RoomNumber, CategoryID, Floor, MaxOccupants, Status } = req.body;

  if (!RoomNumber || !CategoryID || Floor === undefined || !MaxOccupants)
    return res.status(400).json({ error: 'RoomNumber, CategoryID, Floor, and MaxOccupants are required.' });

  const validStatuses = ['Available', 'Reserved', 'Occupied', 'Under Maintenance'];
  const roomStatus = Status || 'Available';
  if (!validStatuses.includes(roomStatus))
    return res.status(400).json({ error: 'Invalid status. Must be Available, Reserved, Occupied, or Under Maintenance.' });

  try {
    // Check if room number already exists
    const [existing] = await pool.query(
      'SELECT RoomNumber FROM ROOM WHERE RoomNumber = ?',
      [RoomNumber]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: `Room ${RoomNumber} already exists.` });

    // Check if category exists
    const [cat] = await pool.query(
      'SELECT CategoryID FROM ROOM_CATEGORY WHERE CategoryID = ?',
      [CategoryID]
    );
    if (!cat.length)
      return res.status(404).json({ error: 'Room category not found.' });

    await pool.query(
      'INSERT INTO ROOM (RoomNumber, CategoryID, Floor, MaxOccupants, Status) VALUES (?, ?, ?, ?, ?)',
      [RoomNumber, CategoryID, Floor, MaxOccupants, roomStatus]
    );
    res.status(201).json({
      message:    `Room ${RoomNumber} created successfully.`,
      RoomNumber
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/rooms/:roomNumber — Edit room details (Administrator only)
// Supports partial updates — only provided fields are updated.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:roomNumber', verifyToken, requireAdmin, async (req, res) => {
  const { CategoryID, Floor, MaxOccupants, Status } = req.body;
  try {
    const [existing] = await pool.query(
      'SELECT * FROM ROOM WHERE RoomNumber = ?',
      [req.params.roomNumber]
    );
    if (!existing.length)
      return res.status(404).json({ error: 'Room not found.' });

    const validStatuses = ['Available', 'Reserved', 'Occupied', 'Under Maintenance'];
    if (Status && !validStatuses.includes(Status))
      return res.status(400).json({ error: 'Invalid status.' });

    // Build dynamic update query with only provided fields
    const fields = [];
    const values = [];
    if (CategoryID   !== undefined) { fields.push('CategoryID = ?');   values.push(CategoryID); }
    if (Floor        !== undefined) { fields.push('Floor = ?');        values.push(Floor); }
    if (MaxOccupants !== undefined) { fields.push('MaxOccupants = ?'); values.push(MaxOccupants); }
    if (Status       !== undefined) { fields.push('Status = ?');       values.push(Status); }

    if (!fields.length)
      return res.status(400).json({ error: 'No fields provided to update.' });

    values.push(req.params.roomNumber);
    await pool.query(
      `UPDATE ROOM SET ${fields.join(', ')} WHERE RoomNumber = ?`,
      values
    );
    res.json({ message: `Room ${req.params.roomNumber} updated successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/rooms/:roomNumber — Delete a room (Administrator only)
// Blocked if the room has active (Confirmed or Checked-In) reservations.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:roomNumber', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM ROOM WHERE RoomNumber = ?',
      [req.params.roomNumber]
    );
    if (!existing.length)
      return res.status(404).json({ error: 'Room not found.' });

    // Block deletion if room has active reservations
    const [activeRes] = await pool.query(`
      SELECT ReservationID FROM RESERVATION
      WHERE RoomNumber = ?
        AND Status IN ('Confirmed', 'Checked-In')
    `, [req.params.roomNumber]);

    if (activeRes.length > 0) {
      return res.status(409).json({
        error: `Cannot delete Room ${req.params.roomNumber}. It has ${activeRes.length} active reservation(s). Cancel or complete them first.`
      });
    }

    await pool.query(
      'DELETE FROM ROOM WHERE RoomNumber = ?',
      [req.params.roomNumber]
    );
    res.json({ message: `Room ${req.params.roomNumber} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;