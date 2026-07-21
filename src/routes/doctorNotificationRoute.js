// src/routes/doctorNotificationRoute.js
//
// 🆕 Doctor-side notifications. Mirrors notificationRoute.js exactly,
// one-for-one, just for doctors instead of patients — mounted at
// /api/doctor-notifications with the existing doctorAuthMiddleware
// (src/middleware/doctorAuth.js). Nothing existing is touched.
const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const doctorAuthMiddleware = require('../middleware/doctorAuth');

router.use(doctorAuthMiddleware);

// GET /api/doctor-notifications?unread=true
router.get('/', notificationController.getMyNotifications);

// GET /api/doctor-notifications/unread-count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/doctor-notifications/read-all
router.patch('/read-all', notificationController.markAllAsRead);

// PATCH /api/doctor-notifications/:notificationId/read
router.patch('/:notificationId/read', notificationController.markAsRead);

module.exports = router;
