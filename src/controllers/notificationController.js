// src/controllers/notificationController.js
//
// 🆕 Works for BOTH a logged-in patient (req.user, from
// src/middleware/auth.js) and a logged-in doctor (req.doctor, from
// src/middleware/doctorAuth.js) — whichever one mounted the route
// sets the matching field, so resolveRecipient() picks it up
// automatically. Nothing existing is touched by this file.
const notificationRepository = require('../repositories/notificationRepository');

function resolveRecipient(req) {
  if (req.user && req.user.patientId) {
    return { recipientType: 'PATIENT', recipientId: req.user.patientId };
  }
  if (req.doctor && req.doctor.doctorId) {
    return { recipientType: 'DOCTOR', recipientId: req.doctor.doctorId };
  }
  return null;
}

/**
 * GET /api/notifications?unread=true
 */
async function getMyNotifications(req, res) {
  try {
    const recipient = resolveRecipient(req);
    if (!recipient) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }

    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationRepository.getNotifications(
      recipient.recipientType,
      recipient.recipientId,
      { unreadOnly }
    );
    const unreadCount = await notificationRepository.getUnreadCount(
      recipient.recipientType,
      recipient.recipientId
    );

    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/notifications/unread-count
 */
async function getUnreadCount(req, res) {
  try {
    const recipient = resolveRecipient(req);
    if (!recipient) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }

    const unreadCount = await notificationRepository.getUnreadCount(
      recipient.recipientType,
      recipient.recipientId
    );
    res.status(200).json({ success: true, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/notifications/:notificationId/read
 */
async function markAsRead(req, res) {
  try {
    const recipient = resolveRecipient(req);
    if (!recipient) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }

    const { notificationId } = req.params;
    const updated = await notificationRepository.markAsRead(
      notificationId,
      recipient.recipientType,
      recipient.recipientId
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }
    res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/notifications/read-all
 */
async function markAllAsRead(req, res) {
  try {
    const recipient = resolveRecipient(req);
    if (!recipient) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }

    const count = await notificationRepository.markAllAsRead(
      recipient.recipientType,
      recipient.recipientId
    );
    res.status(200).json({ success: true, message: `${count} notification(s) marked as read.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getMyNotifications, getUnreadCount, markAsRead, markAllAsRead };
