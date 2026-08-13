const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireManager } = require('../middleware/auth');

// GET /api/reports/dashboard — Manager dashboard summary
router.get('/dashboard', verifyToken, requireManager, async (req, res) => {
  try {
    const [[occupancy]] = await pool.query(`
      SELECT
        COUNT(*) AS TotalRooms,
        SUM(Status='Available') AS Available,
        SUM(Status='Reserved') AS Reserved,
        SUM(Status='Occupied') AS Occupied,
        SUM(Status='Under Maintenance') AS UnderMaintenance
      FROM ROOM
    `);
    const [[guests]] = await pool.query(`
      SELECT COUNT(*) AS CurrentGuests, SUM(NumOccupants) AS TotalOccupants
      FROM RESERVATION WHERE Status='Checked-In'
    `);
    const [[todayActivity]] = await pool.query(`
      SELECT
        SUM(DATE(CheckInDate)=CURDATE()) AS TodayCheckIns,
        SUM(DATE(CheckOutDate)=CURDATE()) AS TodayCheckOuts
      FROM RESERVATION WHERE Status IN ('Confirmed','Checked-In','Checked-Out')
    `);
    const [[revenue]] = await pool.query(`
      SELECT
        COALESCE(SUM(TotalAmount),0) AS TotalRevenue,
        COALESCE(SUM(CASE WHEN PaymentStatus='Unpaid' THEN TotalAmount ELSE 0 END),0) AS OutstandingBalance
      FROM INVOICE
    `);
    const [[upcomingEvents]] = await pool.query(`
      SELECT COUNT(*) AS UpcomingEvents FROM EVENT_BOOKING
      WHERE Status='Confirmed' AND EventDate >= CURDATE()
    `);
    const [[customers]] = await pool.query(`SELECT COUNT(*) AS TotalCustomers FROM CUSTOMER`);
    res.json({ occupancy, guests, todayActivity, revenue, upcomingEvents, customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/occupancy — Daily/monthly occupancy report
router.get('/occupancy', verifyToken, requireManager, async (req, res) => {
  const { from, to } = req.query;
  const startDate = from || new Date(new Date().setDate(1)).toISOString().slice(0,10);
  const endDate = to || new Date().toISOString().slice(0,10);
  try {
    const [byCategory] = await pool.query(`
      SELECT rc.CategoryName,
        COUNT(res.ReservationID) AS Bookings,
        SUM(DATEDIFF(res.CheckOutDate, res.CheckInDate)) AS TotalNights,
        COALESCE(SUM(i.RoomCharges),0) AS Revenue
      FROM RESERVATION res
      JOIN ROOM r ON res.RoomNumber = r.RoomNumber
      JOIN ROOM_CATEGORY rc ON r.CategoryID = rc.CategoryID
      LEFT JOIN INVOICE i ON i.ReservationID = res.ReservationID AND i.PaymentStatus='Paid'
      WHERE DATE(res.CheckInDate) BETWEEN ? AND ? AND res.Status != 'Cancelled'
      GROUP BY rc.CategoryName ORDER BY Revenue DESC
    `, [startDate, endDate]);

    const [overdue] = await pool.query(`
      SELECT res.ReservationID, res.BookingReference,
        CONCAT(c.FirstName,' ',c.LastName) AS GuestName, c.ContactNumber,
        res.RoomNumber, res.CheckOutDate,
        TIMESTAMPDIFF(HOUR, res.CheckOutDate, NOW()) AS HoursOverdue,
        i.PaymentStatus
      FROM RESERVATION res
      JOIN CUSTOMER c ON res.CustomerID = c.CustomerID
      LEFT JOIN INVOICE i ON i.ReservationID = res.ReservationID
      WHERE res.Status='Checked-In' AND res.CheckOutDate < NOW()
    `);

    res.json({ period: { from: startDate, to: endDate }, byCategory, overdue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/revenue — Revenue report
router.get('/revenue', verifyToken, requireManager, async (req, res) => {
  try {
    const [monthly] = await pool.query(`
      SELECT DATE_FORMAT(IssuedDate,'%Y-%m') AS Month,
        SUM(RoomCharges) AS RoomRevenue,
        SUM(EventCharges) AS EventRevenue,
        SUM(AdditionalCharges) AS AdditionalRevenue,
        SUM(TotalAmount) AS Total,
        COUNT(DISTINCT ReservationID) AS RoomBookings,
        COUNT(DISTINCT EventID) AS EventBookings
      FROM INVOICE WHERE PaymentStatus='Paid'
      GROUP BY DATE_FORMAT(IssuedDate,'%Y-%m')
      ORDER BY Month DESC LIMIT 12
    `);
    const [[totals]] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN PaymentStatus='Paid' THEN TotalAmount END),0) AS TotalPaid,
        COALESCE(SUM(CASE WHEN PaymentStatus='Unpaid' THEN TotalAmount END),0) AS TotalUnpaid,
        COALESCE(SUM(CASE WHEN PaymentStatus='Partially Paid' THEN TotalAmount END),0) AS TotalPartial
      FROM INVOICE
    `);
    res.json({ monthly, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/feedback-summary — Feedback analytics
router.get('/feedback-summary', verifyToken, requireManager, async (req, res) => {
  try {
    const [[summary]] = await pool.query(`
      SELECT COUNT(*) AS Total, ROUND(AVG(Rating),2) AS AvgRating,
        SUM(Rating=5) AS Excellent, SUM(Rating=4) AS Good,
        SUM(Rating=3) AS Average, SUM(Rating<=2) AS Poor
      FROM FEEDBACK
    `);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;