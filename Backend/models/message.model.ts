import { Document, Schema, Types, model } from "mongoose";

export interface IMessage extends Document {
    _id: Types.ObjectId;
    channel: Number;
    sender: Types.ObjectId;
    body?: string;
    fileUrl?: string;
    fileName?: string;
    readBy?: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
    channel: { type: Number, required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

messageSchema.index({ channel: 1, createdAt: -1 });

export const Message = model<IMessage>("Message", messageSchema);
