import { model, Schema, Document, Types } from "mongoose";

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, required: true },
    role: { type: String, enum: ['manager', 'member'], default: 'member' },
    isVerified: { type: Boolean, default: false },
    resetOtp: { type: String },
    resetOtpExpiry: { type: Date },
    aiUsageCount: { type: Number, default: 0 },
    lastAiMessage: { type: String, default: "" },
}, { timestamps: true })
export interface IUser extends Document {
    _id: Types.ObjectId;
    name: string;
    email: string;
    password: string;
    avatar: string;
    role: 'manager' | 'member';
    isVerified: boolean;
    resetOtp?: string | undefined;
    resetOtpExpiry?: Date | undefined;
    aiUsageCount: number;
    lastAiMessage: string;
}

export const User = model<IUser>("User", userSchema);

