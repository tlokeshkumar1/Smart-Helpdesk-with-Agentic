import { Notification } from '../models/Notification.js';
import mongoose from 'mongoose';

export async function emitNotification({ userId, type, message, ticketId = null, metadata = {} }) {
  try {
    // Ensure userId is an ObjectId
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const ticketObjectId = ticketId ? (typeof ticketId === 'string' ? new mongoose.Types.ObjectId(ticketId) : ticketId) : null;
    
    const notification = await Notification.create({
      userId: userObjectId,
      type, // 'ticket_created', 'ticket_assigned', 'ticket_replied', 'ticket_closed'
      message,
      ticketId: ticketObjectId,
      metadata,
      read: false
    });

    console.log(`In-app notification sent to user ${userId}:`, message);
    return { delivered: true, notification };
  } catch (error) {
    console.error('Failed to create notification:', error);
    return { delivered: false, error: error.message };
  }
}

export async function getUserNotifications(userId, limit = 50) {
  try {
    // Ensure userId is an ObjectId
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    console.log(`Querying notifications for userId: ${userObjectId}`);
    
    const notifications = await Notification.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('ticketId', 'title status')
      .lean();
    
    console.log(`Query result: ${notifications.length} notifications found`);
    
    // Transform to match frontend expectations
    return notifications.map(notification => ({
      ...notification,
      timestamp: notification.createdAt
    }));
  } catch (error) {
    console.error('Failed to get user notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(userId, notificationId) {
  try {
    // Ensure userId is an ObjectId
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const notificationObjectId = typeof notificationId === 'string' ? new mongoose.Types.ObjectId(notificationId) : notificationId;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationObjectId, userId: userObjectId },
      { read: true },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return null;
  }
}

export async function markAllNotificationsAsRead(userId) {
  try {
    // Ensure userId is an ObjectId
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    const result = await Notification.updateMany(
      { userId: userObjectId, read: false },
      { read: true }
    );
    return result.modifiedCount;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return 0;
  }
}

export async function getUnreadCount(userId) {
  try {
    // Ensure userId is an ObjectId
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    const count = await Notification.countDocuments({ userId: userObjectId, read: false });
    return count;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}
