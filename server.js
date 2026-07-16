// ✅ FINAL CODE — Dono ko merge karo:

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const storageRoute = require('./src/routes/storageRoute');
const authRoute = require('./src/routes/authRoute');
const patientProfileRoute = require('./src/routes/patientProfileRoute');
const doctorRoute = require('./src/routes/doctorRoute');
const doctorAuthRoute = require('./src/routes/doctorAuthRoute');
const recommendRoute = require('./src/routes/recommendRoute');
const subAccountRoute = require('./src/routes/subAccountRoute');
const consultationRoute = require('./src/routes/consultationRoute');
const searchRoute = require('./src/routes/searchRoute');
const consentRoute = require('./src/routes/consentRoute');  // 🔥 BE-2 ka
const deidentifyMiddleware = require('./src/middleware/deidentify'); // 🔥 BE-1 ka

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoute);
app.use('/api/doctor-auth', doctorAuthRoute);
app.use('/api/profile', patientProfileRoute);
app.use('/api/doctor', doctorRoute);
app.use('/api/consultations', consultationRoute);
app.use('/api/consent', consentRoute);          // ✅ BE-2 consent routes
app.use('/api/storage', storageRoute);
app.use('/api/recommend', recommendRoute);
app.use('/api/search', searchRoute);
app.use('/api/family', subAccountRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 DigiiCare Backend Running`);
  console.log(`========================================`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📁 Storage: ${process.env.STORAGE_PATH || './uploads'}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`========================================`);
});

module.exports = app;