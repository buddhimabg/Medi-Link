const Notification = require('../models/notification');

const getNotifications = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error fetching notifications" });
  }
};

const createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, category } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ message: "userId, title, and message are required" });
    }
    const notification = await Notification.create({
      userId,
      title,
      message,
      type: type || "system",
      category: category || "general"
    });
    res.status(201).json(notification);
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ message: "Server error creating notification" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    res.status(200).json(notification);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Server error marking notification as read" });
  }
};

module.exports = { getNotifications, createNotification, markAsRead };
