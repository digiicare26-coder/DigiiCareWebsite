// ============================================
// DigiCare Backend - Server Configuration
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// ============================================
// ROUTES IMPORTS
// ============================================
const storageRoute = require('./src/routes/storageRoute');           // BE-4
const authRoute = require('./src/routes/authRoute');                 // BE-1
const patientProfileRoute = require('./src/routes/patientProfileRoute'); // BE-2
const doctorRoute = require('./src/routes/doctorRoute');             // BE-2
const doctorAuthRoute = require('./src/routes/doctorAuthRoute');     // BE-1
const recommendRoute = require('./src/routes/recommendRoute');       // BE-3
const subAccountRoute = require('./src/routes/subAccountRoute');     // BE-1/BE-2
const consultationRoute = require('./src/routes/consultationRoute'); // BE-2
const searchRoute = require('./src/routes/searchRoute');             // BE-4
const consentRoute = require('./src/routes/consentRoute');           // BE-2
const printRoutes = require('./src/routes/printRoute');              // BE-4
const rewardsRoute = require('./src/routes/rewardsRoute');           // BE-2 Rewards
const adminRoute = require('./src/routes/adminRoute');               // 🆕 Admin Panel

// ============================================
// MIDDLEWARE IMPORTS
// ============================================
const deidentifyMiddleware = require('./src/middleware/deidentify'); // BE-1 ka

// ============================================
// INITIALIZE APP
// ============================================
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE SETUP
// ============================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// STATIC FILES
// ============================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================================
// ROUTE MOUNTS
// ============================================

// --- Authentication Routes (BE-1) ---
app.use('/api/auth', authRoute);
app.use('/api/doctor-auth', doctorAuthRoute);

// --- Profile Routes (BE-2) ---
app.use('/api/profile', patientProfileRoute);
app.use('/api/doctor', doctorRoute);

// --- Clinical Routes (BE-2 / BE-4) ---
app.use('/api/consultations', consultationRoute);
app.use('/api/storage', storageRoute);
app.use('/api/print', printRoutes);

// --- Consent & Recommendations (BE-2 / BE-3) ---
app.use('/api/consent', consentRoute);
app.use('/api/recommend', recommendRoute);
app.use('/api/search', searchRoute);

// --- Family/Sub-account ---
app.use('/api/family', subAccountRoute);

// --- Rewards System (BE-2) ---
app.use('/api/rewards', rewardsRoute);

// --- 🆕 Admin Panel ---
app.use('/api/admin', adminRoute);

// ============================================
// 🆕 DEBUG: LIST ALL ACTUAL REGISTERED ROUTES
// ============================================
app.get('/api/routes', (req, res) => {
    const mounted = [
        ['/api/auth', authRoute],
        ['/api/doctor-auth', doctorAuthRoute],
        ['/api/profile', patientProfileRoute],
        ['/api/doctor', doctorRoute],
        ['/api/consultations', consultationRoute],
        ['/api/storage', storageRoute],
        ['/api/print', printRoutes],
        ['/api/consent', consentRoute],
        ['/api/recommend', recommendRoute],
        ['/api/search', searchRoute],
        ['/api/family', subAccountRoute],
        ['/api/rewards', rewardsRoute],
        ['/api/admin', adminRoute],
    ];

    const routes = [];
    mounted.forEach(([prefix, router]) => {
        if (!router || !router.stack) return;
        router.stack.forEach((layer) => {
            if (layer.route) {
                const methods = Object.keys(layer.route.methods)
                    .map((m) => m.toUpperCase())
                    .join(', ');
                routes.push(`${methods}  ${prefix}${layer.route.path}`);
            }
        });
    });

    res.json({
        success: true,
        totalRoutes: routes.length,
        routes: routes.sort(),
    });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        hint: 'Visit GET /api/routes to see every valid endpoint.',
    });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// START SERVER
// ============================================
const server = app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 DigiCare Backend Running`);
    console.log(`========================================`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📁 Storage: ${process.env.STORAGE_PATH || './uploads'}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`🗺️  All routes: http://localhost:${PORT}/api/routes`);
    console.log(`========================================`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, closing server...');
    server.close(() => {
        console.log('✅ Server closed gracefully');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, closing server...');
    server.close(() => {
        console.log('✅ Server closed gracefully');
        process.exit(0);
    });
});

module.exports = app;