-- =============================================================================
--  HOTEL RESERVATION & EVENT MANAGEMENT SYSTEM
--  The Grand Horizon Hotel
--  SQL DML Script — Realistic Seed Dataset (20–30+ records per major entity)
--  SQL Dialect: MySQL 8.0+
--  Updated: Added STAFF seed data for 4-role authentication system
--  NOTE: Run hotel_db_ddl.sql first to create all tables.
-- =============================================================================

USE grand_horizon_hotel;

-- Disable safe update mode and foreign key checks during bulk insert
SET SQL_SAFE_UPDATES  = 0;
SET FOREIGN_KEY_CHECKS = 0;


-- =============================================================================
-- 0. STAFF (9 records — 1 Administrator, 4 Event Staff, 4 Finance/Billing Staff)
--    Passwords are bcrypt hashes of 'Staff@1234' (12 rounds) — change in production
-- =============================================================================
INSERT INTO STAFF (FirstName, LastName, Email, PasswordHash, Role, IsActive) VALUES
-- Administrator (full system access)
('Daniel',    'Quaye',      'daniel.quaye@grandhorizon.com',        '$2b$12$staffhash001', 'Administrator',         TRUE),

-- Event Staff (manage halls, event bookings, schedules)
('Nana',      'Asiedu',     'nana.asiedu@grandhorizon.com',         '$2b$12$staffhash002', 'Event Staff',           TRUE),
('Priscilla', 'Ofori',      'priscilla.ofori@grandhorizon.com',     '$2b$12$staffhash003', 'Event Staff',           TRUE),
('Michael',   'Antwi',      'michael.antwi@grandhorizon.com',       '$2b$12$staffhash004', 'Event Staff',           TRUE),
('Grace',     'Bonsu',      'grace.bonsu@grandhorizon.com',         '$2b$12$staffhash005', 'Event Staff',           FALSE),

-- Finance/Billing Staff (invoices, payments, revenue reports)
('Samuel',    'Kumi',       'samuel.kumi@grandhorizon.com',         '$2b$12$staffhash006', 'Finance/Billing Staff', TRUE),
('Josephine', 'Acheampong', 'josephine.acheampong@grandhorizon.com','$2b$12$staffhash007', 'Finance/Billing Staff', TRUE),
('Richard',   'Opoku',      'richard.opoku@grandhorizon.com',       '$2b$12$staffhash008', 'Finance/Billing Staff', TRUE),
('Beatrice',  'Nyarko',     'beatrice.nyarko@grandhorizon.com',     '$2b$12$staffhash009', 'Finance/Billing Staff', FALSE);


-- =============================================================================
-- 1. ROOM_CATEGORY (4 records)
-- =============================================================================
INSERT INTO ROOM_CATEGORY (CategoryName, Description, PricePerNight) VALUES
('Standard',    'Comfortable room with queen bed, Wi-Fi, flat-screen TV, and en-suite bathroom.',                    80.00),
('Deluxe',      'Spacious room with premium furnishings, king bed, mini-bar, and city view.',                       150.00),
('Suite',       'Luxury suite with separate living area, jacuzzi, walk-in wardrobe, and panoramic views.',          300.00),
('Family Room', 'Large room with two queen beds and a sofa bed, ideal for families of up to 5 guests.',             120.00);


-- =============================================================================
-- 2. ROOM (20 records)
-- =============================================================================
INSERT INTO ROOM (RoomNumber, CategoryID, Floor, MaxOccupants, Status) VALUES
('101', 1, 1, 2, 'Available'),
('102', 1, 1, 2, 'Available'),
('103', 1, 1, 2, 'Available'),
('104', 1, 1, 2, 'Available'),
('105', 1, 1, 2, 'Available'),
('201', 2, 2, 2, 'Available'),
('202', 2, 2, 2, 'Available'),
('203', 2, 2, 3, 'Available'),
('204', 2, 2, 2, 'Available'),
('205', 2, 2, 3, 'Available'),
('301', 3, 3, 4, 'Available'),
('302', 3, 3, 4, 'Available'),
('303', 3, 3, 2, 'Available'),
('304', 3, 3, 4, 'Available'),
('401', 4, 4, 5, 'Available'),
('402', 4, 4, 5, 'Available'),
('403', 4, 4, 4, 'Available'),
('404', 4, 4, 5, 'Available'),
('501', 2, 5, 2, 'Under Maintenance'),
('502', 1, 5, 2, 'Under Maintenance');


-- =============================================================================
-- 3. HALL (7 records)
-- =============================================================================
INSERT INTO HALL (HallName, Capacity, BookingPricePerHour, Description, IsAvailable) VALUES
('Grand Ballroom',      500, 500.00, 'Elegant ballroom with stage, dance floor, full AV system, and catering facilities.',          TRUE),
('Conference Room A',    50,  80.00, 'Modern conference room with projector, whiteboard, video conferencing, and breakout area.',   TRUE),
('Conference Room B',    30,  60.00, 'Intimate meeting room with smart TV, collaborative workspace, and natural lighting.',          TRUE),
('Rooftop Terrace',     200, 200.00, 'Open-air rooftop venue with panoramic city views, ideal for cocktail receptions and galas.',  TRUE),
('Boardroom',            20, 100.00, 'Executive boardroom with premium leather seating, private catering, and secure Wi-Fi.',       TRUE),
('Garden Pavilion',     150, 180.00, 'Outdoor garden venue with fairy lights, gazebo, and landscaped surroundings.',                TRUE),
('Training Room',        40,  70.00, 'Dedicated training room with individual workstations, projector, and flip charts.',           TRUE);


-- =============================================================================
-- 4. CUSTOMER (30 records)
-- =============================================================================
INSERT INTO CUSTOMER (FirstName, LastName, ContactNumber, Email, PasswordHash, RegistrationDate) VALUES
('James',       'Osei',         '+233244001122', 'james.osei@email.com',           '$2b$12$hash001', '2025-06-10'),
('Abena',       'Mensah',       '+233244003344', 'abena.mensah@email.com',         '$2b$12$hash002', '2025-07-14'),
('Kwame',       'Asante',       '+233244005566', 'kwame.asante@email.com',         '$2b$12$hash003', '2025-08-05'),
('Efua',        'Boateng',      '+233244007788', 'efua.boateng@email.com',         '$2b$12$hash004', '2025-09-20'),
('Kofi',        'Agyeman',      '+233244009900', 'kofi.agyeman@email.com',         '$2b$12$hash005', '2025-10-01'),
('Akosua',      'Darko',        '+233244011223', 'akosua.darko@email.com',         '$2b$12$hash006', '2025-10-15'),
('Yaw',         'Amponsah',     '+233244013445', 'yaw.amponsah@email.com',         '$2b$12$hash007', '2025-11-01'),
('Ama',         'Owusu',        '+233244015667', 'ama.owusu@email.com',            '$2b$12$hash008', '2025-11-12'),
('Kwesi',       'Frimpong',     '+233244017889', 'kwesi.frimpong@email.com',       '$2b$12$hash009', '2025-11-25'),
('Adwoa',       'Amoah',        '+233244019001', 'adwoa.amoah@email.com',          '$2b$12$hash010', '2025-12-03'),
('Emmanuel',    'Tetteh',       '+233244021223', 'emmanuel.tetteh@email.com',      '$2b$12$hash011', '2025-12-10'),
('Serena',      'Adjei',        '+233244023445', 'serena.adjei@email.com',         '$2b$12$hash012', '2025-12-18'),
('Daniel',      'Quaye',        '+233244025667', 'daniel.quaye@email.com',         '$2b$12$hash013', '2026-01-05'),
('Nana',        'Asiedu',       '+233244027889', 'nana.asiedu@email.com',          '$2b$12$hash014', '2026-01-14'),
('Priscilla',   'Ofori',        '+233244029001', 'priscilla.ofori@email.com',      '$2b$12$hash015', '2026-01-22'),
('Michael',     'Antwi',        '+233244031223', 'michael.antwi@email.com',        '$2b$12$hash016', '2026-02-01'),
('Grace',       'Bonsu',        '+233244033445', 'grace.bonsu@email.com',          '$2b$12$hash017', '2026-02-09'),
('Samuel',      'Kumi',         '+233244035667', 'samuel.kumi@email.com',          '$2b$12$hash018', '2026-02-17'),
('Josephine',   'Acheampong',   '+233244037889', 'josephine.acheampong@email.com', '$2b$12$hash019', '2026-03-01'),
('Richard',     'Opoku',        '+233244039001', 'richard.opoku@email.com',        '$2b$12$hash020', '2026-03-10'),
('Beatrice',    'Nyarko',       '+233244041223', 'beatrice.nyarko@email.com',      '$2b$12$hash021', '2026-03-18'),
('Patrick',     'Asare',        '+233244043445', 'patrick.asare@email.com',        '$2b$12$hash022', '2026-04-02'),
('Cecilia',     'Baah',         '+233244045667', 'cecilia.baah@email.com',         '$2b$12$hash023', '2026-04-11'),
('Frederick',   'Mensah',       '+233244047889', 'frederick.mensah@email.com',     '$2b$12$hash024', '2026-04-20'),
('Vivian',      'Appiah',       '+233244049001', 'vivian.appiah@email.com',        '$2b$12$hash025', '2026-05-03'),
('George',      'Aidoo',        '+233244051223', 'george.aidoo@email.com',         '$2b$12$hash026', '2026-05-14'),
('Harriet',     'Sarpong',      '+233244053445', 'harriet.sarpong@email.com',      '$2b$12$hash027', '2026-05-22'),
('Isaac',       'Dompreh',      '+233244055667', 'isaac.dompreh@email.com',        '$2b$12$hash028', '2026-06-01'),
('Janet',       'Wiredu',       '+233244057889', 'janet.wiredu@email.com',         '$2b$12$hash029', '2026-06-10'),
('Kenneth',     'Poku',         '+233244059001', 'kenneth.poku@email.com',         '$2b$12$hash030', '2026-06-20');


-- =============================================================================
-- 5. RESERVATION (25 records)
-- =============================================================================
INSERT INTO RESERVATION
    (CustomerID, RoomNumber, CheckInDate, CheckOutDate, ActualCheckIn, ActualCheckOut, NumOccupants, Status, BookingReference)
VALUES
-- Checked-Out (completed stays)
(1,  '201', '2026-05-01 14:00:00', '2026-05-04 11:00:00', '2026-05-01 14:30:00', '2026-05-04 10:45:00', 2, 'Checked-Out', 'GH-20260501-00001'),
(2,  '301', '2026-05-05 14:00:00', '2026-05-09 11:00:00', '2026-05-05 15:00:00', '2026-05-09 10:30:00', 3, 'Checked-Out', 'GH-20260505-00002'),
(3,  '101', '2026-05-10 14:00:00', '2026-05-12 11:00:00', '2026-05-10 14:15:00', '2026-05-12 11:00:00', 1, 'Checked-Out', 'GH-20260510-00003'),
(4,  '401', '2026-05-15 14:00:00', '2026-05-18 11:00:00', '2026-05-15 14:00:00', '2026-05-18 10:00:00', 4, 'Checked-Out', 'GH-20260515-00004'),
(5,  '202', '2026-05-20 14:00:00', '2026-05-22 11:00:00', '2026-05-20 15:30:00', '2026-05-22 11:00:00', 2, 'Checked-Out', 'GH-20260520-00005'),
(6,  '102', '2026-06-01 14:00:00', '2026-06-03 11:00:00', '2026-06-01 14:00:00', '2026-06-03 10:30:00', 2, 'Checked-Out', 'GH-20260601-00006'),
(7,  '302', '2026-06-05 14:00:00', '2026-06-10 11:00:00', '2026-06-05 14:45:00', '2026-06-10 11:00:00', 2, 'Checked-Out', 'GH-20260605-00007'),
(8,  '203', '2026-06-12 14:00:00', '2026-06-14 11:00:00', '2026-06-12 14:00:00', '2026-06-14 10:45:00', 3, 'Checked-Out', 'GH-20260612-00008'),
(9,  '402', '2026-06-18 14:00:00', '2026-06-21 11:00:00', '2026-06-18 15:00:00', '2026-06-21 11:00:00', 4, 'Checked-Out', 'GH-20260618-00009'),
(10, '103', '2026-07-01 14:00:00', '2026-07-03 11:00:00', '2026-07-01 14:00:00', '2026-07-03 10:30:00', 1, 'Checked-Out', 'GH-20260701-00010'),

-- Checked-In (currently staying)
(11, '204', '2026-08-06 14:00:00', '2026-08-10 11:00:00', '2026-08-06 14:30:00', NULL, 2, 'Checked-In',  'GH-20260806-00011'),
(12, '303', '2026-08-07 14:00:00', '2026-08-09 11:00:00', '2026-08-07 15:00:00', NULL, 2, 'Checked-In',  'GH-20260807-00012'),
(13, '403', '2026-08-07 14:00:00', '2026-08-12 11:00:00', '2026-08-07 14:00:00', NULL, 3, 'Checked-In',  'GH-20260807-00013'),
(14, '104', '2026-08-08 14:00:00', '2026-08-11 11:00:00', '2026-08-08 14:15:00', NULL, 1, 'Checked-In',  'GH-20260808-00014'),
(15, '205', '2026-08-08 14:00:00', '2026-08-13 11:00:00', '2026-08-08 15:30:00', NULL, 2, 'Checked-In',  'GH-20260808-00015'),

-- Confirmed (upcoming)
(16, '304', '2026-08-10 14:00:00', '2026-08-14 11:00:00', NULL, NULL, 4, 'Confirmed',   'GH-20260810-00016'),
(17, '105', '2026-08-11 14:00:00', '2026-08-13 11:00:00', NULL, NULL, 2, 'Confirmed',   'GH-20260811-00017'),
(18, '404', '2026-08-12 14:00:00', '2026-08-16 11:00:00', NULL, NULL, 5, 'Confirmed',   'GH-20260812-00018'),
(19, '201', '2026-08-14 14:00:00', '2026-08-17 11:00:00', NULL, NULL, 2, 'Confirmed',   'GH-20260814-00019'),
(20, '301', '2026-08-15 14:00:00', '2026-08-20 11:00:00', NULL, NULL, 3, 'Confirmed',   'GH-20260815-00020'),
(21, '202', '2026-08-18 14:00:00', '2026-08-21 11:00:00', NULL, NULL, 2, 'Confirmed',   'GH-20260818-00021'),
(22, '302', '2026-08-20 14:00:00', '2026-08-25 11:00:00', NULL, NULL, 2, 'Confirmed',   'GH-20260820-00022'),

-- Cancelled
(23, '102', '2026-07-10 14:00:00', '2026-07-13 11:00:00', NULL, NULL, 2, 'Cancelled',   'GH-20260710-00023'),
(24, '203', '2026-07-15 14:00:00', '2026-07-18 11:00:00', NULL, NULL, 3, 'Cancelled',   'GH-20260715-00024'),
(25, '401', '2026-07-20 14:00:00', '2026-07-22 11:00:00', NULL, NULL, 4, 'Cancelled',   'GH-20260720-00025');


-- =============================================================================
-- 6. EVENT_BOOKING (20 records)
-- =============================================================================
INSERT INTO EVENT_BOOKING
    (CustomerID, HallID, EventType, EventDate, StartTime, EndTime, ExpectedAttendees, Status)
VALUES
-- Completed events
(1,  1, 'Wedding Reception',    '2026-05-03', '16:00:00', '23:00:00', 350, 'Completed'),
(2,  2, 'Business Conference',  '2026-05-08', '09:00:00', '17:00:00',  45, 'Completed'),
(3,  3, 'Team Meeting',         '2026-05-15', '10:00:00', '12:00:00',  20, 'Completed'),
(4,  4, 'Birthday Party',       '2026-05-25', '18:00:00', '22:00:00', 120, 'Completed'),
(5,  5, 'Board Meeting',        '2026-06-02', '09:00:00', '13:00:00',  15, 'Completed'),
(6,  6, 'Engagement Ceremony',  '2026-06-10', '15:00:00', '20:00:00',  80, 'Completed'),
(7,  7, 'Staff Training',       '2026-06-18', '08:00:00', '16:00:00',  35, 'Completed'),
(8,  1, 'Gala Dinner',          '2026-07-04', '19:00:00', '23:00:00', 400, 'Completed'),
(9,  2, 'Product Launch',       '2026-07-12', '10:00:00', '15:00:00',  48, 'Completed'),
(10, 3, 'Workshop',             '2026-07-20', '09:00:00', '13:00:00',  28, 'Completed'),

-- In Progress (happening today)
(11, 4, 'Graduation Party',     '2026-08-08', '14:00:00', '20:00:00', 180, 'In Progress'),
(12, 5, 'Executive Retreat',    '2026-08-08', '08:00:00', '17:00:00',  18, 'In Progress'),

-- Confirmed (upcoming)
(13, 1, 'Wedding Reception',    '2026-08-15', '16:00:00', '23:00:00', 420, 'Confirmed'),
(14, 2, 'Annual General Meeting','2026-08-18', '09:00:00', '16:00:00',  50, 'Confirmed'),
(15, 6, 'Charity Fundraiser',   '2026-08-20', '17:00:00', '22:00:00', 140, 'Confirmed'),
(16, 7, 'Leadership Workshop',  '2026-08-22', '08:30:00', '15:30:00',  38, 'Confirmed'),
(17, 3, 'Project Kickoff',      '2026-08-25', '10:00:00', '12:00:00',  25, 'Confirmed'),
(18, 4, 'Farewell Party',       '2026-08-28', '18:00:00', '22:00:00', 160, 'Confirmed'),
(19, 5, 'Strategy Session',     '2026-09-02', '09:00:00', '14:00:00',  20, 'Confirmed'),

-- Cancelled
(20, 2, 'Seminar',              '2026-07-25', '09:00:00', '13:00:00',  40, 'Cancelled');


-- =============================================================================
-- 7. INVOICE (25 records)
-- =============================================================================
INSERT INTO INVOICE
    (ReservationID, EventID, RoomCharges, EventCharges, AdditionalCharges, TotalAmount, PaymentStatus, IssuedDate)
VALUES
-- Reservation invoices (Checked-Out → Paid)
(1,  NULL, 240.00,    0.00,   0.00, 240.00,  'Paid',    '2026-05-01 14:30:00'),
(2,  NULL, 1200.00,   0.00,   0.00, 1200.00, 'Paid',    '2026-05-05 15:00:00'),
(3,  NULL, 160.00,    0.00,   0.00, 160.00,  'Paid',    '2026-05-10 14:15:00'),
(4,  NULL, 360.00,    0.00,  50.00, 410.00,  'Paid',    '2026-05-15 14:00:00'),
(5,  NULL, 300.00,    0.00,   0.00, 300.00,  'Paid',    '2026-05-20 15:30:00'),
(6,  NULL, 160.00,    0.00,   0.00, 160.00,  'Paid',    '2026-06-01 14:00:00'),
(7,  NULL, 750.00,    0.00,   0.00, 750.00,  'Paid',    '2026-06-05 14:45:00'),
(8,  NULL, 300.00,    0.00,   0.00, 300.00,  'Paid',    '2026-06-12 14:00:00'),
(9,  NULL, 360.00,    0.00,  30.00, 390.00,  'Paid',    '2026-06-18 15:00:00'),
(10, NULL, 160.00,    0.00,   0.00, 160.00,  'Paid',    '2026-07-01 14:00:00'),

-- Reservation invoices (Checked-In → Unpaid)
(11, NULL, 600.00,    0.00,   0.00, 600.00,  'Unpaid',  '2026-08-06 14:30:00'),
(12, NULL, 300.00,    0.00,   0.00, 300.00,  'Unpaid',  '2026-08-07 15:00:00'),
(13, NULL, 600.00,    0.00,   0.00, 600.00,  'Unpaid',  '2026-08-07 14:00:00'),
(14, NULL, 240.00,    0.00,   0.00, 240.00,  'Unpaid',  '2026-08-08 14:15:00'),
(15, NULL, 750.00,    0.00,   0.00, 750.00,  'Unpaid',  '2026-08-08 15:30:00'),

-- Reservation invoices (Confirmed → Unpaid)
(16, NULL, 480.00,    0.00,   0.00, 480.00,  'Unpaid',  '2026-08-10 00:00:00'),
(17, NULL, 160.00,    0.00,   0.00, 160.00,  'Unpaid',  '2026-08-11 00:00:00'),
(18, NULL, 480.00,    0.00,   0.00, 480.00,  'Unpaid',  '2026-08-12 00:00:00'),
(19, NULL, 240.00,    0.00,   0.00, 240.00,  'Unpaid',  '2026-08-14 00:00:00'),
(20, NULL, 1500.00,   0.00,   0.00, 1500.00, 'Unpaid',  '2026-08-15 00:00:00'),

-- Event invoices (Completed → Paid)
(NULL, 1,  0.00, 3500.00,  0.00, 3500.00, 'Paid',    '2026-05-03 16:00:00'),
(NULL, 2,  0.00,  640.00,  0.00,  640.00, 'Paid',    '2026-05-08 09:00:00'),
(NULL, 3,  0.00,  120.00,  0.00,  120.00, 'Paid',    '2026-05-15 10:00:00'),
(NULL, 4,  0.00,  800.00,  0.00,  800.00, 'Paid',    '2026-05-25 18:00:00'),
(NULL, 5,  0.00,  400.00,  0.00,  400.00, 'Paid',    '2026-06-02 09:00:00');


-- =============================================================================
-- 8. FEEDBACK (20 records)
-- =============================================================================
INSERT INTO FEEDBACK (CustomerID, ReservationID, EventID, Rating, Comments, SubmittedDate) VALUES
-- Feedback on completed room stays
(1,  1,  NULL, 5, 'Absolutely wonderful stay! The room was immaculate and the staff were incredibly attentive.',                    '2026-05-04 12:00:00'),
(2,  2,  NULL, 4, 'Beautiful suite with stunning views. Check-in was smooth. Would have liked faster room service.',                '2026-05-09 13:00:00'),
(3,  3,  NULL, 5, 'Perfect for a solo business trip. Clean, quiet, and great Wi-Fi. Will definitely return.',                       '2026-05-12 14:00:00'),
(4,  4,  NULL, 3, 'Room was spacious and comfortable but the air conditioning was noisy throughout the night.',                     '2026-05-18 15:00:00'),
(5,  5,  NULL, 4, 'Lovely deluxe room with a great city view. Breakfast was excellent. Minor issue with hot water pressure.',       '2026-05-22 12:30:00'),
(6,  6,  NULL, 5, 'Exceptional service from check-in to check-out. The room exceeded our expectations in every way.',              '2026-06-03 11:00:00'),
(7,  7,  NULL, 4, 'Great location and comfortable beds. The pool area was a highlight. Parking could be improved.',                 '2026-06-10 14:00:00'),
(8,  8,  NULL, 5, 'Fantastic experience overall. The housekeeping team was thorough and the concierge was very helpful.',           '2026-06-14 12:00:00'),
(9,  9,  NULL, 3, 'Decent stay but the room had a slight musty smell. Staff were friendly and resolved our concerns quickly.',      '2026-06-21 13:00:00'),
(10, 10, NULL, 4, 'Good value for money. Clean and comfortable standard room. Breakfast buffet had a great variety.',               '2026-07-03 11:30:00'),

-- Feedback on completed events
(1,  NULL, 1,  5, 'The Grand Ballroom was absolutely breathtaking for our wedding. The AV team was professional and responsive.',   '2026-05-04 10:00:00'),
(2,  NULL, 2,  4, 'Conference Room A was well-equipped and comfortable. The catering team was excellent. Parking was limited.',     '2026-05-08 18:00:00'),
(3,  NULL, 3,  5, 'Perfect intimate setting for our team meeting. The room was set up exactly as requested. Highly recommend.',     '2026-05-15 13:00:00'),
(4,  NULL, 4,  4, 'The Rooftop Terrace was a magical venue for the birthday party. Stunning views and great ambiance.',             '2026-05-25 23:30:00'),
(5,  NULL, 5,  5, 'The Boardroom was ideal for our executive meeting. Excellent privacy, great tech setup, and superb catering.',   '2026-06-02 14:00:00'),
(6,  NULL, 6,  4, 'The Garden Pavilion was beautifully decorated for our engagement. Lovely atmosphere and attentive staff.',       '2026-06-10 21:00:00'),
(7,  NULL, 7,  3, 'Training Room was functional but a bit cramped for 35 people. Projector had issues in the morning session.',     '2026-06-18 17:00:00'),
(8,  NULL, 8,  5, 'The Gala Dinner in the Grand Ballroom was spectacular. Flawless organisation and outstanding food quality.',     '2026-07-04 23:30:00'),
(9,  NULL, 9,  4, 'Great venue for our product launch. The AV setup was impressive and the staff were very accommodating.',         '2026-07-12 16:00:00'),
(10, NULL, 10, 4, 'The workshop ran smoothly in Conference Room B. Good facilities and helpful support staff throughout the day.',  '2026-07-20 14:00:00');


-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES   = 1;


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

SELECT 'STAFF'         AS Entity, COUNT(*) AS Records FROM STAFF
UNION ALL
SELECT 'ROOM_CATEGORY', COUNT(*) FROM ROOM_CATEGORY
UNION ALL
SELECT 'ROOM',          COUNT(*) FROM ROOM
UNION ALL
SELECT 'HALL',          COUNT(*) FROM HALL
UNION ALL
SELECT 'CUSTOMER',      COUNT(*) FROM CUSTOMER
UNION ALL
SELECT 'RESERVATION',   COUNT(*) FROM RESERVATION
UNION ALL
SELECT 'EVENT_BOOKING', COUNT(*) FROM EVENT_BOOKING
UNION ALL
SELECT 'INVOICE',       COUNT(*) FROM INVOICE
UNION ALL
SELECT 'FEEDBACK',      COUNT(*) FROM FEEDBACK;

-- Staff breakdown by role
SELECT Role, COUNT(*) AS Total, SUM(IsActive) AS Active, SUM(NOT IsActive) AS Inactive
FROM   STAFF
GROUP  BY Role;

-- Reservation status breakdown
SELECT Status, COUNT(*) AS Count FROM RESERVATION GROUP BY Status;

-- Invoice payment status breakdown
SELECT PaymentStatus, COUNT(*) AS Count FROM INVOICE GROUP BY PaymentStatus;

-- =============================================================================
-- END OF DML SCRIPT
-- =============================================================================