// src/routes/notificationRoute.js
//
// 🆕 Patient-side notifications. Mounted at /api/notifications with
// the existing patient authMiddleware (src/middleware/auth.js) —
// nothing existing is touched.
const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/notifications?unread=true
router.get('/', notificationController.getMyNotifications);

// GET /api/notifications/unread-count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/notifications/read-all
router.patch('/read-all', notificationController.markAllAsRead);

// PATCH /api/notifications/:notificationId/read
router.patch('/:notificationId/read', notificationController.markAsRead);

module.exports = router;
