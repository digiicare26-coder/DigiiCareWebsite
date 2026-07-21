// src/repositories/notificationRepository.js
//
// 🆕 Generic in-app notifications for both patients and doctors.
// recipientType is 'PATIENT' or 'DOCTOR', recipientId is that
// patient's patient_id or that doctor's doctor_id (identity_schema).
// Nothing existing is touched by this file.
const { identityPrisma } = require('../../db');

/**
 * Create one notification row.
 * payload: { recipientType, recipientId, type, title, message, data? }
 */
async function createNotification(payload) {
  const { recipientType, recipientId, type, title, message, data = null } = payload;
  return identityPrisma.notification.create({
    data: { recipientType, recipientId, type, title, message, data },
  });
}

/**
 * List notifications for one recipient, newest first.
 */
async function getNotifications(recipientType, recipientId, { unreadOnly = false, limit = 50 } = {}) {
  return identityPrisma.notification.findMany({
    where: {
      recipientType,
      recipientId,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getUnreadCount(recipientType, recipientId) {
  return identityPrisma.notification.count({
    where: { recipientType, recipientId, isRead: false },
  });
}

/**
 * Mark one notification as read — scoped to recipientType/recipientId
 * as well, so a patient/doctor can never mark someone else's
 * notification as read even if they guess the notificationId.
 */
async function markAsRead(notificationId, recipientType, recipientId) {
  const result = await identityPrisma.notification.updateMany({
    where: { notificationId: Number(notificationId), recipientType, recipientId },
    data: { isRead: true },
  });
  return result.count > 0;
}

async function markAllAsRead(recipientType, recipientId) {
  const result = await identityPrisma.notification.updateMany({
    where: { recipientType, recipientId, isRead: false },
    data: { isRead: true },
  });
  return result.count;
}

module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
