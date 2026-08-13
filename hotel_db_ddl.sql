-- =============================================================================
--  HOTEL RESERVATION & EVENT MANAGEMENT SYSTEM
--  The Grand Horizon Hotel
--  SQL DDL Script — Tables, Constraints, Indexes & Identity Columns
--  SQL Dialect: MySQL 8.0+
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
 
    -- Primary Key Constraint
    CONSTRAINT pk_customer       PRIMARY KEY (CustomerID),
 
    -- Unique Constraint: no two customers share the same email
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
 
    -- Primary Key Constraint
    CONSTRAINT pk_room_category       PRIMARY KEY (CategoryID),
 
    -- Unique Constraint: category names must be distinct
    CONSTRAINT uq_room_category_name  UNIQUE (CategoryName),
 
    -- Check Constraint: nightly price must be positive
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
 
    -- Primary Key Constraint
    CONSTRAINT pk_room          PRIMARY KEY (RoomNumber),
 
    -- Foreign Key Constraint: every room must belong to a category
    CONSTRAINT fk_room_category FOREIGN KEY (CategoryID)
                                REFERENCES  ROOM_CATEGORY(CategoryID)
                                ON UPDATE CASCADE
                                ON DELETE RESTRICT,
 
    -- Check Constraints
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
 
    -- Primary Key Constraint
    CONSTRAINT pk_reservation              PRIMARY KEY (ReservationID),
 
    -- Unique Constraint: booking reference must be unique
    CONSTRAINT uq_booking_reference        UNIQUE (BookingReference),
 
    -- Foreign Key Constraints
    CONSTRAINT fk_reservation_customer     FOREIGN KEY (CustomerID)
                                           REFERENCES  CUSTOMER(CustomerID)
                                           ON UPDATE CASCADE
                                           ON DELETE RESTRICT,
 
    CONSTRAINT fk_reservation_room         FOREIGN KEY (RoomNumber)
                                           REFERENCES  ROOM(RoomNumber)
                                           ON UPDATE CASCADE
                                           ON DELETE RESTRICT,
 
    -- Check Constraints
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
 
    -- Primary Key Constraint
    CONSTRAINT pk_hall                  PRIMARY KEY (HallID),
 
    -- Unique Constraint: hall names must be distinct
    CONSTRAINT uq_hall_name             UNIQUE (HallName),
 
    -- Check Constraints
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
 
    -- Primary Key Constraint
    CONSTRAINT pk_event_booking         PRIMARY KEY (EventID),
 
    -- Foreign Key Constraints
    CONSTRAINT fk_event_customer        FOREIGN KEY (CustomerID)
                                        REFERENCES  CUSTOMER(CustomerID)
                                        ON UPDATE CASCADE
                                        ON DELETE RESTRICT,
 
    CONSTRAINT fk_event_hall            FOREIGN KEY (HallID)
                                        REFERENCES  HALL(HallID)
                                        ON UPDATE CASCADE
                                        ON DELETE RESTRICT,
 
    -- Check Constraints
    CONSTRAINT chk_end_after_start      CHECK (EndTime > StartTime),
    CONSTRAINT chk_expected_attendees   CHECK (ExpectedAttendees > 0)
);
 
 
-- -----------------------------------------------------------------------------
-- TABLE 7: INVOICE
-- Consolidated bill generated for each reservation or event booking.
-- Identity column: InvoiceID (AUTO_INCREMENT)
-- At least one of ReservationID or EventID must be NOT NULL (enforced by trigger).
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
 
    -- Primary Key Constraint
    CONSTRAINT pk_invoice                PRIMARY KEY (InvoiceID),
 
    -- Unique Constraints: one invoice per reservation, one per event
    CONSTRAINT uq_invoice_reservation    UNIQUE (ReservationID),
    CONSTRAINT uq_invoice_event          UNIQUE (EventID),
 
    -- Foreign Key Constraints
    CONSTRAINT fk_invoice_reservation    FOREIGN KEY (ReservationID)
                                         REFERENCES  RESERVATION(ReservationID)
                                         ON UPDATE CASCADE
                                         ON DELETE RESTRICT,
 
    CONSTRAINT fk_invoice_event          FOREIGN KEY (EventID)
                                         REFERENCES  EVENT_BOOKING(EventID)
                                         ON UPDATE CASCADE
                                         ON DELETE RESTRICT,
 
    -- Check Constraints: all charge fields must be non-negative
    CONSTRAINT chk_invoice_room_charges  CHECK (RoomCharges       >= 0),
    CONSTRAINT chk_invoice_event_charges CHECK (EventCharges      >= 0),
    CONSTRAINT chk_invoice_add_charges   CHECK (AdditionalCharges >= 0),
    CONSTRAINT chk_invoice_total         CHECK (TotalAmount       >= 0)
);
 
 
-- -----------------------------------------------------------------------------
-- TABLE 8: FEEDBACK
-- Post-stay or post-event feedback submitted by customers.
-- Identity column: FeedbackID (AUTO_INCREMENT)
-- Only allowed after reservation Status = 'Checked-Out' or event Status = 'Completed'
-- (enforced by trigger).
-- -----------------------------------------------------------------------------
CREATE TABLE FEEDBACK (
    FeedbackID    INT       NOT NULL AUTO_INCREMENT,
    CustomerID    INT       NOT NULL,
    ReservationID INT,
    EventID       INT,
    Rating        INT       NOT NULL,
    Comments      TEXT,
    SubmittedDate DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
 
    -- Primary Key Constraint
    CONSTRAINT pk_feedback             PRIMARY KEY (FeedbackID),
 
    -- Foreign Key Constraints
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
 
    -- Check Constraint: rating must be between 1 and 5
    CONSTRAINT chk_feedback_rating     CHECK (Rating BETWEEN 1 AND 5)
);
 
 
-- =============================================================================
-- INDEXES
-- Optimise frequent query patterns: availability checks, date-range lookups,
-- customer history, status filtering, and reporting aggregations.
-- =============================================================================
 
-- ---- CUSTOMER ---------------------------------------------------------------
-- (Email already indexed via UNIQUE constraint)
 
-- ---- RESERVATION ------------------------------------------------------------
-- Speeds up customer booking history lookups
CREATE INDEX idx_reservation_customer
    ON RESERVATION (CustomerID);
 
-- Speeds up room availability checks
CREATE INDEX idx_reservation_room
    ON RESERVATION (RoomNumber);
 
-- Speeds up date-range overlap queries (double-booking prevention)
CREATE INDEX idx_reservation_dates
    ON RESERVATION (CheckInDate, CheckOutDate);
 
-- Speeds up status-based filtering (e.g. all Checked-In guests)
CREATE INDEX idx_reservation_status
    ON RESERVATION (Status);
 
-- ---- ROOM -------------------------------------------------------------------
-- Speeds up available room queries
CREATE INDEX idx_room_status
    ON ROOM (Status);
 
-- Speeds up category-based room lookups
CREATE INDEX idx_room_category
    ON ROOM (CategoryID);
 
-- ---- EVENT_BOOKING ----------------------------------------------------------
-- Speeds up customer event history lookups
CREATE INDEX idx_event_customer
    ON EVENT_BOOKING (CustomerID);
 
-- Speeds up hall availability checks
CREATE INDEX idx_event_hall
    ON EVENT_BOOKING (HallID);
 
-- Speeds up event schedule queries by date
CREATE INDEX idx_event_date
    ON EVENT_BOOKING (EventDate);
 
-- Speeds up status-based filtering (e.g. all Confirmed events)
CREATE INDEX idx_event_status
    ON EVENT_BOOKING (Status);
 
-- ---- INVOICE ----------------------------------------------------------------
-- Speeds up outstanding payment queries
CREATE INDEX idx_invoice_payment_status
    ON INVOICE (PaymentStatus);
 
-- Speeds up monthly revenue report aggregations
CREATE INDEX idx_invoice_issued_date
    ON INVOICE (IssuedDate);
 
-- ---- FEEDBACK ---------------------------------------------------------------
-- Speeds up customer feedback history lookups
CREATE INDEX idx_feedback_customer
    ON FEEDBACK (CustomerID);
 
 
-- =============================================================================
-- IDENTITY COLUMNS SUMMARY
-- MySQL uses AUTO_INCREMENT as the identity/sequence mechanism.
-- The following columns are defined as identity columns:
--
--   Table            Column           Type    Identity
--   ---------------  ---------------  ------  -------------------------
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
--
-- To reset an identity counter (e.g. after testing):
--   ALTER TABLE CUSTOMER AUTO_INCREMENT = 1;
-- =============================================================================
 
 
-- =============================================================================
-- VERIFICATION
-- Run these after executing the script to confirm all objects were created.
-- =============================================================================
 
-- List all tables
SHOW TABLES;
 
-- Confirm columns, data types, and constraints per table
DESCRIBE CUSTOMER;
DESCRIBE ROOM_CATEGORY;
DESCRIBE ROOM;
DESCRIBE RESERVATION;
DESCRIBE HALL;
DESCRIBE EVENT_BOOKING;
DESCRIBE INVOICE;
DESCRIBE FEEDBACK;
 
-- List all indexes
SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM   INFORMATION_SCHEMA.STATISTICS
WHERE  TABLE_SCHEMA = 'grand_horizon_hotel'
ORDER BY TABLE_NAME, INDEX_NAME;
 
-- List all foreign key constraints
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