import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadCount
} from '../services/notificationService.js';

export const notifications = Router();

// Get user's notifications
notifications.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user._id; // Use ObjectId directly instead of converting to string
    const limit = parseInt(req.query.limit) || 50;
    
    console.log(`Getting notifications for user: ${userId}`);
    
    const userNotifications = await getUserNotifications(userId, limit);
    const unreadCount = await getUnreadCount(userId);
    
    console.log(`Found ${userNotifications.length} notifications, ${unreadCount} unread`);
    
    res.json({
      notifications: userNotifications,
      unreadCount
    });
  } catch (e) {
    console.error('Error getting notifications:', e);
    next(e);
  }
});

// Mark notification as read
notifications.put('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user._id; // Use ObjectId directly
    const notificationId = req.params.id;
    const notification = await markNotificationAsRead(userId, notificationId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (e) {
    next(e);
  }
});

// Mark all notifications as read
notifications.put('/read-all', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user._id; // Use ObjectId directly
    const count = await markAllNotificationsAsRead(userId);
    res.json({ markedAsRead: count });
  } catch (e) {
    next(e);
  }
});

// Get unread count only
notifications.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user._id; // Use ObjectId directly
    const unreadCount = await getUnreadCount(userId);
    res.json({ unreadCount });
  } catch (e) {
    next(e);
  }
});
