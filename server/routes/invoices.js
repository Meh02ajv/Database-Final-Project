const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { verifyToken, requireFinanceStaff, requireStaff } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/my — Customer's own invoices
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*,
        CASE WHEN i.ReservationID IS NOT NULL THEN 'Room Reservation' ELSE 'Event Booking' END AS InvoiceType,
        COALESCE(res.BookingReference, CONCAT('EVT-', eb.EventID)) AS Reference,
        COALESCE(res.CheckInDate, eb.EventDate) AS ServiceDate
      FROM INVOICE i
      LEFT JOIN RESERVATION   res ON i.ReservationID = res.ReservationID
      LEFT JOIN EVENT_BOOKING eb  ON i.EventID       = eb.EventID
      WHERE res.CustomerID = ? OR eb.CustomerID = ?
      ORDER BY i.IssuedDate DESC
    `, [req.user.id, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices — All invoices (any staff role)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', verifyToken, requireStaff, async (req, res) => {
  const { status, search, type } = req.query;
  try {
    let query = `
      SELECT i.*,
        CASE WHEN i.ReservationID IS NOT NULL THEN 'Room Reservation' ELSE 'Event Booking' END AS InvoiceType,
        COALESCE(CONCAT(c1.FirstName,' ',c1.LastName), CONCAT(c2.FirstName,' ',c2.LastName)) AS CustomerName,
        COALESCE(res.BookingReference, CONCAT('EVT-', eb.EventID)) AS Reference
      FROM INVOICE i
      LEFT JOIN RESERVATION   res ON i.ReservationID = res.ReservationID
      LEFT JOIN EVENT_BOOKING eb  ON i.EventID       = eb.EventID
      LEFT JOIN CUSTOMER      c1  ON res.CustomerID  = c1.CustomerID
      LEFT JOIN CUSTOMER      c2  ON eb.CustomerID   = c2.CustomerID
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND i.PaymentStatus = ?'; params.push(status); }
    if (type === 'room')  { query += ' AND i.ReservationID IS NOT NULL'; }
    if (type === 'event') { query += ' AND i.EventID IS NOT NULL'; }
    if (search) {
      query += ' AND (c1.FirstName LIKE ? OR c1.LastName LIKE ? OR c2.FirstName LIKE ? OR c2.LastName LIKE ? OR res.BookingReference LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY i.IssuedDate DESC LIMIT 200';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/:id — Single invoice detail (Customer or any Staff)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*,
        CASE WHEN i.ReservationID IS NOT NULL THEN 'Room Reservation' ELSE 'Event Booking' END AS InvoiceType,
        COALESCE(CONCAT(c1.FirstName,' ',c1.LastName), CONCAT(c2.FirstName,' ',c2.LastName)) AS CustomerName,
        COALESCE(c1.Email, c2.Email)                 AS CustomerEmail,
        COALESCE(c1.ContactNumber, c2.ContactNumber) AS CustomerContact,
        COALESCE(res.BookingReference, CONCAT('EVT-', eb.EventID)) AS Reference,
        res.CheckInDate, res.CheckOutDate, res.RoomNumber,
        eb.EventType, eb.EventDate, eb.StartTime, eb.EndTime, h.HallName
      FROM INVOICE i
      LEFT JOIN RESERVATION   res ON i.ReservationID = res.ReservationID
      LEFT JOIN EVENT_BOOKING eb  ON i.EventID       = eb.EventID
      LEFT JOIN CUSTOMER      c1  ON res.CustomerID  = c1.CustomerID
      LEFT JOIN CUSTOMER      c2  ON eb.CustomerID   = c2.CustomerID
      LEFT JOIN HALL          h   ON eb.HallID       = h.HallID
      WHERE i.InvoiceID = ?
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Invoice not found.' });

    // Customers can only see their own invoices
    // role === 'customer' matches ROLES.CUSTOMER in auth.js middleware
    if (req.user.role === 'customer') {
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invoices/:id/customer-pay — Customer self-payment (demo/recording)
//
// Allows an authenticated customer to pay ONLY their own invoice.
// Works for BOTH room reservation invoices AND event booking invoices.
// This is a demo payment endpoint — no real payment gateway is integrated.
// To add MoMo/Card: insert the gateway call before the UPDATE INVOICE below.
//
// TRANSACTION SCOPE:
//   BEGIN
//     1. Lock invoice row (FOR UPDATE)
//     2. Validate invoice belongs to the authenticated customer
//     3. Validate invoice is not already fully paid
//     4. UPDATE PaymentStatus based on amount paid
//   COMMIT / ROLLBACK
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/customer-pay', verifyToken, async (req, res) => {
  const { AmountPaid } = req.body;
  const customerID     = req.user.id;

  if (!AmountPaid || parseFloat(AmountPaid) <= 0) {
    return res.status(400).json({ error: 'AmountPaid must be greater than 0.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock invoice row
    const [rows] = await conn.query(
      'SELECT * FROM INVOICE WHERE InvoiceID = ? FOR UPDATE',
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const inv = rows[0];

    // Validate invoice belongs to this customer (room reservation OR event booking)
    const [ownership] = await conn.query(`
      SELECT 1 FROM RESERVATION  WHERE ReservationID = ? AND CustomerID = ?
      UNION
      SELECT 1 FROM EVENT_BOOKING WHERE EventID       = ? AND CustomerID = ?
    `, [inv.ReservationID, customerID, inv.EventID, customerID]);

    if (!ownership.length) {
      await conn.rollback();
      return res.status(403).json({ error: 'You are not authorised to pay this invoice.' });
    }

    // Block if already fully paid
    if (inv.PaymentStatus === 'Paid') {
      await conn.rollback();
      return res.status(400).json({ error: 'This invoice has already been fully paid.' });
    }

    // Determine new payment status
    const newStatus = parseFloat(AmountPaid) >= parseFloat(inv.TotalAmount)
                      ? 'Paid'
                      : 'Partially Paid';

    // ── Future MoMo/Card gateway integration point ────────────────────────────
    // const momoResult = await callMoMoAPI(AmountPaid, customerPhone);
    // if (!momoResult.success) {
    //   await conn.rollback();
    //   return res.status(402).json({ error: 'Payment gateway declined.' });
    // }
    // ─────────────────────────────────────────────────────────────────────────

    await conn.query(
      'UPDATE INVOICE SET PaymentStatus = ? WHERE InvoiceID = ?',
      [newStatus, req.params.id]
    );

    await conn.commit();

    res.json({
      message:       `Payment recorded successfully. Status: ${newStatus}.`,
      InvoiceID:     parseInt(req.params.id),
      AmountPaid:    parseFloat(AmountPaid),
      TotalAmount:   parseFloat(inv.TotalAmount),
      PaymentStatus: newStatus
    });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invoices/:id/pay — Record payment (Finance/Billing Staff or Admin)
// Staff-only endpoint — unchanged, not accessible by customers
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/pay', verifyToken, requireFinanceStaff, async (req, res) => {
  const { AmountPaid } = req.body;

  if (!AmountPaid || parseFloat(AmountPaid) <= 0) {
    return res.status(400).json({ error: 'AmountPaid must be greater than 0.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM INVOICE WHERE InvoiceID = ? FOR UPDATE',
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const inv       = rows[0];
    const newStatus = parseFloat(AmountPaid) >= parseFloat(inv.TotalAmount)
                      ? 'Paid'
                      : 'Partially Paid';

    await conn.query(
      'UPDATE INVOICE SET PaymentStatus = ? WHERE InvoiceID = ?',
      [newStatus, req.params.id]
    );

    await conn.commit();

    res.json({
      message:       `Payment recorded. Status: ${newStatus}.`,
      PaymentStatus: newStatus,
      InvoiceID:     req.params.id,
      AmountPaid:    parseFloat(AmountPaid),
      TotalAmount:   parseFloat(inv.TotalAmount)
    });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;