import { asyncHandler } from "../middlewares/async-handler.middleware.js";
import type { Request, Response } from "express";
import { Notification } from "../models/notification.model.js";
import type { IUser } from "../models/user.model.js";

interface AuthenticatedRequest extends Request {
    user: IUser;
}

// GET /api/notifications
export const getNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 }) // Sorted by date desc
        .lean();
    res.status(200).json(notifications);
});

// PATCH /api/notifications/:id/read
export const markNotificationRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "Notification ID is required" });
    }

    const notification = await Notification.findOneAndUpdate(
        { _id: id, recipient: req.user._id },
        { read: true },
        { new: true }
    );
    if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
    }
    res.status(200).json(notification);
});

// PATCH /api/notifications/read-all
export const markAllNotificationsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await Notification.updateMany(
        { recipient: req.user._id, read: false },
        { read: true }
    );
    res.status(200).json({ message: "All notifications marked as read" });
});

// DELETE /api/notifications/:id
export const deleteNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "Notification ID is required" });
    }

    const notification = await Notification.findOneAndDelete({ _id: id as any, recipient: req.user._id });
    if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
    }
    res.status(200).json({ message: "Notification deleted successfully" });
});

// DELETE /api/notifications
export const clearAllNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await Notification.deleteMany({ recipient: req.user._id });
    res.status(200).json({ message: "All notifications cleared" });
});
