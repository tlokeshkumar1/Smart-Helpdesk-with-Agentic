// In-memory notification store (in production, use Redis)
const notifications = new Map();

export async function emitNotification({ userId, type, message, ticketId = null, metadata = {} }) {
  const notification = {
    id: Date.now().toString(),
    userId,
    type, // 'ticket_created', 'ticket_assigned', 'ticket_replied', 'ticket_closed'
    message,
    ticketId,
    metadata,
    timestamp: new Date(),
    read: false
  };

  // Store notification
  if (!notifications.has(userId)) {
    notifications.set(userId, []);
  }
  notifications.get(userId).push(notification);

  console.log(`In-app notification sent to user ${userId}:`, message);
  return { delivered: true, notification };
}

export function getUserNotifications(userId, limit = 50) {
  const userNotifications = notifications.get(userId) || [];
  return userNotifications
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

export function markNotificationAsRead(userId, notificationId) {
  const userNotifications = notifications.get(userId) || [];
  const notification = userNotifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
  }
  return notification;
}

export function markAllNotificationsAsRead(userId) {
  const userNotifications = notifications.get(userId) || [];
  userNotifications.forEach(n => n.read = true);
  return userNotifications.length;
}

export function getUnreadCount(userId) {
  const userNotifications = notifications.get(userId) || [];
  return userNotifications.filter(n => !n.read).length;
}
