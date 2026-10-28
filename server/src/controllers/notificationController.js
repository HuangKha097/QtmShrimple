import mongoose from "mongoose";
import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate("sender", "displayName username avatarURL")
            .populate("post", "content image images video")
            .lean();

        res.status(200).json(notifications);
    } catch (error) {
        console.error("Error in getNotifications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid notification id" });
        }

        const notif = await Notification.findOneAndUpdate(
            { _id: id, recipient: userId },
            { isRead: true },
            { new: true }
        );

        if (!notif) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json(notif);
    } catch (error) {
        console.error("Error in markAsRead:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Error in markAllAsRead:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid notification id" });
        }

        const deleted = await Notification.findOneAndDelete({
            _id: id,
            recipient: userId,
        });

        if (!deleted) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification deleted", id });
    } catch (error) {
        console.error("Error in deleteNotification:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteAllNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.deleteMany({ recipient: userId });

        res.status(200).json({ message: "All notifications deleted" });
    } catch (error) {
        console.error("Error in deleteAllNotifications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
