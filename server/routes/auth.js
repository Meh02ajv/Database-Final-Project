const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const pool     = require('../config/db');
const { generateToken, verifyToken, requireAdmin, ROLES } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register — Customer self-registration
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', validateRegister, async (req, res) => {
  const { FirstName, LastName, Email, ContactNumber, Password } = req.body;
  try {
    const [existing] = await pool.query(
      'SELECT CustomerID FROM CUSTOMER WHERE Email = ?', [Email]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'Email already registered.' });

    const hash = await bcrypt.hash(Password, 12);
    const [result] = await pool.query(
      'INSERT INTO CUSTOMER (FirstName, LastName, Email, ContactNumber, PasswordHash) VALUES (?,?,?,?,?)',
      [FirstName, LastName, Email, ContactNumber, hash]
    );
    const token = generateToken({
      id:    result.insertId,
      email: Email,
      role:  ROLES.CUSTOMER,
      type:  'customer'
    });
    res.status(201).json({
      message:    'Registration successful.',
      token,
      CustomerID: result.insertId,
      FirstName,
      role:       ROLES.CUSTOMER,
      type:       'customer'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login — Customer login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', validateLogin, async (req, res) => {
  const { Email, Password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM CUSTOMER WHERE Email = ?', [Email]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const customer = rows[0];
    const valid    = await bcrypt.compare(Password, customer.PasswordHash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const token = generateToken({
      id:    customer.CustomerID,
      email: customer.Email,
      role:  ROLES.CUSTOMER,
      type:  'customer'
    });
    res.json({
      token,
      CustomerID: customer.CustomerID,
      FirstName:  customer.FirstName,
      role:       ROLES.CUSTOMER,
      type:       'customer'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/staff/login — Staff login
// Supports: Administrator | Event Staff | Finance/Billing Staff
// ─────────────────────────────────────────────────────────────────────────────
router.post('/staff/login', async (req, res) => {
  const { Email, Password } = req.body;
  if (!Email || !Password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const [rows] = await pool.query(
      'SELECT * FROM STAFF WHERE Email = ? AND IsActive = TRUE', [Email]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid credentials or account inactive.' });

    const staff = rows[0];
    const valid = await bcrypt.compare(Password, staff.PasswordHash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials or account inactive.' });

    const token = generateToken({
      id:    staff.StaffID,
      email: staff.Email,
      role:  staff.Role,   // 'Administrator' | 'Event Staff' | 'Finance/Billing Staff'
      type:  'staff'
    });
    res.json({
      token,
      StaffID:   staff.StaffID,
      FirstName: staff.FirstName,
      LastName:  staff.LastName,
      role:      staff.Role,
      type:      'staff'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/manager/login — Legacy alias (backward compatibility)
// Redirects to staff login logic
// ─────────────────────────────────────────────────────────────────────────────
router.post('/manager/login', async (req, res) => {
  const { username, password, Email, Password } = req.body;
  // Support both old format {username, password} and new format {Email, Password}
  const email = Email || username;
  const pass  = Password || password;

  if (!email || !pass)
    return res.status(400).json({ error: 'Email/username and password are required.' });

  try {
    const [rows] = await pool.query(
      'SELECT * FROM STAFF WHERE Email = ? AND IsActive = TRUE', [email]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid manager credentials.' });

    const staff = rows[0];
    const valid = await bcrypt.compare(pass, staff.PasswordHash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid manager credentials.' });

    const token = generateToken({
      id:    staff.StaffID,
      email: staff.Email,
      role:  staff.Role,
      type:  'staff'
    });
    res.json({
      token,
      StaffID:   staff.StaffID,
      FirstName: staff.FirstName,
      role:      staff.Role,
      type:      'staff',
      name:      `${staff.FirstName} ${staff.LastName}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/staff — List all staff accounts (Administrator only)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/staff', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT StaffID, FirstName, LastName, Email, Role, IsActive, CreatedAt
      FROM   STAFF
      ORDER  BY Role, FirstName
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/staff/create — Create new staff account (Administrator only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/staff/create', verifyToken, requireAdmin, async (req, res) => {
  const { FirstName, LastName, Email, Password, Role } = req.body;
  const validRoles = ['Administrator', 'Event Staff', 'Finance/Billing Staff'];

  if (!FirstName || !LastName || !Email || !Password || !Role)
    return res.status(400).json({ error: 'All fields are required: FirstName, LastName, Email, Password, Role.' });

  if (!validRoles.includes(Role))
    return res.status(400).json({
      error: 'Invalid role. Must be Administrator, Event Staff, or Finance/Billing Staff.'
    });

  try {
    const [existing] = await pool.query(
      'SELECT StaffID FROM STAFF WHERE Email = ?', [Email]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'Email already registered.' });

    const hash = await bcrypt.hash(Password, 12);
    const [result] = await pool.query(
      'INSERT INTO STAFF (FirstName, LastName, Email, PasswordHash, Role) VALUES (?,?,?,?,?)',
      [FirstName, LastName, Email, hash, Role]
    );
    res.status(201).json({
      message: `Staff account created for ${FirstName} ${LastName} (${Role}).`,
      StaffID: result.insertId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/staff/:id — Update staff account (Administrator only)
// Supports partial updates: FirstName, LastName, Role, IsActive
// ─────────────────────────────────────────────────────────────────────────────
router.put('/staff/:id', verifyToken, requireAdmin, async (req, res) => {
  const { Role, IsActive, FirstName, LastName } = req.body;
  const validRoles = ['Administrator', 'Event Staff', 'Finance/Billing Staff'];

  if (Role && !validRoles.includes(Role))
    return res.status(400).json({ error: 'Invalid role.' });

  try {
    const [existing] = await pool.query(
      'SELECT StaffID FROM STAFF WHERE StaffID = ?', [req.params.id]
    );
    if (!existing.length)
      return res.status(404).json({ error: 'Staff account not found.' });

    const fields = [];
    const values = [];
    if (FirstName !== undefined) { fields.push('FirstName = ?');  values.push(FirstName); }
    if (LastName  !== undefined) { fields.push('LastName = ?');   values.push(LastName); }
    if (Role      !== undefined) { fields.push('Role = ?');       values.push(Role); }
    if (IsActive  !== undefined) { fields.push('IsActive = ?');   values.push(IsActive); }

    if (!fields.length)
      return res.status(400).json({ error: 'No fields provided to update.' });

    values.push(req.params.id);
    await pool.query(
      `UPDATE STAFF SET ${fields.join(', ')} WHERE StaffID = ?`,
      values
    );
    res.json({ message: 'Staff account updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/auth/staff/:id — Deactivate staff account (Administrator only)
// Soft delete: sets IsActive = FALSE to preserve audit history
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/staff/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT StaffID, FirstName, LastName FROM STAFF WHERE StaffID = ?',
      [req.params.id]
    );
    if (!existing.length)
      return res.status(404).json({ error: 'Staff account not found.' });

    await pool.query(
      'UPDATE STAFF SET IsActive = FALSE WHERE StaffID = ?',
      [req.params.id]
    );
    res.json({
      message: `Staff account for ${existing[0].FirstName} ${existing[0].LastName} has been deactivated.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;