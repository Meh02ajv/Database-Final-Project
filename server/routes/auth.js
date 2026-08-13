const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateToken } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');

// POST /api/auth/register — Client registration
router.post('/register', validateRegister, async (req, res) => {
  const { FirstName, LastName, Email, ContactNumber, Password } = req.body;
  try {
    const [existing] = await pool.query('SELECT CustomerID FROM CUSTOMER WHERE Email = ?', [Email]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email already registered.' });

    const hash = await bcrypt.hash(Password, 12);
    const [result] = await pool.query(
      'INSERT INTO CUSTOMER (FirstName, LastName, Email, ContactNumber, PasswordHash) VALUES (?,?,?,?,?)',
      [FirstName, LastName, Email, ContactNumber, hash]
    );
    const token = generateToken({ CustomerID: result.insertId, Email, role: 'client' });
    res.status(201).json({ message: 'Registration successful.', token, CustomerID: result.insertId, FirstName, role: 'client' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — Client login
router.post('/login', validateLogin, async (req, res) => {
  const { Email, Password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM CUSTOMER WHERE Email = ?', [Email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });
    const customer = rows[0];
    const valid = await bcrypt.compare(Password, customer.PasswordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });
    const token = generateToken({ CustomerID: customer.CustomerID, Email: customer.Email, role: 'client' });
    res.json({ token, CustomerID: customer.CustomerID, FirstName: customer.FirstName, role: 'client' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/manager/login — Manager login (hardcoded credentials for demo)
router.post('/manager/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
  // Demo manager credentials — in production, store in DB with hashed passwords
  const MANAGER_USER = process.env.MANAGER_USER || 'manager';
  const MANAGER_PASS = process.env.MANAGER_PASS || 'manager123';
  if (username !== MANAGER_USER || password !== MANAGER_PASS) {
    return res.status(401).json({ error: 'Invalid manager credentials.' });
  }
  const token = generateToken({ CustomerID: 0, Email: 'manager@grandhorizon.com', role: 'manager' });
  res.json({ token, role: 'manager', name: 'Hotel Manager' });
});

module.exports = router;