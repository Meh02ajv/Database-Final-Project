// Role-based access control middleware
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'grand_horizon_secret_2026';

// ── Valid roles ───────────────────────────────────────────────────────────────
const ROLES = {
  CUSTOMER:        'customer',
  ADMINISTRATOR:   'Administrator',
  EVENT_STAFF:     'Event Staff',
  FINANCE_STAFF:   'Finance/Billing Staff',
};

// ── Generate token ────────────────────────────────────────────────────────────
// payload: { id, email, role, type }
// type: 'customer' | 'staff'
const generateToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
};

// ── Verify token (all authenticated users) ────────────────────────────────────
const verifyToken = (req, res, next) => {
  const auth  = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (!token)
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// ── Require any staff role ────────────────────────────────────────────────────
// Allows: Administrator | Event Staff | Finance/Billing Staff
const requireStaff = (req, res, next) => {
  const staffRoles = [
    ROLES.ADMINISTRATOR,
    ROLES.EVENT_STAFF,
    ROLES.FINANCE_STAFF
  ];
  if (!req.user || !staffRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Staff access required.' });
  }
  next();
};

// ── Require Administrator role only ───────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.ADMINISTRATOR) {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  next();
};

// ── Require Event Staff or Administrator ──────────────────────────────────────
const requireEventStaff = (req, res, next) => {
  const allowed = [ROLES.ADMINISTRATOR, ROLES.EVENT_STAFF];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Event Staff or Administrator access required.' });
  }
  next();
};

// ── Require Finance/Billing Staff or Administrator ────────────────────────────
const requireFinanceStaff = (req, res, next) => {
  const allowed = [ROLES.ADMINISTRATOR, ROLES.FINANCE_STAFF];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Finance/Billing Staff or Administrator access required.' });
  }
  next();
};

// ── Require Customer role ─────────────────────────────────────────────────────
const requireCustomer = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.CUSTOMER) {
    return res.status(403).json({ error: 'Customer access required.' });
  }
  next();
};

// ── Require any authenticated user (Customer or Staff) ───────────────────────
const requireAuth = (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ error: 'Authentication required.' });
  next();
};

// ── Legacy aliases (backward compatibility) ───────────────────────────────────
// requireManager maps to requireStaff (any staff role)
// requireClient  maps to requireCustomer
const requireManager = requireStaff;
const requireClient  = requireCustomer;

module.exports = {
  generateToken,
  verifyToken,
  requireAdmin,
  requireStaff,
  requireEventStaff,
  requireFinanceStaff,
  requireCustomer,
  requireAuth,
  // legacy aliases
  requireManager,
  requireClient,
  ROLES,
};