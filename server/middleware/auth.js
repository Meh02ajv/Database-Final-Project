// Role-based access control middleware
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'grand_horizon_secret_2026';

// Generate token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.CustomerID, email: user.Email, role: user.role },
    SECRET,
    { expiresIn: '8h' }
  );
};

// Verify token middleware
const verifyToken = (req, res, next) => {
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// Require manager role
const requireManager = (req, res, next) => {
  if (req.user?.role !== 'manager') {
    return res.status(403).json({ error: 'Manager access required.' });
  }
  next();
};

// Require client role
const requireClient = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  next();
};

module.exports = { generateToken, verifyToken, requireManager, requireClient };