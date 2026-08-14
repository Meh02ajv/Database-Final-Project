
---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [User Roles](#-user-roles)
- [Prerequisites](#-prerequisites)
- [Database Setup (MariaDB)](#-database-setup-mariadb)
- [Application Setup](#-application-setup)
- [Running the App](#-running-the-app)
- [Using the App](#-using-the-app)
- [API Endpoints](#-api-endpoints)
- [Troubleshooting](#-troubleshooting)

---

## 📖 Project Overview

The Grand Horizon Hotel system solves the problem of fragmented, isolated hotel management by providing a **single centralised platform** that handles:

- 🛏 **Room Reservations** — search, book, check-in, check-out
- 🎪 **Event Hall Bookings** — browse halls, book events, manage schedules
- 🧾 **Invoicing & Payments** — automated invoice generation, payment recording
- ⭐ **Customer Feedback** — post-stay and post-event reviews
- 📊 **Manager Dashboard** — real-time KPIs, revenue breakdown, reports
- 👥 **Staff Management** — 4-role access control system

### Two Interfaces

| Interface | Who Uses It | Purpose |
|-----------|-------------|---------|
| 🧳 **Guest Portal** | Hotel customers | Search rooms, make bookings, view invoices |
| 🏨 **Manager Portal** | Hotel staff (all 3 roles) | Manage operations, process payments, view reports |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 18+, Express.js 4 |
| **Database** | MariaDB 12+ |
| **Authentication** | JWT (JSON Web Tokens, 8-hour expiry) |
| **Password Hashing** | bcryptjs (12 salt rounds) |
| **Input Validation** | express-validator |
| **Transactions** | BEGIN / COMMIT / ROLLBACK with FOR UPDATE locking |
| **Frontend** | Vanilla HTML5, CSS3, JavaScript |

---

## 📁 Project Structure
 
```
grand-horizon-hotel/
│
├── server/                        # Backend (Node.js + Express)
│   ├── index.js                   # Main server entry point
│   ├── config/
│   │   └── db.js                  # MySQL/MariaDB connection pool
│   ├── middleware/
│   │   ├── auth.js                # JWT authentication & role-based access
│   │   └── validate.js            # Input validation rules
│   └── routes/
│       ├── auth.js                # Register & login endpoints
│       ├── rooms.js               # Room search & management
│       ├── reservations.js        # Booking, check-in, check-out
│       ├── events.js              # Hall booking & event management
│       ├── invoices.js            # Invoice viewing & payment
│       ├── feedback.js            # Customer feedback
│       └── reports.js             # Dashboard & analytics
│
├── client/                        # Guest Portal (Frontend)
│   ├── index.html                 # Main guest interface
│   ├── css/style.css              # Guest portal styles
│   └── js/app.js                  # Guest portal logic
│
├── manager/                       # Manager Portal (Frontend)
│   ├── index.html                 # Main manager dashboard
│   ├── css/style.css              # Manager portal styles
│   └── js/manager.js              # Manager portal logic
│
├── hotel_db_ddl.sql               # Step 1: Creates all tables & constraints
├── hotel_db_dml.sql               # Step 2: Inserts sample data
├── hotel_db_queries.sql           # Step 3: Creates views, triggers, procedures
│
├── package.json                   # Node.js dependencies
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
└── README.md                      # This file
```
 
---

## 👥 User Roles

The system implements a **four-tier role-based access control (RBAC)** model:

| Role | Login Endpoint | Middleware | Access Scope |
|------|---------------|------------|--------------|
| **Administrator** | `/api/auth/staff/login` | `requireAdmin` | Full system access — staff accounts, rooms, all reservations, events, invoices, all reports |
| **Event Staff** | `/api/auth/staff/login` | `requireEventStaff` | Event operations — event bookings, hall schedules, event status updates |
| **Finance/Billing Staff** | `/api/auth/staff/login` | `requireFinanceStaff` | Financial operations — payments, invoices, revenue reports |
| **Customer** | `/api/auth/login` | `requireCustomer` | Self-service — search, book, view own reservations and invoices, submit feedback |

> ⚠️ Staff accounts are created exclusively by the Administrator. Staff cannot self-register.

---

## ✅ Prerequisites

### 1. Node.js (v18 or higher)
- Download from: https://nodejs.org (choose LTS)
- Verify:
```bash
node -v
npm -v
 
### 2.MariaDB 12+
 

 
**— MariaDB (also works perfectly):**
- Download from: https://mariadb.org/download/
- Install with default settings
- Set a root password and remember it!
 
**Verify installation:**
```bash
mysql --version
```
 
### 3. Git
- Download from: https://git-scm.com
- Verify: `git --version`
 
---
 
## 🗄 Database Setup
 
> ⚠️ **Important:** Run the SQL files in this exact order — DDL first, then DML, then Queries.
 
### Step 1 — Clone the Repository
 
```bash
git clone https://github.com/Meh02ajv/Database-Final-Project
cd Database-Final-Project
```
 
### Step 2 — Open MariaDB Client
 
** — Using Terminal/CMD:**
```bash
mysql -u root -p
```
Enter your root password when prompted. You will see:
```
MariaDB [(none)]>
```
 
 
---
 
### Step 3 — Run the DDL File (Creates Database & Tables)
 
**In Terminal/CMD (use forward slashes `/`):**
```sql
SOURCE C:/path/to/Database-Final-Project/hotel_db_ddl.sql;
```
 
✅ Expected result: 8 tables created, 0 errors
 
---
 
### Step 4 — Run the DML File (Inserts Sample Data)
 
**In Terminal/CMD:**
```sql
SOURCE C:/path/to/Database-Final-Project/hotel_db_dml.sql;
```
 
 
✅ Expected result: 30 customers, 25 reservations, 20 events inserted
 
---
 
### Step 5 — Run the Queries File (Creates Views, Triggers & Procedures)
 
**In Terminal/CMD:**
```sql
SOURCE C:/path/to/Database-Final-Project/hotel_db_queries.sql;
```
 
✅ Expected result: 5 views, 3 procedures, 2 functions, 3 triggers created
 
---
 
### Step 6 — Verify the Database
 
Run this query to confirm everything is set up correctly:
 
```sql
USE grand_horizon_hotel;

SHOW TABLES;

SELECT 'STAFF'         AS Entity, COUNT(*) AS Records FROM STAFF
UNION ALL
SELECT 'CUSTOMER',      COUNT(*) FROM CUSTOMER
UNION ALL
SELECT 'ROOM',          COUNT(*) FROM ROOM
UNION ALL
SELECT 'HALL',          COUNT(*) FROM HALL
UNION ALL
SELECT 'RESERVATION',   COUNT(*) FROM RESERVATION
UNION ALL
SELECT 'EVENT_BOOKING', COUNT(*) FROM EVENT_BOOKING
UNION ALL
SELECT 'INVOICE',       COUNT(*) FROM INVOICE
UNION ALL
SELECT 'FEEDBACK',      COUNT(*) FROM FEEDBACK;
```
 
**Expected output:**
 
| Entity | Records |
|--------|---------|
| STAFF | 9 |
| CUSTOMER | 30 |
| ROOM | 20 |
| HALL | 7 |
| RESERVATION | 25 |
| EVENT_BOOKING | 20 |
| INVOICE | 25 |
| FEEDBACK | 20 |
 
---

## Step 7 — Generate Real Staff Password Hashes

Open CMD in your project folder and run:

```bash
node -e "const b=require('bcryptjs'); b.hash('Staff@1234',12).then(h=>{ console.log('UPDATE STAFF SET PasswordHash = \'' + h + '\' WHERE IsActive = 1;'); })"
```

Copy the printed SQL statement and run it in your MariaDB client:

```sql
USE grand_horizon_hotel;
UPDATE STAFF SET PasswordHash = '$2b$12$YOUR_REAL_HASH_HERE' WHERE IsActive = 1;
```
**Expected output**

✅ All 7 active staff accounts will now accept the password Staff@1234

 
## ⚙️ Application Setup
 
### Step 1 — Install Node.js Dependencies
 
Open a terminal in the project root folder and run:
 
```bash
npm install
```
 
This installs all required packages:
- `express` — web framework
- `mysql2` — database driver (compatible with MariaDB)
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT authentication
- `express-validator` — input validation
- `dotenv` — environment variable management
- `cors` — cross-origin resource sharing
 
---
 
### Step 2 — Configure Environment Variables
 
Copy the example environment file:
 
```bash
# On Windows
copy .env.example .env
 
# On Mac/Linux
cp .env.example .env
```
 
Open the `.env` file with any text editor (Notepad, VS Code, etc.) and fill in your details:
 
```env
# Server
PORT=3000
 
# Database — update with YOUR credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_or_mariadb_password_here
DB_NAME=grand_horizon_hotel
 
# JWT Secret — can be any random string
JWT_SECRET=grand_horizon_secret_2026
 
# Manager Portal Credentials
MANAGER_USER=manager
MANAGER_PASS=manager123
```
 
> ⚠️ **Never share or commit your `.env` file.** It is already listed in `.gitignore`.
 
> 💡 **If your database has no password**, leave `DB_PASSWORD=` blank (empty).
 
---
 
## ▶️ Running the App
 
### Start the Server
 
```bash
npm start
```
 
You should see this output in your terminal:
 
```
🏨  Grand Horizon Hotel Server running on http://localhost:3000
   Client Portal  → http://localhost:3000/client
   Manager Portal → http://localhost:3000/manager-portal
```
 
### Development Mode (auto-restart on file changes)
 
```bash
npm run dev
```
 
---
 
## 🌐 Using the App
 
### Open in Your Browser
 
| Portal | URL | Description |
|--------|-----|-------------|
| 🧳 Guest Portal | http://localhost:3000/client | For hotel customers |
| 🏨 Manager Portal | http://localhost:3000/manager-portal | For hotel staff |
 
---
 
### 🧳 Guest Portal Features
 
1. **Register** — Create a new guest account
2. **Login** — Sign in with your email and password
3. **Browse Rooms** — Filter by dates, category, price, number of guests
4. **Book a Room** — Select dates and confirm booking (get a reference number)
5. **Browse Event Halls** — Filter by date, time, and capacity
6. **Book an Event** — Select hall, event type, date and time
7. **My Bookings** — View all your reservations and event bookings
8. **Invoices** — View detailed invoices with full charge breakdown
9. **Feedback** — Submit ratings after completed stays or events
10. **Cancel** — Cancel confirmed reservations or events
 
---
 
### 🏨 Manager Portal Features
 
**Login credentials:**

|Name | Email | Role | Password |
|-----|-------|------|----------|
|Daniel Quaye | daniel.quaye@grandhorizon.com  | Administrator |	Staff@1234 |
|Nana Asiedu | nana.asiedu@grandhorizon.com |	Event Staff |	Staff@1234 |
|Priscilla Ofori | priscilla.ofori@grandhorizon.com | Event Staff |	Staff@1234 |
|Michael Antwi | michael.antwi@grandhorizon.com |	Event Staff |	Staff@1234
|Samuel Kumi | samuel.kumi@grandhorizon.com |	Finance/Billing Staff |	Staff@1234 |
|Josephine Acheampong |	josephine.acheampong@grandhorizon.com |	Finance/Billing Staff |	Staff@1234 |
|Richard Opoku | richard.opoku@grandhorizon.com |	Finance/Billing Staff |	Staff@1234 |
 
1. **Dashboard** — Live KPIs: available rooms, occupied rooms, today's check-ins/outs, revenue
2. **Room Management** — View all rooms in grid or table view, update room status
3. **Reservations** — Search and filter all bookings, process check-in and check-out
4. **Event Bookings** — Manage all event bookings, update event status
5. **Invoices** — View and filter all invoices, record customer payments
6. **Reports** — Monthly revenue chart, occupancy by category, overdue check-out alerts
7. **Feedback** — View all customer reviews with rating analytics
 
---
 
## 🔌 API Endpoints
 
### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new customer |
| POST | `/api/auth/login` | Customer login |
| POST | `/api/auth/manager/login` | Manager login |
 
### Rooms
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/rooms` | Public | Search available rooms |
| GET | `/api/rooms/categories` | Public | All room categories |
| GET | `/api/rooms/all` | Manager | All rooms with status |
| GET | `/api/rooms/:roomNumber` | Public | Single room details |
| POST | `/api/rooms` | Manager | Create a new room |
| PUT | `/api/rooms/:roomNumber` | Manager | Edit room details |
| PUT | `/api/rooms/:roomNumber/status` | Manager | Update room status only |
| DELETE | `/api/rooms/:roomNumber` | Manager | Delete a room |
 
### Reservations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reservations` | Client | Create reservation |
| GET | `/api/reservations/my` | Client | My reservations |
| GET | `/api/reservations` | Manager | All reservations |
| PUT | `/api/reservations/:id/checkin` | Manager | Check in guest |
| PUT | `/api/reservations/:id/checkout` | Manager | Check out guest |
| PUT | `/api/reservations/:id/cancel` | Client/Manager | Cancel reservation |
 
### Events
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/events/halls` | Public | Search available halls |
| POST | `/api/events` | Client | Book event hall |
| GET | `/api/events/my` | Client | My event bookings |
| GET | `/api/events` | Manager | All events |
| PUT | `/api/events/:id/status` | Manager | Update event status |
| PUT | `/api/events/:id/cancel` | Client/Manager | Cancel event |
 
### Invoices
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/invoices/my` | Client | My invoices |
| GET | `/api/invoices` | Manager | All invoices |
| GET | `/api/invoices/:id` | Client/Manager | Invoice detail |
| POST | `/api/invoices/:id/pay` | Manager | Record payment |
 
### Reports (Manager only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/dashboard` | Live KPI summary |
| GET | `/api/reports/occupancy` | Occupancy report by date range |
| GET | `/api/reports/revenue` | Monthly revenue breakdown |
| GET | `/api/reports/feedback-summary` | Feedback analytics |
 
 
---
 
## 🔧 Troubleshooting
 
| Problem | Cause | Fix |
|---------|-------|-----|
| `'mysql' is not recognized` | MySQL/MariaDB not in PATH | Add MySQL bin folder to system PATH environment variable |
| `Access denied for user 'root'` | Wrong password in `.env` | Update `DB_PASSWORD` in your `.env` file |
| `Unknown database 'grand_horizon_hotel'` | DDL file not run yet | Run `hotel_db_ddl.sql` first |
| `ECONNREFUSED 127.0.0.1:3306` | Database not running | Start MySQL/MariaDB service from Windows Services |
| `Cannot find module 'express'` | Dependencies not installed | Run `npm install` in the project folder |
| `Port 3000 already in use` | Another app using port 3000 | Change `PORT=3001` in `.env` |
| `ERROR: Unknown command '\U'` | Wrong path format in SQL client | Use forward slashes: `SOURCE C:/path/to/file.sql;` |
| `npm start` not found | Wrong folder | Make sure you are inside the `grand-horizon-hotel/` folder |
 
---
 
## 🔐 Security Notes
 
- Passwords are hashed using **bcryptjs** (12 salt rounds)
- Authentication uses **JWT tokens** (8-hour expiry)
- All API inputs are validated with **express-validator**
- Database queries use **parameterized statements** (SQL injection prevention)
- The `.env` file is excluded from Git via `.gitignore`
- Role-based access control separates **client** and **manager** permissions
 
---
 
## 👥 Contributing
 
1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Commit: `git commit -m "Add your feature"`
5. Push: `git push origin feature/your-feature-name`
6. Open a Pull Request
 
---
 
## 📄 License
 
This project was developed as a **Database Design & Application Development** academic project.
 
---
 
## 🙏 Acknowledgements
 
- **The Grand Horizon Hotel** — fictional hotel used as the project case study
- Built with Node.js, Express, MySQL2, bcryptjs, and JWT