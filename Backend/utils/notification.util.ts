import { Notification } from "../models/notification.model.js";
import { pusher } from "../config/pusher.config.js";
import { Types } from "mongoose";

/**
 * Creates a notification in MongoDB and triggers a real-time Pusher event to the recipient.
 * 
 * @param recipientId The MongoDB ObjectId or string ID of the user receiving the notification
 * @param type The type of notification ('ai' | 'task' | 'alert' | 'message' | 'success' | 'warn')
 * @param title The headline of the notification
 * @param body The descriptive content of the notification
 * @param link Optional target route or URL the user can click to navigate
 */
export const createNotification = async (
    recipientId: Types.ObjectId | string,
    type: 'ai' | 'task' | 'alert' | 'message' | 'success' | 'warn',
    title: string,
    body: string,
    link?: string
) => {
    // 1. Save to MongoDB
    const notificationData: any = {
        recipient: recipientId,
        type,
        title,
        body
    };
    if (link !== undefined) {
        notificationData.link = link;
    }
    
    const notification = await Notification.create(notificationData);

    // 2. Trigger real-time push via Pusher
    // We target the private user channel: "private-user-[userId]"
    const channelName = `private-user-${recipientId.toString()}`;
    
    try {
        await pusher.trigger(channelName, "new-notification", notification);
    } catch (error: any) {
        console.error("Failed to trigger Pusher notification event:", error?.message || error);
    }

    return notification;
};
