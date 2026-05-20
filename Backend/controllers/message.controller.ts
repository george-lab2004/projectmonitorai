import { asyncHandler } from "../middlewares/async-handler.middleware.js";
import type { Request, Response } from "express";
import { Message } from "../models/message.model.js";
import type { IUser } from "../models/user.model.js";
import { pusher } from "../config/pusher.config.js";

// Custom type so we don't have to keep checking if (req.user)
interface AuthenticatedRequest extends Request {
    user: IUser;
}

// GET /api/messages/:channel
export const getMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const channel = req.params.channel;
    if (!channel) {
        return res.status(400).json({ message: "channel is required" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ channel: Number(channel) })
        .populate('sender', 'name avatar')
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit)
        .lean();

    res.status(200).json(messages);
});

// POST /api/messages
export const sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { channel, body, fileUrl, fileName } = req.body;
    if (!channel || (!body && !fileUrl)) {
        return res.status(400).json({ message: "channel and either body or file are required" });
    }

    const message = await Message.create({
        channel: Number(channel),
        body,
        fileUrl,
        fileName,
        sender: req.user._id
    });

    await message.populate('sender', 'name avatar');

    // --- PUSHER INTEGRATION ---
    // trigger(channelName, eventName, data)
    // 1. Channel Name: "chat-channel-5" (keeps message streams isolated)
    // 2. Event Name: "new-message" (what the frontend listens for)
    // 3. Data: The newly created message object
    await pusher.trigger(`chat-channel-${channel}`, "new-message", message);

    res.status(201).json(message);
});

// DELETE /api/messages/:id
export const deleteMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const messageId = req.params.id;
    if (!messageId) {
        return res.status(400).json({ message: "message id is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
        return res.status(404).json({ message: "invalid message id" });
    }

    if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    await Message.findByIdAndDelete(messageId);
    res.status(200).json({ message: "message deleted successfully" });
});

// PATCH /api/messages/:id
export const updateMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { body, fileUrl, fileName } = req.body;

    const message = await Message.findById(id);
    if (!message) {
        return res.status(404).json({ message: "invalid message id" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to update this message" });
    }

    message.body = body !== undefined ? body : message.body;
    message.fileUrl = fileUrl !== undefined ? fileUrl : message.fileUrl;
    message.fileName = fileName !== undefined ? fileName : message.fileName;

    await message.save();

    res.status(200).json({ message: "message updated successfully", data: message });
});

// PATCH /api/messages/:channel/read
export const markChannelAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const channel = req.params.channel;
    if (!channel) {
        return res.status(400).json({ message: "channel is required" });
    }

    // Add user to readBy array for all messages in this channel where they aren't already present
    await Message.updateMany(
        { channel: Number(channel), readBy: { $ne: req.user._id } },
        { $addToSet: { readBy: req.user._id } }
    );

    res.status(200).json({ message: "Messages marked as read" });
});
