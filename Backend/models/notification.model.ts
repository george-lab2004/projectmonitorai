import { Document, Schema, Types, model } from "mongoose";

export interface INotification extends Document {
    _id: Types.ObjectId;
    recipient: Types.ObjectId;
    type: 'ai' | 'task' | 'alert' | 'message' | 'success' | 'warn';
    title: string;
    body: string;
    read: boolean;
    link?: string;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['ai', 'task', 'alert', 'message', 'success', 'warn'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: { type: String }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const Notification = model<INotification>("Notification", notificationSchema);
