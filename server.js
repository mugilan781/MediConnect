// ============================================================
// MediConnect – server.js
// Express application entry point
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const env = require('./config/env');
const pool = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// --- Route Imports ---
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const labTestRoutes = require('./routes/labTestRoutes');
const labBookingRoutes = require('./routes/labBookingRoutes');
const sampleCollectionRoutes = require('./routes/sampleCollectionRoutes');
const reportRoutes = require('./routes/reportRoutes');
const historyRoutes = require('./routes/historyRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const cmsRoutes = require('./routes/cmsRoutes');

// --- Initialize Express ---
const app = express();

// --- Global Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API Routes ---
// Legacy/generic /api/ prefix mappings
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/lab-tests', labTestRoutes);
app.use('/api/lab-bookings', labBookingRoutes);
app.use('/api/sample-collections', sampleCollectionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cms', cmsRoutes);

// Versioned /api/v1/ prefix mappings
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/consultations', consultationRoutes);
app.use('/api/v1/lab-tests', labTestRoutes);
app.use('/api/v1/lab-bookings', labBookingRoutes);
app.use('/api/v1/sample-collections', sampleCollectionRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/history', historyRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/cms', cmsRoutes);

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MediConnect API is running', timestamp: new Date().toISOString() });
});

// --- 404 Catch-All ---
// API 404s return JSON; all other 404s serve the HTML page
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// --- Global Error Handler ---
app.use(errorHandler);

// --- Start Server ---
const PORT = env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();

    // Seed demo users for demonstration mode
    const demoSeed = require('./services/demoSeed');
    await demoSeed.init();

    // Start background notification & reminder engine (every 30 seconds in dev, 1 hour in prod)
    const reminderEngine = require('./services/reminderEngine');
    reminderEngine.start(process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 30 * 1000);

    app.listen(PORT, () => {
      console.log(`🚀 MediConnect server running on http://localhost:${PORT}`);
      console.log(`📁 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.log('⚠️  Server starting without database connection...');
    app.listen(PORT, () => {
      console.log(`🚀 MediConnect server running on http://localhost:${PORT} (no DB)`);
    });
  }
}

startServer();

module.exports = app;
