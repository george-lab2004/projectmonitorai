import { asyncHandler } from "../middlewares/async-handler.middleware.js";
import type { Request, Response } from "express";
import { pusher } from "../config/pusher.config.js";
import type { IUser } from "../models/user.model.js";
import { Project } from "../models/project.model.js";

interface AuthenticatedRequest extends Request {
    user: IUser;
}

// POST /api/pusher/auth
export const authenticatePusher = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;

    if (!socketId || !channel) {
        return res.status(400).json({ message: "socket_id and channel_name are required" });
    }

    // Security Check 1: Private User Channels (User's personal notification feed)
    if (channel.startsWith("private-user-")) {
        const userIdFromChannel = channel.replace("private-user-", "");
        
        if (req.user._id.toString() !== userIdFromChannel) {
            return res.status(403).json({ message: "Forbidden: You cannot subscribe to another user's private notification channel" });
        }
    }

    // Security Check 2: Private Project Channels (Group chats and Kanban update feeds)
    if (channel.startsWith("private-chat-project-") || channel.startsWith("private-project-")) {
        const projectId = channel
            .replace("private-chat-project-", "")
            .replace("private-project-", "");

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const isManager = project.manager?.toString() === req.user._id.toString();
        const isMember = project.members?.some(memberId => memberId.toString() === req.user._id.toString());

        if (!isManager && !isMember) {
            return res.status(403).json({ message: "Forbidden: You are not a member of this project" });
        }
    }

    // Generate secure authorization signature
    const authResponse = pusher.authorizeChannel(socketId, channel);
    
    res.status(200).send(authResponse);
});
