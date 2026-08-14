-- =============================================================================
--  HOTEL RESERVATION & EVENT MANAGEMENT SYSTEM
--  The Grand Horizon Hotel
--  SQL DDL Script — Tables, Constraints, Indexes & Identity Columns
--  SQL Dialect: MySQL 8.0+
--  Updated: Added STAFF table for 4-role authentication system
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. DATABASE SETUP
-- -----------------------------------------------------------------------------
DROP DATABASE IF EXISTS grand_horizon_hotel;
CREATE DATABASE grand_horizon_hotel
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE grand_horizon_hotel;

SET FOREIGN_KEY_CHECKS = 1;


-- =============================================================================
-- TABLES & CONSTRAINTS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLE 0: STAFF
-- Stores hotel staff accounts with role-based access control.
-- Roles: Administrator | Event Staff | Finance/Billing Staff
-- Identity column: StaffID (AUTO_INCREMENT)
-- -----------------------------------------------------------------------------
CREATE TABLE STAFF (
    StaffID      INT            NOT NULL AUTO_INCREMENT,
    FirstName    VARCHAR(50)    NOT NULL,
    LastName     VARCHAR(50)    NOT NULL,
    Email        VARCHAR(100)   NOT NULL,
    PasswordHash VARCHAR(255)   NOT NULL,
    Role         ENUM(
                     'Administrator',
                     'Event Staff',
                     'Finance/Billing Staff'
                 )              NOT NULL,
    IsActive     BOOLEAN        NOT NULL DEFAULT TRUE,
    CreatedAt    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_staff       PRIMARY KEY (StaffID),
    CONSTRAINT uq_staff_email UNIQUE      (Email)
);


-- -----------------------------------------------------------------------------
-- TABLE 1: CUSTOMER
-- Stores registered customer details.
-- Identity column: CustomerID (AUTO_INCREMENT)
-- -----------------------------------------------------------------------------
CREATE TABLE CUSTOMER (
    CustomerID       INT            NOT NULL AUTO_INCREMENT,
    FirstName        VARCHAR(50)    NOT NULL,
    LastName         VARCHAR(50)    NOT NULL,
    ContactNumber    VARCHAR(20)    NOT NULL,
    Email            VARCHAR(100)   NOT NULL,
    PasswordHash     VARCHAR(255)   NOT NULL,
    RegistrationDate DATE           NOT NULL DEFAULT (CURRENT_DATE),

    CONSTRAINT pk_customer       PRIMARY KEY (CustomerID),
    CONSTRAINT uq_customer_email UNIQUE (Email)
);


-- -----------------------------------------------------------------------------
-- TABLE 2: ROOM_CATEGORY
-- Defines room types (e.g. Standard, Deluxe, Suite).
-- Identity column: CategoryID (AUTO_INCREMENT)
-- -----------------------------------------------------------------------------
CREATE TABLE ROOM_CATEGORY (
    CategoryID     INT            NOT NULL AUTO_INCREMENT,
    CategoryName   VARCHAR(50)    NOT NULL,
    Description    TEXT,
    PricePerNight  DECIMAL(10,2)  NOT NULL,

    CONSTRAINT pk_room_category       PRIMARY KEY (CategoryID),
    CONSTRAINT uq_room_category_name  UNIQUE (CategoryName),
    CONSTRAINT chk_price_per_night    CHECK (PricePerNight > 0)
);


-- -----------------------------------------------------------------------------
-- TABLE 3: ROOM
-- Represents individual hotel rooms.
-- Primary key: RoomNumber (natural key, no AUTO_INCREMENT)
-- -----------------------------------------------------------------------------
CREATE TABLE ROOM (
    RoomNumber    VARCHAR(10)   NOT NULL,
    CategoryID    INT           NOT NULL,
    Floor         INT           NOT NULL,
    MaxOccupants  INT           NOT NULL,
    Status        ENUM(
                      'Available',
                      'Reserved',
                      'Occupied',
                      'Under Maintenance'
                  )             NOT NULL DEFAULT 'Available',

    CONSTRAINT pk_room          PRIMARY KEY (RoomNumber),
    CONSTRAINT fk_room_category FOREIGN KEY (CategoryID)
                                REFERENCES  ROOM_CATEGORY(CategoryID)
                                ON UPDATE CASCADE
                                ON DELETE RESTRICT,
    CONSTRAINT chk_room_floor   CHECK (Floor >= 0),
    CONSTRAINT chk_room_max_occ CHECK (MaxOccupants > 0)
);


-- -----------------------------------------------------------------------------
-- TABLE 4: RESERVATION
-- Records room bookings made by registered customers.
-- Identity column: ReservationID (AUTO_INCREMENT)
-- -----------------------------------------------------------------------------
CREATE TABLE RESERVATION (
    ReservationID     INT           NOT NULL AUTO_INCREMENT,
    CustomerID        INT           NOT NULL,
    RoomNumber        VARCHAR(10)   NOT NULL,
    CheckInDate       DATETIME      NOT NULL,
    CheckOutDate      DATETIME      NOT NULL,
    ActualCheckIn     DATETIME,
    ActualCheckOut    DATETIME,
    NumOccupants      INT           NOT NULL,
    Status            ENUM(
                          'Confirmed',
                          'Checked-In',
                          'Checked-Out',
                          'Cancelled'
                      )             NOT NULL DEFAULT 'Confirmed',
    BookingReference  VARCHAR(20)   NOT NULL,

    CONSTRAINT pk_reservation              PRIMARY KEY (ReservationID),
    CONSTRAINT uq_booking_reference        UNIQUE (BookingReference),
    CONSTRAINT fk_reservation_customer     FOREIGN KEY (CustomerID)
                                           REFERENCES  CUSTOMER(CustomerID)
                                           ON UPDATE CASCADE
                                           ON DELETE RESTRICT,
    CONSTRAINT fk_reservation_room         FOREIGN KEY (RoomNumber)
                                           REFERENCES  ROOM(RoomNumber)
                                           ON UPDATE CASCADE
                                           ON DELETE RESTRICT,
    CONSTRAINT chk_checkout_after_checkin  CHECK (CheckOutDate > CheckInDate),
    CONSTRAINT chk_num_occupants           CHECK (NumOccupants > 0)
);


-- -----------------------------------------------------------------------------
-- TABLE 5: HALL
-- Represents event halls and conference spaces within the hotel.
-- Identity column: HallID (AUTO_INCREMENT)
-- -----------------------------------------------------------------------------
CREATE TABLE HALL (
    HallID              INT            NOT NULL AUTO_INCREMENT,
    HallName            VARCHAR(100)   NOT NULL,
    Capacity            INT            NOT NULL,
    BookingPricePerHour DECIMAL(10,2)  NOT NULL,
    Description         TEXT,
    IsAvailable         BOOLEAN        NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_hall                  PRIMARY KEY (HallID),
    CONSTRAINT uq_hall_name             UNIQUE (HallName),
    CONSTRAINT chk_hall_capacity        CHECK (Capacity > 0),
    CONSTRAINT chk_hall_price_per_hour  CHECK (BookingPricePerHour > 0)
);


-- -----------------------------------------------------------------------------
-- TABLE 6: EVENT_BOOKING
-- Records hall bookings for events made by registered customers.
-- Identity column: EventID (AUTO_INCREMENT)
-- -----------------------------------------------------------------------------
CREATE TABLE EVENT_BOOKING (
    EventID             INT           NOT NULL AUTO_INCREMENT,
    CustomerID          INT           NOT NULL,
    HallID              INT           NOT NULL,
    EventType           VARCHAR(100)  NOT NULL,
    EventDate           DATE          NOT NULL,
    StartTime           TIME          NOT NULL,
    EndTime             TIME          NOT NULL,
    ExpectedAttendees   INT           NOT NULL,
    Status              ENUM(
                            'Confirmed',
                            'In Progress',
                            'Completed',
                            'Cancelled'
                        )             NOT NULL DEFAULT 'Confirmed',

    CONSTRAINT pk_event_booking         PRIMARY KEY (EventID),
    CONSTRAINT fk_event_customer        FOREIGN KEY (CustomerID)
                                        REFERENCES  CUSTOMER(CustomerID)
                                        ON UPDATE CASCADE
                                        ON DELETE RESTRICT,
    CONSTRAINT fk_event_hall            FOREIGN KEY (HallID)
                                        REFERENCES  HALL(HallID)
                                        ON UPDATE CASCADE
                                        ON DELETE RESTRICT,
    CONSTRAINT chk_end_after_start      CHECK (EndTime > StartTime),
    CONSTRAINT chk_expected_attendees   CHECK (ExpectedAttendees > 0)
);


-- -----------------------------------------------------------------------------
-- TABLE 7: INVOICE
-- Consolidated bill generated for each reservation or event booking.
-- Identity column: InvoiceID (AUTO_INCREMENT)
-- -----------------------------------------------------------------------------
CREATE TABLE INVOICE (
    InvoiceID         INT            NOT NULL AUTO_INCREMENT,
    ReservationID     INT,
    EventID           INT,
    RoomCharges       DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    EventCharges      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    AdditionalCharges DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    TotalAmount       DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    PaymentStatus     ENUM(
                          'Unpaid',
                          'Partially Paid',
                          'Paid'
                      )              NOT NULL DEFAULT 'Unpaid',
    IssuedDate        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_invoice                PRIMARY KEY (InvoiceID),
    CONSTRAINT uq_invoice_reservation    UNIQUE (ReservationID),
    CONSTRAINT uq_invoice_event          UNIQUE (EventID),
    CONSTRAINT fk_invoice_reservation    FOREIGN KEY (ReservationID)
                                         REFERENCES  RESERVATION(ReservationID)
                                         ON UPDATE CASCADE
                                         ON DELETE RESTRICT,
    CONSTRAINT fk_invoice_event          FOREIGN KEY (EventID)
                                         REFERENCES  EVENT_BOOKING(EventID)
                                         ON UPDATE CASCADE
                                         ON DELETE RESTRICT,
    CONSTRAINT chk_invoice_room_charges  CHECK (RoomCharges        >= 0),
    CONSTRAINT chk_invoice_event_charges CHECK (EventCharges       >= 0),
    CONSTRAINT chk_invoice_add_charges   CHECK (AdditionalCharges  >= 0),
    CONSTRAINT chk_invoice_total         CHECK (TotalAmount        >= 0)
);


-- -----------------------------------------------------------------------------
-- TABLE 8: FEEDBACK
-- Post-stay or post-event feedback submitted by customers.
-- Identity column: FeedbackID (AUTO_INCREMENT)
-- -----------------------------------------------------------------------------
CREATE TABLE FEEDBACK (
    FeedbackID    INT       NOT NULL AUTO_INCREMENT,
    CustomerID    INT       NOT NULL,
    ReservationID INT,
    EventID       INT,
    Rating        INT       NOT NULL,
    Comments      TEXT,
    SubmittedDate DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_feedback             PRIMARY KEY (FeedbackID),
    CONSTRAINT fk_feedback_customer    FOREIGN KEY (CustomerID)
                                       REFERENCES  CUSTOMER(CustomerID)
                                       ON UPDATE CASCADE
                                       ON DELETE RESTRICT,
    CONSTRAINT fk_feedback_reservation FOREIGN KEY (ReservationID)
                                       REFERENCES  RESERVATION(ReservationID)
                                       ON UPDATE CASCADE
                                       ON DELETE RESTRICT,
    CONSTRAINT fk_feedback_event       FOREIGN KEY (EventID)
                                       REFERENCES  EVENT_BOOKING(EventID)
                                       ON UPDATE CASCADE
                                       ON DELETE RESTRICT,
    CONSTRAINT chk_feedback_rating     CHECK (Rating BETWEEN 1 AND 5)
);


-- =============================================================================
-- INDEXES
-- =============================================================================

-- ---- CUSTOMER ---------------------------------------------------------------
-- (Email already indexed via UNIQUE constraint)

-- ---- STAFF ------------------------------------------------------------------
CREATE INDEX idx_staff_role
    ON STAFF (Role);

CREATE INDEX idx_staff_active
    ON STAFF (IsActive);

-- ---- RESERVATION ------------------------------------------------------------
CREATE INDEX idx_reservation_customer
    ON RESERVATION (CustomerID);

CREATE INDEX idx_reservation_room
    ON RESERVATION (RoomNumber);

CREATE INDEX idx_reservation_dates
    ON RESERVATION (CheckInDate, CheckOutDate);

CREATE INDEX idx_reservation_status
    ON RESERVATION (Status);

-- ---- ROOM -------------------------------------------------------------------
CREATE INDEX idx_room_status
    ON ROOM (Status);

CREATE INDEX idx_room_category
    ON ROOM (CategoryID);

-- ---- EVENT_BOOKING ----------------------------------------------------------
CREATE INDEX idx_event_customer
    ON EVENT_BOOKING (CustomerID);

CREATE INDEX idx_event_hall
    ON EVENT_BOOKING (HallID);

CREATE INDEX idx_event_date
    ON EVENT_BOOKING (EventDate);

CREATE INDEX idx_event_status
    ON EVENT_BOOKING (Status);

-- ---- INVOICE ----------------------------------------------------------------
CREATE INDEX idx_invoice_payment_status
    ON INVOICE (PaymentStatus);

CREATE INDEX idx_invoice_issued_date
    ON INVOICE (IssuedDate);

-- ---- FEEDBACK ---------------------------------------------------------------
CREATE INDEX idx_feedback_customer
    ON FEEDBACK (CustomerID);


-- =============================================================================
-- IDENTITY COLUMNS SUMMARY
-- MySQL uses AUTO_INCREMENT as the identity/sequence mechanism.
--
--   Table            Column           Type    Identity
--   ---------------  ---------------  ------  -------------------------
--   STAFF            StaffID          INT     AUTO_INCREMENT (starts 1)
--   CUSTOMER         CustomerID       INT     AUTO_INCREMENT (starts 1)
--   ROOM_CATEGORY    CategoryID       INT     AUTO_INCREMENT (starts 1)
--   RESERVATION      ReservationID    INT     AUTO_INCREMENT (starts 1)
--   HALL             HallID           INT     AUTO_INCREMENT (starts 1)
--   EVENT_BOOKING    EventID          INT     AUTO_INCREMENT (starts 1)
--   INVOICE          InvoiceID        INT     AUTO_INCREMENT (starts 1)
--   FEEDBACK         FeedbackID       INT     AUTO_INCREMENT (starts 1)
--
-- NOTE: ROOM uses RoomNumber VARCHAR(10) as a natural primary key
--       (e.g. '101', '202A') — no AUTO_INCREMENT required.
-- =============================================================================


-- =============================================================================
-- VERIFICATION
-- =============================================================================

SHOW TABLES;

DESCRIBE STAFF;
DESCRIBE CUSTOMER;
DESCRIBE ROOM_CATEGORY;
DESCRIBE ROOM;
DESCRIBE RESERVATION;
DESCRIBE HALL;
DESCRIBE EVENT_BOOKING;
DESCRIBE INVOICE;
DESCRIBE FEEDBACK;

SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM   INFORMATION_SCHEMA.STATISTICS
WHERE  TABLE_SCHEMA = 'grand_horizon_hotel'
ORDER BY TABLE_NAME, INDEX_NAME;

SELECT
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM   INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE  TABLE_SCHEMA          = 'grand_horizon_hotel'
  AND  REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;

-- =============================================================================
-- END OF DDL SCRIPT
-- =============================================================================


