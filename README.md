# 🏨 Grand Horizon Hotel — Web Application
 
A full-stack Hotel Reservation & Event Management System built with **Node.js + Express + MySQL**.
 
---
 
## 📁 Project Structure
 
```
hotel-app/
├── server/
│   ├── index.js              # Express server entry point
│   ├── config/db.js          # MySQL connection pool
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication & RBAC
│   │   └── validate.js       # Input validation (express-validator)
│   └── routes/
│       ├── auth.js           # Registration & login
│       ├── rooms.js          # Room search & management
│       ├── reservations.js   # Booking, check-in, check-out
│       ├── events.js         # Hall booking & event management
│       ├── invoices.js       # Invoice viewing & payment
│       ├── feedback.js       # Customer feedback
│       └── reports.js        # Dashboard & analytics
├── client/                   # 🧳 Guest Portal (HTML/CSS/JS)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── manager/                  # 🏨 Manager Portal (HTML/CSS/JS)
│   ├── index.html
│   ├── css/style.css
│   └── js/manager.js
├── package.json
├── .env
└── README.md
```
 
---
 
## ⚙️ Setup Instructions
 
### 1. Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm
 
### 2. Database Setup
```bash
# Run the DDL script first
mysql -u root -p < ../hotel_db_ddl.sql
 
# Then seed with sample data
mysql -u root -p < ../hotel_db_dml.sql
```
 
### 3. Install Dependencies
```bash
cd hotel-app
npm install
```
 
### 4. Configure Environment
Edit `.env` to match your MySQL credentials:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=grand_horizon_hotel
JWT_SECRET=grand_horizon_secret_2026
MANAGER_USER=manager
MANAGER_PASS=manager123
```
 
### 5. Start the Server
```bash
# Production
npm start
 
# Development (auto-restart)
npm run dev
```
 
### 6. Access the Application
| Portal | URL |
|--------|-----|
| 🧳 Guest Portal | http://localhost:3000/client |
| 🏨 Manager Portal | http://localhost:3000/manager-portal |
 
---
 
## 🔐 Default Credentials
 
### Manager Login
- **Username:** `manager`
- **Password:** `manager123`
 
### Guest Login (from seed data)
- **Email:** `james.osei@email.com`
- **Password:** *(register a new account — seed data passwords are hashed placeholders)*
 
---
 
## 🌐 API Endpoints
 
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
| GET | `/api/rooms/:roomNumber` | Public | Room details |
| PUT | `/api/rooms/:roomNumber/status` | Manager | Update room status |
 
### Reservations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reservations` | Client | Create reservation |
| GET | `/api/reservations/my` | Client | My reservations |
| GET | `/api/reservations` | Manager | All reservations (filterable) |
| PUT | `/api/reservations/:id/checkin` | Manager | Check in guest |
| PUT | `/api/reservations/:id/checkout` | Manager | Check out guest |
| PUT | `/api/reservations/:id/cancel` | Client/Manager | Cancel reservation |
 
### Events
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/events/halls` | Public | Search available halls |
| POST | `/api/events` | Client | Book event hall |
| GET | `/api/events/my` | Client | My event bookings |
| GET | `/api/events` | Manager | All events (filterable) |
| PUT | `/api/events/:id/status` | Manager | Update event status |
| PUT | `/api/events/:id/cancel` | Client/Manager | Cancel event |
 
### Invoices
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/invoices/my` | Client | My invoices |
| GET | `/api/invoices` | Manager | All invoices (filterable) |
| GET | `/api/invoices/:id` | Client/Manager | Invoice detail |
| POST | `/api/invoices/:id/pay` | Manager | Record payment |
 
### Feedback
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/feedback` | Client | Submit feedback |
| GET | `/api/feedback/my` | Client | My feedback |
| GET | `/api/feedback` | Manager | All feedback (filterable) |
 
### Reports
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reports/dashboard` | Manager | Dashboard KPIs |
| GET | `/api/reports/occupancy` | Manager | Occupancy report |
| GET | `/api/reports/revenue` | Manager | Revenue report |
| GET | `/api/reports/feedback-summary` | Manager | Feedback analytics |
 
---
 
## ✅ Features Implemented
 
### Guest Portal (Client Interface)
- ✅ Room search with filters (dates, category, price, occupants)
- ✅ Real-time availability checking
- ✅ Room booking with instant confirmation & reference number
- ✅ Event hall search with capacity & time filters
- ✅ Event booking with automatic invoice generation
- ✅ My Bookings dashboard (reservations + events + feedback)
- ✅ Invoice viewing with full breakdown
- ✅ Feedback submission (post-stay & post-event)
- ✅ Reservation & event cancellation
- ✅ JWT-based authentication
 
### Manager Portal (Staff Interface)
- ✅ Real-time operations dashboard with 8 KPI cards
- ✅ Room management (grid + table view, status updates)
- ✅ Reservation management (search, filter, check-in, check-out)
- ✅ Event management (search, filter, status updates)
- ✅ Invoice management (search, filter, payment recording)
- ✅ Revenue reports with bar chart visualization
- ✅ Occupancy reports by category & date range
- ✅ Overdue check-out alerts
- ✅ Customer feedback analytics with rating breakdown
- ✅ Role-based access control (RBAC)
 
### Security & Validation
- ✅ JWT authentication with 8-hour expiry
- ✅ Role-based access control (client vs manager)
- ✅ Input validation on all POST/PUT endpoints
- ✅ Password hashing with bcryptjs (12 rounds)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Business rule enforcement (double-booking, payment before checkout)
 
