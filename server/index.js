require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use('/client', express.static(path.join(__dirname, '../client')));
app.use('/manager', express.static(path.join(__dirname, '../manager')));

// API Routes
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/rooms',        require('./routes/rooms'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/events',       require('./routes/events'));
app.use('/api/invoices',     require('./routes/invoices'));
app.use('/api/feedback',     require('./routes/feedback'));
app.use('/api/reports',      require('./routes/reports'));

// Root redirect
app.get('/', (req, res) => res.redirect('/client/index.html'));
app.get('/manager-portal', (req, res) => res.redirect('/manager/index.html'));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`\n🏨  Grand Horizon Hotel Server running on http://localhost:${PORT}`);
  console.log(`   Client Portal  → http://localhost:${PORT}/client`);
  console.log(`   Manager Portal → http://localhost:${PORT}/manager-portal\n`);
});