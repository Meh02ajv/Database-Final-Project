-- =============================================================================
--  HOTEL RESERVATION & EVENT MANAGEMENT SYSTEM
--  The Grand Horizon Hotel
--  Advanced SQL Script — Queries, Views, Stored Procedures, UDFs & Triggers
--  SQL Dialect: MySQL 8.0+
--  NOTE: Run hotel_db_ddl.sql then hotel_db_dml.sql first.
-- =============================================================================
 
USE grand_horizon_hotel;
 
SET FOREIGN_KEY_CHECKS = 1;
 
 
-- =============================================================================
-- SECTION 1 — ADVANCED SQL QUERIES (10)
-- =============================================================================
 
-- -----------------------------------------------------------------------------
-- QUERY 1: Current Hotel Occupancy Dashboard
-- Shows all occupied/reserved rooms with guest details, nights remaining,
-- and the total revenue expected from each active reservation.
-- -----------------------------------------------------------------------------
SELECT
    r.RoomNumber,
    rc.CategoryName                                   AS RoomType,
    r.Floor,
    CONCAT(c.FirstName, ' ', c.LastName)              AS GuestName,
    c.ContactNumber,
    res.BookingReference,
    res.CheckInDate,
    res.CheckOutDate,
    res.NumOccupants,
    res.Status                                        AS ReservationStatus,
    DATEDIFF(res.CheckOutDate, CURDATE())             AS NightsRemaining,
    rc.PricePerNight * DATEDIFF(res.CheckOutDate, res.CheckInDate)
                                                      AS ExpectedRoomRevenue
FROM   ROOM r
JOIN   ROOM_CATEGORY rc  ON r.CategoryID    = rc.CategoryID
JOIN   RESERVATION   res ON r.RoomNumber    = res.RoomNumber
JOIN   CUSTOMER      c   ON res.CustomerID  = c.CustomerID
WHERE  res.Status IN ('Confirmed', 'Checked-In')
ORDER BY res.CheckInDate;
 
 
-- -----------------------------------------------------------------------------
-- QUERY 2: Revenue Report — Monthly Breakdown by Source
-- Aggregates paid invoice revenue by month, split by room vs event bookings.
-- Includes running total using window function.
-- -----------------------------------------------------------------------------
SELECT
    DATE_FORMAT(i.IssuedDate, '%Y-%m')          AS Month,
    COUNT(DISTINCT i.ReservationID)             AS RoomBookings,
    COUNT(DISTINCT i.EventID)                   AS EventBookings,
    COALESCE(SUM(i.RoomCharges),       0)       AS RoomRevenue,
    COALESCE(SUM(i.EventCharges),      0)       AS EventRevenue,
    COALESCE(SUM(i.AdditionalCharges), 0)       AS AdditionalRevenue,
    COALESCE(SUM(i.TotalAmount),       0)       AS MonthlyTotal,
    SUM(SUM(i.TotalAmount)) OVER (
        ORDER BY DATE_FORMAT(i.IssuedDate, '%Y-%m')
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                                           AS RunningTotal
FROM   INVOICE i
WHERE  i.PaymentStatus = 'Paid'
GROUP  BY DATE_FORMAT(i.IssuedDate, '%Y-%m')
ORDER  BY Month;
 
 
-- -----------------------------------------------------------------------------
-- QUERY 3: Room Utilisation Rate per Category
-- Calculates what percentage of rooms in each category are currently
-- occupied or reserved vs total available rooms.
-- -----------------------------------------------------------------------------
SELECT
    rc.CategoryName,
    COUNT(r.RoomNumber)                                         AS TotalRooms,
    SUM(CASE WHEN r.Status = 'Available'         THEN 1 ELSE 0 END) AS Available,
    SUM(CASE WHEN r.Status = 'Reserved'          THEN 1 ELSE 0 END) AS Reserved,
    SUM(CASE WHEN r.Status = 'Occupied'          THEN 1 ELSE 0 END) AS Occupied,
    SUM(CASE WHEN r.Status = 'Under Maintenance' THEN 1 ELSE 0 END) AS UnderMaintenance,
    ROUND(
        SUM(CASE WHEN r.Status IN ('Reserved','Occupied') THEN 1 ELSE 0 END)
        / COUNT(r.RoomNumber) * 100, 2
    )                                                           AS OccupancyRate_Pct
FROM   ROOM_CATEGORY rc
JOIN   ROOM r ON rc.CategoryID = r.CategoryID
GROUP  BY rc.CategoryName
ORDER  BY OccupancyRate_Pct DESC;
 
 
-- -----------------------------------------------------------------------------
-- QUERY 4: Top 10 Customers by Total Spend
-- Ranks customers by their total paid invoice amount across both
-- room reservations and event bookings.
-- -----------------------------------------------------------------------------
SELECT
    c.CustomerID,
    CONCAT(c.FirstName, ' ', c.LastName)    AS CustomerName,
    c.Email,
    COUNT(DISTINCT res.ReservationID)       AS TotalReservations,
    COUNT(DISTINCT eb.EventID)              AS TotalEventBookings,
    COALESCE(SUM(i.TotalAmount), 0)         AS TotalSpend,
    RANK() OVER (ORDER BY SUM(i.TotalAmount) DESC)
                                            AS SpendRank
FROM   CUSTOMER c
LEFT JOIN RESERVATION   res ON c.CustomerID = res.CustomerID
LEFT JOIN EVENT_BOOKING eb  ON c.CustomerID = eb.CustomerID
LEFT JOIN INVOICE       i   ON (i.ReservationID = res.ReservationID
                             OR i.EventID       = eb.EventID)
                            AND i.PaymentStatus = 'Paid'
GROUP  BY c.CustomerID, c.FirstName, c.LastName, c.Email
ORDER  BY TotalSpend DESC
LIMIT  10;
 
 
-- -----------------------------------------------------------------------------
-- QUERY 5: Overdue Check-Outs with Outstanding Balance
-- Identifies guests who have exceeded their scheduled check-out time
-- and still have unpaid invoices.
-- -----------------------------------------------------------------------------
SELECT
    res.ReservationID,
    res.BookingReference,
    CONCAT(c.FirstName, ' ', c.LastName)            AS GuestName,
    c.ContactNumber,
    c.Email,
    res.RoomNumber,
    rc.CategoryName,
    res.CheckOutDate                                 AS ScheduledCheckOut,
    NOW()                                            AS CurrentDateTime,
    TIMESTAMPDIFF(HOUR, res.CheckOutDate, NOW())     AS HoursOverdue,
    i.TotalAmount                                    AS OutstandingBalance,
    i.PaymentStatus
FROM   RESERVATION   res
JOIN   CUSTOMER      c   ON res.CustomerID  = c.CustomerID
JOIN   ROOM          r   ON res.RoomNumber  = r.RoomNumber
JOIN   ROOM_CATEGORY rc  ON r.CategoryID   = rc.CategoryID
JOIN   INVOICE       i   ON i.ReservationID = res.ReservationID
WHERE  res.Status       = 'Checked-In'
  AND  res.CheckOutDate < NOW()
  AND  i.PaymentStatus != 'Paid'
ORDER  BY HoursOverdue DESC;
 
 
-- -----------------------------------------------------------------------------
-- QUERY 6: Hall Booking Frequency and Revenue Analysis
-- Shows how often each hall is booked, total revenue generated,
-- and average event duration.
-- -----------------------------------------------------------------------------
SELECT
    h.HallName,
    h.Capacity,
    h.BookingPricePerHour,
    COUNT(eb.EventID)                                           AS TotalBookings,
    SUM(CASE WHEN eb.Status = 'Completed'  THEN 1 ELSE 0 END)  AS CompletedEvents,
    SUM(CASE WHEN eb.Status = 'Cancelled'  THEN 1 ELSE 0 END)  AS CancelledEvents,
    ROUND(AVG(
        TIMESTAMPDIFF(MINUTE, eb.StartTime, eb.EndTime) / 60.0
    ), 2)                                                       AS AvgDurationHours,
    COALESCE(SUM(i.EventCharges), 0)                            AS TotalEventRevenue
FROM   HALL h
LEFT JOIN EVENT_BOOKING eb ON h.HallID       = eb.HallID
LEFT JOIN INVOICE       i  ON i.EventID      = eb.EventID
                           AND i.PaymentStatus = 'Paid'
GROUP  BY h.HallID, h.HallName, h.Capacity, h.BookingPricePerHour
ORDER  BY TotalBookings DESC;
 
 
-- -----------------------------------------------------------------------------
-- QUERY 7: Customer Feedback Analysis with Sentiment Categorisation
-- Retrieves all feedback with rating-based sentiment labels and
-- compares individual ratings against the overall average.
-- -----------------------------------------------------------------------------
SELECT
    f.FeedbackID,
    CONCAT(c.FirstName, ' ', c.LastName)        AS CustomerName,
    CASE
        WHEN f.ReservationID IS NOT NULL THEN 'Room Stay'
        ELSE 'Event'
    END                                         AS FeedbackType,
    COALESCE(res.BookingReference,
             CONCAT('EVT-', eb.EventID))        AS Reference,
    f.Rating,
    CASE
        WHEN f.Rating = 5 THEN 'Excellent'
        WHEN f.Rating = 4 THEN 'Good'
        WHEN f.Rating = 3 THEN 'Average'
        WHEN f.Rating = 2 THEN 'Poor'
        ELSE                    'Very Poor'
    END                                         AS Sentiment,
    ROUND(AVG(f.Rating) OVER (), 2)             AS OverallAvgRating,
    f.Rating - ROUND(AVG(f.Rating) OVER (), 2) AS VsAverage,
    f.Comments,
    f.SubmittedDate
FROM   FEEDBACK      f
JOIN   CUSTOMER      c   ON f.CustomerID    = c.CustomerID
LEFT JOIN RESERVATION   res ON f.ReservationID = res.ReservationID
LEFT JOIN EVENT_BOOKING eb  ON f.EventID       = eb.EventID
ORDER  BY f.SubmittedDate DESC;
 
 
-- -----------------------------------------------------------------------------
-- QUERY 8: Upcoming Events in the Next 30 Days with Hall Availability
-- Lists all confirmed events in the next 30 days alongside remaining
-- hall capacity and the booking customer's contact details.
-- -----------------------------------------------------------------------------
SELECT
    eb.EventID,
    eb.EventType,
    eb.EventDate,
    eb.StartTime,
    eb.EndTime,
    TIMESTAMPDIFF(MINUTE, eb.StartTime, eb.EndTime) / 60.0  AS DurationHours,
    eb.ExpectedAttendees,
    h.HallName,
    h.Capacity,
    h.Capacity - eb.ExpectedAttendees                        AS RemainingCapacity,
    CONCAT(c.FirstName, ' ', c.LastName)                     AS BookedBy,
    c.ContactNumber,
    c.Email,
    h.BookingPricePerHour *
        (TIMESTAMPDIFF(MINUTE, eb.StartTime, eb.EndTime) / 60.0)
                                                             AS EstimatedCharge
FROM   EVENT_BOOKING eb
JOIN   HALL     h ON eb.HallID     = h.HallID
JOIN   CUSTOMER c ON eb.CustomerID = c.CustomerID
WHERE  eb.Status    = 'Confirmed'
  AND  eb.EventDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER  BY eb.EventDate, eb.StartTime;
 
 
-- -----------------------------------------------------------------------------
-- QUERY 9: Reservation History per Customer with Stay Summary
-- Full booking history for each customer including total nights stayed,
-- total spend, and last stay date using CTEs.
-- -----------------------------------------------------------------------------
WITH CustomerStayStats AS (
    SELECT
        res.CustomerID,
        COUNT(res.ReservationID)                                    AS TotalBookings,
        SUM(CASE WHEN res.Status = 'Checked-Out' THEN 1 ELSE 0 END) AS CompletedStays,
        SUM(CASE WHEN res.Status = 'Cancelled'   THEN 1 ELSE 0 END) AS CancelledBookings,
        SUM(DATEDIFF(res.CheckOutDate, res.CheckInDate))            AS TotalNightsBooked,
        MAX(res.CheckOutDate)                                       AS LastStayDate
    FROM   RESERVATION res
    GROUP  BY res.CustomerID
),
CustomerSpend AS (
    SELECT
        res.CustomerID,
        COALESCE(SUM(i.TotalAmount), 0)  AS TotalSpend
    FROM   RESERVATION res
    JOIN   INVOICE     i ON i.ReservationID = res.ReservationID
                        AND i.PaymentStatus = 'Paid'
    GROUP  BY res.CustomerID
)
SELECT
    c.CustomerID,
    CONCAT(c.FirstName, ' ', c.LastName)    AS CustomerName,
    c.Email,
    c.RegistrationDate,
    COALESCE(s.TotalBookings,       0)      AS TotalBookings,
    COALESCE(s.CompletedStays,      0)      AS CompletedStays,
    COALESCE(s.CancelledBookings,   0)      AS CancelledBookings,
    COALESCE(s.TotalNightsBooked,   0)      AS TotalNightsBooked,
    COALESCE(sp.TotalSpend,         0)      AS TotalSpend,
    s.LastStayDate
FROM   CUSTOMER c
LEFT JOIN CustomerStayStats s  ON c.CustomerID = s.CustomerID
LEFT JOIN CustomerSpend     sp ON c.CustomerID = sp.CustomerID
ORDER  BY TotalSpend DESC;
 
 
-- -----------------------------------------------------------------------------
-- QUERY 10: Double-Booking Risk Detection
-- Identifies any reservations that overlap in date range for the same room
-- (should return 0 rows if triggers are working correctly — useful for auditing).
-- Also checks hall double-bookings.
-- -----------------------------------------------------------------------------
-- Room overlap check
SELECT
    'ROOM OVERLAP'                          AS ConflictType,
    r1.ReservationID                        AS Reservation1,
    r2.ReservationID                        AS Reservation2,
    r1.RoomNumber,
    r1.CheckInDate                          AS R1_CheckIn,
    r1.CheckOutDate                         AS R1_CheckOut,
    r2.CheckInDate                          AS R2_CheckIn,
    r2.CheckOutDate                         AS R2_CheckOut
FROM   RESERVATION r1
JOIN   RESERVATION r2
    ON  r1.RoomNumber    = r2.RoomNumber
    AND r1.ReservationID < r2.ReservationID
    AND r1.Status        NOT IN ('Cancelled')
    AND r2.Status        NOT IN ('Cancelled')
    AND r1.CheckInDate   < r2.CheckOutDate
    AND r1.CheckOutDate  > r2.CheckInDate
 
UNION ALL
 
-- Hall overlap check
SELECT
    'HALL OVERLAP'                          AS ConflictType,
    e1.EventID                              AS Event1,
    e2.EventID                              AS Event2,
    CAST(e1.HallID AS CHAR)                 AS HallID,
    CAST(e1.StartTime AS DATETIME)          AS E1_Start,
    CAST(e1.EndTime   AS DATETIME)          AS E1_End,
    CAST(e2.StartTime AS DATETIME)          AS E2_Start,
    CAST(e2.EndTime   AS DATETIME)          AS E2_End
FROM   EVENT_BOOKING e1
JOIN   EVENT_BOOKING e2
    ON  e1.HallID    = e2.HallID
    AND e1.EventDate = e2.EventDate
    AND e1.EventID   < e2.EventID
    AND e1.Status    NOT IN ('Cancelled')
    AND e2.Status    NOT IN ('Cancelled')
    AND e1.StartTime < e2.EndTime
    AND e1.EndTime   > e2.StartTime;
 
 
-- =============================================================================
-- SECTION 2 — VIEWS (5)
-- =============================================================================
 
-- -----------------------------------------------------------------------------
-- VIEW 1: vw_current_occupancy
-- Real-time snapshot of all occupied and reserved rooms with guest details.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_current_occupancy AS
SELECT
    r.RoomNumber,
    rc.CategoryName                                     AS RoomType,
    rc.PricePerNight,
    r.Floor,
    r.MaxOccupants,
    r.Status                                            AS RoomStatus,
    CONCAT(c.FirstName, ' ', c.LastName)                AS GuestName,
    c.ContactNumber,
    c.Email,
    res.BookingReference,
    res.CheckInDate,
    res.CheckOutDate,
    DATEDIFF(res.CheckOutDate, res.CheckInDate)         AS TotalNights,
    res.NumOccupants,
    res.Status                                          AS ReservationStatus,
    DATEDIFF(res.CheckOutDate, CURDATE())               AS NightsRemaining
FROM   ROOM          r
JOIN   ROOM_CATEGORY rc  ON r.CategoryID   = rc.CategoryID
LEFT JOIN RESERVATION   res ON r.RoomNumber  = res.RoomNumber
                            AND res.Status   IN ('Confirmed', 'Checked-In')
LEFT JOIN CUSTOMER      c   ON res.CustomerID = c.CustomerID
WHERE  r.Status IN ('Reserved', 'Occupied');
 
 
-- -----------------------------------------------------------------------------
-- VIEW 2: vw_invoice_summary
-- Full invoice details with customer name, booking type, and all charge components.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_invoice_summary AS
SELECT
    i.InvoiceID,
    i.IssuedDate,
    COALESCE(
        CONCAT(c1.FirstName, ' ', c1.LastName),
        CONCAT(c2.FirstName, ' ', c2.LastName)
    )                                                   AS CustomerName,
    CASE
        WHEN i.ReservationID IS NOT NULL THEN 'Room Reservation'
        WHEN i.EventID       IS NOT NULL THEN 'Event Booking'
    END                                                 AS InvoiceType,
    COALESCE(res.BookingReference,
             CONCAT('EVT-', eb.EventID))                AS Reference,
    i.RoomCharges,
    i.EventCharges,
    i.AdditionalCharges,
    i.TotalAmount,
    i.PaymentStatus
FROM   INVOICE       i
LEFT JOIN RESERVATION   res ON i.ReservationID = res.ReservationID
LEFT JOIN EVENT_BOOKING eb  ON i.EventID       = eb.EventID
LEFT JOIN CUSTOMER      c1  ON res.CustomerID  = c1.CustomerID
LEFT JOIN CUSTOMER      c2  ON eb.CustomerID   = c2.CustomerID;
 
 
-- -----------------------------------------------------------------------------
-- VIEW 3: vw_revenue_report
-- Monthly revenue summary broken down by source, for paid invoices only.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_revenue_report AS
SELECT
    DATE_FORMAT(i.IssuedDate, '%Y-%m')  AS Month,
    SUM(i.RoomCharges)                  AS TotalRoomRevenue,
    SUM(i.EventCharges)                 AS TotalEventRevenue,
    SUM(i.AdditionalCharges)            AS TotalAdditionalRevenue,
    SUM(i.TotalAmount)                  AS GrandTotalRevenue,
    COUNT(DISTINCT i.ReservationID)     AS TotalRoomBookings,
    COUNT(DISTINCT i.EventID)           AS TotalEventBookings
FROM   INVOICE i
WHERE  i.PaymentStatus = 'Paid'
GROUP  BY DATE_FORMAT(i.IssuedDate, '%Y-%m')
ORDER  BY Month DESC;
 
 
-- -----------------------------------------------------------------------------
-- VIEW 4: vw_event_schedule
-- All upcoming and in-progress events with hall and customer details.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_event_schedule AS
SELECT
    eb.EventID,
    eb.EventType,
    eb.EventDate,
    eb.StartTime,
    eb.EndTime,
    ROUND(TIMESTAMPDIFF(MINUTE, eb.StartTime, eb.EndTime) / 60.0, 2)
                                                        AS DurationHours,
    eb.ExpectedAttendees,
    eb.Status,
    h.HallName,
    h.Capacity,
    h.BookingPricePerHour,
    ROUND(h.BookingPricePerHour *
        TIMESTAMPDIFF(MINUTE, eb.StartTime, eb.EndTime) / 60.0, 2)
                                                        AS TotalHallCharge,
    CONCAT(c.FirstName, ' ', c.LastName)                AS BookedBy,
    c.ContactNumber,
    c.Email
FROM   EVENT_BOOKING eb
JOIN   HALL     h ON eb.HallID     = h.HallID
JOIN   CUSTOMER c ON eb.CustomerID = c.CustomerID
WHERE  eb.Status IN ('Confirmed', 'In Progress')
ORDER  BY eb.EventDate, eb.StartTime;
 
 
-- -----------------------------------------------------------------------------
-- VIEW 5: vw_feedback_summary
-- All customer feedback with sentiment label, booking reference, and type.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_feedback_summary AS
SELECT
    f.FeedbackID,
    f.SubmittedDate,
    CONCAT(c.FirstName, ' ', c.LastName)                AS CustomerName,
    c.Email,
    f.Rating,
    CASE
        WHEN f.Rating = 5 THEN 'Excellent'
        WHEN f.Rating = 4 THEN 'Good'
        WHEN f.Rating = 3 THEN 'Average'
        WHEN f.Rating = 2 THEN 'Poor'
        ELSE                    'Very Poor'
    END                                                 AS Sentiment,
    CASE
        WHEN f.ReservationID IS NOT NULL THEN 'Room Stay'
        ELSE 'Event'
    END                                                 AS FeedbackType,
    COALESCE(res.BookingReference,
             CONCAT('EVT-', eb.EventID))                AS Reference,
    f.Comments
FROM   FEEDBACK      f
JOIN   CUSTOMER      c   ON f.CustomerID    = c.CustomerID
LEFT JOIN RESERVATION   res ON f.ReservationID = res.ReservationID
LEFT JOIN EVENT_BOOKING eb  ON f.EventID       = eb.EventID;
 
 
-- =============================================================================
-- SECTION 3 — STORED PROCEDURES (3)
-- =============================================================================
 
DELIMITER $$
 
-- -----------------------------------------------------------------------------
-- PROCEDURE 1: sp_make_reservation
-- Creates a new room reservation, auto-generates a unique booking reference,
-- and returns the new ReservationID and BookingReference to the caller.
-- Validates: room availability, room status, and date logic.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_make_reservation (
    IN  p_customer_id     INT,
    IN  p_room_number     VARCHAR(10),
    IN  p_check_in        DATETIME,
    IN  p_check_out       DATETIME,
    IN  p_num_occupants   INT,
    OUT p_booking_ref     VARCHAR(20),
    OUT p_reservation_id  INT
)
BEGIN
    DECLARE v_room_status   VARCHAR(20);
    DECLARE v_max_occ       INT;
    DECLARE v_conflict      INT DEFAULT 0;
    DECLARE v_ref           VARCHAR(20);
 
    -- Validate check-in before check-out
    IF p_check_in >= p_check_out THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Check-in date must be earlier than check-out date.';
    END IF;
 
    -- Validate room exists and get its status
    SELECT Status, MaxOccupants
    INTO   v_room_status, v_max_occ
    FROM   ROOM
    WHERE  RoomNumber = p_room_number;
 
    IF v_room_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Room not found.';
    END IF;
 
    -- Block maintenance rooms
    IF v_room_status = 'Under Maintenance' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot reserve a room that is Under Maintenance.';
    END IF;
 
    -- Validate occupant count
    IF p_num_occupants > v_max_occ THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Number of occupants exceeds the room maximum.';
    END IF;
 
    -- Check for date overlap conflicts
    SELECT COUNT(*) INTO v_conflict
    FROM   RESERVATION
    WHERE  RoomNumber    = p_room_number
      AND  Status        IN ('Confirmed', 'Checked-In')
      AND  CheckInDate   < p_check_out
      AND  CheckOutDate  > p_check_in;
 
    IF v_conflict > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Room is already booked for the requested dates.';
    END IF;
 
    -- Generate unique booking reference
    SET v_ref = CONCAT('GH-', DATE_FORMAT(NOW(), '%Y%m%d'), '-',
                       LPAD(FLOOR(RAND() * 99999), 5, '0'));
 
    -- Insert reservation
    INSERT INTO RESERVATION (
        CustomerID, RoomNumber, CheckInDate, CheckOutDate,
        NumOccupants, Status, BookingReference
    ) VALUES (
        p_customer_id, p_room_number, p_check_in, p_check_out,
        p_num_occupants, 'Confirmed', v_ref
    );
 
    SET p_reservation_id = LAST_INSERT_ID();
    SET p_booking_ref    = v_ref;
 
    SELECT CONCAT('Reservation confirmed. Reference: ', v_ref) AS Message;
END$$
 
 
-- -----------------------------------------------------------------------------
-- PROCEDURE 2: sp_process_checkout
-- Handles the full guest check-out workflow:
--   1. Optionally applies a late check-out fee
--   2. Validates invoice is fully paid before allowing check-out
--   3. Updates reservation status to Checked-Out
--   4. Frees the room (via trigger)
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_process_checkout (
    IN p_reservation_id    INT,
    IN p_late_checkout_fee DECIMAL(10,2)
)
BEGIN
    DECLARE v_status         VARCHAR(20);
    DECLARE v_payment_status VARCHAR(20);
    DECLARE v_invoice_id     INT;
 
    -- Validate reservation exists and is Checked-In
    SELECT Status INTO v_status
    FROM   RESERVATION
    WHERE  ReservationID = p_reservation_id;
 
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Reservation not found.';
    END IF;
 
    IF v_status != 'Checked-In' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Guest is not currently Checked-In.';
    END IF;
 
    -- Get invoice
    SELECT InvoiceID, PaymentStatus
    INTO   v_invoice_id, v_payment_status
    FROM   INVOICE
    WHERE  ReservationID = p_reservation_id;
 
    -- Apply late check-out fee if provided
    IF p_late_checkout_fee > 0 THEN
        UPDATE INVOICE
        SET    AdditionalCharges = AdditionalCharges + p_late_checkout_fee,
               TotalAmount       = TotalAmount + p_late_checkout_fee
        WHERE  InvoiceID = v_invoice_id;
 
        -- Refresh payment status after fee update
        SELECT PaymentStatus INTO v_payment_status
        FROM   INVOICE
        WHERE  InvoiceID = v_invoice_id;
    END IF;
 
    -- Block check-out if invoice is unpaid
    IF v_payment_status != 'Paid' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Outstanding invoice must be settled before check-out.';
    END IF;
 
    -- Process check-out
    UPDATE RESERVATION
    SET    Status         = 'Checked-Out',
           ActualCheckOut = NOW()
    WHERE  ReservationID  = p_reservation_id;
 
    SELECT 'Check-out processed successfully.' AS Message;
END$$
 
 
-- -----------------------------------------------------------------------------
-- PROCEDURE 3: sp_generate_occupancy_report
-- Generates a summary occupancy report for a given date range.
-- Returns: total guests, room nights, revenue, and occupancy rate.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE sp_generate_occupancy_report (
    IN p_start_date DATE,
    IN p_end_date   DATE
)
BEGIN
    -- Validate date range
    IF p_start_date > p_end_date THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Start date must be before or equal to end date.';
    END IF;
 
    -- Overall summary
    SELECT
        p_start_date                                            AS ReportFrom,
        p_end_date                                              AS ReportTo,
        COUNT(DISTINCT res.ReservationID)                       AS TotalReservations,
        SUM(CASE WHEN res.Status = 'Checked-Out' THEN 1 ELSE 0 END)
                                                                AS CompletedStays,
        SUM(CASE WHEN res.Status = 'Cancelled'   THEN 1 ELSE 0 END)
                                                                AS Cancellations,
        SUM(res.NumOccupants)                                   AS TotalGuestNights,
        COALESCE(SUM(i.RoomCharges), 0)                         AS TotalRoomRevenue,
        COALESCE(SUM(i.AdditionalCharges), 0)                   AS TotalAdditionalRevenue,
        COALESCE(SUM(i.TotalAmount), 0)                         AS TotalRevenue
    FROM   RESERVATION res
    LEFT JOIN INVOICE i ON i.ReservationID = res.ReservationID
                       AND i.PaymentStatus = 'Paid'
    WHERE  DATE(res.CheckInDate) BETWEEN p_start_date AND p_end_date;
 
    -- Breakdown by room category
    SELECT
        rc.CategoryName,
        COUNT(res.ReservationID)                                AS Bookings,
        SUM(DATEDIFF(res.CheckOutDate, res.CheckInDate))        AS TotalNights,
        COALESCE(SUM(i.RoomCharges), 0)                         AS Revenue
    FROM   RESERVATION   res
    JOIN   ROOM          r  ON res.RoomNumber = r.RoomNumber
    JOIN   ROOM_CATEGORY rc ON r.CategoryID  = rc.CategoryID
    LEFT JOIN INVOICE    i  ON i.ReservationID = res.ReservationID
                           AND i.PaymentStatus = 'Paid'
    WHERE  DATE(res.CheckInDate) BETWEEN p_start_date AND p_end_date
    GROUP  BY rc.CategoryName
    ORDER  BY Revenue DESC;
END$$
 
 
DELIMITER ;
 
 
-- =============================================================================
-- SECTION 4 — USER-DEFINED FUNCTIONS (2)
-- =============================================================================
 
DELIMITER $$
 
-- -----------------------------------------------------------------------------
-- FUNCTION 1: fn_calculate_room_charge
-- Calculates the total room charge for a reservation based on the
-- room's category nightly rate and the number of nights.
-- Usage: SELECT fn_calculate_room_charge('201', '2026-08-10', '2026-08-14');
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_calculate_room_charge (
    p_room_number  VARCHAR(10),
    p_check_in     DATETIME,
    p_check_out    DATETIME
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_price_per_night DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_nights          INT           DEFAULT 0;
 
    -- Get nightly rate from room's category
    SELECT rc.PricePerNight INTO v_price_per_night
    FROM   ROOM r
    JOIN   ROOM_CATEGORY rc ON r.CategoryID = rc.CategoryID
    WHERE  r.RoomNumber = p_room_number;
 
    -- Calculate number of nights
    SET v_nights = DATEDIFF(p_check_out, p_check_in);
 
    IF v_nights <= 0 THEN
        RETURN 0.00;
    END IF;
 
    RETURN v_price_per_night * v_nights;
END$$
 
 
-- -----------------------------------------------------------------------------
-- FUNCTION 2: fn_calculate_event_charge
-- Calculates the total hall charge for an event booking based on the
-- hall's hourly rate and the event duration.
-- Usage: SELECT fn_calculate_event_charge(1, '09:00:00', '17:00:00');
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_calculate_event_charge (
    p_hall_id    INT,
    p_start_time TIME,
    p_end_time   TIME
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_price_per_hour DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_minutes        INT           DEFAULT 0;
 
    -- Get hourly rate from hall
    SELECT BookingPricePerHour INTO v_price_per_hour
    FROM   HALL
    WHERE  HallID = p_hall_id;
 
    -- Calculate duration in minutes
    SET v_minutes = TIMESTAMPDIFF(MINUTE,
                        CONCAT('2000-01-01 ', p_start_time),
                        CONCAT('2000-01-01 ', p_end_time));
 
    IF v_minutes <= 0 THEN
        RETURN 0.00;
    END IF;
 
    RETURN ROUND(v_price_per_hour * (v_minutes / 60.0), 2);
END$$
 
 
DELIMITER ;
 
 
-- =============================================================================
-- SECTION 5 — TRIGGERS (3) implementing business rules
-- =============================================================================
 
DELIMITER $$
 
-- -----------------------------------------------------------------------------
-- TRIGGER 1: trg_prevent_room_double_booking
-- Business Rule: A room cannot be booked by more than one customer
-- for the same date and time.
-- Also enforces: rooms under maintenance cannot be reserved.
-- Fires: BEFORE INSERT on RESERVATION
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_prevent_room_double_booking
BEFORE INSERT ON RESERVATION
FOR EACH ROW
BEGIN
    DECLARE v_room_status VARCHAR(20);
    DECLARE v_conflict    INT DEFAULT 0;
 
    -- Check room status
    SELECT Status INTO v_room_status
    FROM   ROOM
    WHERE  RoomNumber = NEW.RoomNumber;
 
    -- Block maintenance rooms
    IF v_room_status = 'Under Maintenance' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot reserve a room that is Under Maintenance.';
    END IF;
 
    -- Check for overlapping active reservations
    SELECT COUNT(*) INTO v_conflict
    FROM   RESERVATION
    WHERE  RoomNumber   = NEW.RoomNumber
      AND  Status       IN ('Confirmed', 'Checked-In')
      AND  CheckInDate  < NEW.CheckOutDate
      AND  CheckOutDate > NEW.CheckInDate;
 
    IF v_conflict > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Room is already booked for the requested dates. Double-booking prevented.';
    END IF;
END$$
 
 
-- -----------------------------------------------------------------------------
-- TRIGGER 2: trg_auto_invoice_and_room_status
-- Business Rules:
--   (a) Every reservation must automatically generate an invoice.
--   (b) Room status must be updated to 'Reserved' upon booking confirmation.
--   (c) Room charges are calculated using fn_calculate_room_charge.
-- Fires: AFTER INSERT on RESERVATION
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_auto_invoice_and_room_status
AFTER INSERT ON RESERVATION
FOR EACH ROW
BEGIN
    DECLARE v_room_charges DECIMAL(10,2);
 
    -- Calculate room charges using UDF
    SET v_room_charges = fn_calculate_room_charge(
                             NEW.RoomNumber,
                             NEW.CheckInDate,
                             NEW.CheckOutDate
                         );
 
    -- Auto-generate invoice
    INSERT INTO INVOICE (
        ReservationID, EventID,
        RoomCharges, EventCharges, AdditionalCharges,
        TotalAmount, PaymentStatus, IssuedDate
    ) VALUES (
        NEW.ReservationID, NULL,
        v_room_charges, 0.00, 0.00,
        v_room_charges, 'Unpaid', NOW()
    );
 
    -- Update room status to Reserved
    UPDATE ROOM
    SET    Status = 'Reserved'
    WHERE  RoomNumber = NEW.RoomNumber;
END$$
 
 
-- -----------------------------------------------------------------------------
-- TRIGGER 3: trg_sync_room_status_and_block_unpaid_checkout
-- Business Rules:
--   (a) Room status must stay in sync with reservation status at all times:
--       Confirmed   → Reserved
--       Checked-In  → Occupied
--       Checked-Out → Available
--       Cancelled   → Available
--   (b) Customers must settle all outstanding payments before checking out.
-- Fires: BEFORE UPDATE on RESERVATION
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_sync_room_status_and_block_unpaid_checkout
BEFORE UPDATE ON RESERVATION
FOR EACH ROW
BEGIN
    DECLARE v_payment_status VARCHAR(20);
 
    -- Business Rule (b): Block check-out if invoice is unpaid
    IF NEW.Status = 'Checked-Out' AND OLD.Status != 'Checked-Out' THEN
        SELECT PaymentStatus INTO v_payment_status
        FROM   INVOICE
        WHERE  ReservationID = NEW.ReservationID;
 
        IF v_payment_status IS NULL OR v_payment_status != 'Paid' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Check-out blocked: customer must settle all outstanding payments first.';
        END IF;
    END IF;
 
    -- Business Rule (a): Sync room status based on new reservation status
    IF NEW.Status = 'Confirmed' THEN
        UPDATE ROOM SET Status = 'Reserved'   WHERE RoomNumber = NEW.RoomNumber;
    ELSEIF NEW.Status = 'Checked-In' THEN
        UPDATE ROOM SET Status = 'Occupied'   WHERE RoomNumber = NEW.RoomNumber;
    ELSEIF NEW.Status IN ('Checked-Out', 'Cancelled') THEN
        UPDATE ROOM SET Status = 'Available'  WHERE RoomNumber = NEW.RoomNumber;
    END IF;
END$$
 
 
DELIMITER ;
 
 
-- =============================================================================
-- SECTION 6 — SAMPLE USAGE / TEST CALLS
-- =============================================================================
 
-- Test UDF: Calculate room charge for Room 201 (Deluxe $150/night) for 3 nights
SELECT fn_calculate_room_charge('201', '2026-09-01 14:00:00', '2026-09-04 11:00:00')
    AS RoomCharge_3Nights;
 
-- Test UDF: Calculate event charge for Grand Ballroom (Hall 1, $500/hr) for 7 hours
SELECT fn_calculate_event_charge(1, '16:00:00', '23:00:00')
    AS EventCharge_7Hours;
 
-- Test stored procedure: Make a new reservation
CALL sp_make_reservation(
    25,                          -- CustomerID (Vivian Appiah)
    '103',                       -- RoomNumber
    '2026-09-05 14:00:00',       -- CheckInDate
    '2026-09-08 11:00:00',       -- CheckOutDate
    1,                           -- NumOccupants
    @booking_ref,                -- OUT: BookingReference
    @reservation_id              -- OUT: ReservationID
);
SELECT @booking_ref AS BookingReference, @reservation_id AS ReservationID;
 
-- Test stored procedure: Generate occupancy report for August 2026
CALL sp_generate_occupancy_report('2026-08-01', '2026-08-31');
 
-- Test views
SELECT * FROM vw_current_occupancy;
SELECT * FROM vw_invoice_summary    ORDER BY IssuedDate DESC;
SELECT * FROM vw_revenue_report;
SELECT * FROM vw_event_schedule;
SELECT * FROM vw_feedback_summary   ORDER BY Rating DESC;
 
-- =============================================================================
-- END OF SCRIPT
-- =============================================================================