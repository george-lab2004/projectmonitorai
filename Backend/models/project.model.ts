import { model, Schema, Types, Document } from "mongoose";

const projectSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['planning', 'active', 'on-track', 'at-risk', 'delayed', 'completed'], default: 'planning' },
    deadline: { type: Date, required: true },
    color: { type: String, required: true },
    icon: { type: String, required: true },
    healthScore: { type: Number, required: true, default: 0 },
    aiSummary: { type: String, required: true, default: "" },
    aiRecommendations: { type: [String], default: [] },
    aiGenerated: { type: Boolean, required: true, default: false },
    aiRunsToday: { type: Number, required: true, default: 0 },
    lastAiRunAt: { type: Date },
    manager: { type: Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

projectSchema.index({ members: 1 });
projectSchema.index({ manager: 1 });

export interface IProject extends Document {
    _id: Types.ObjectId;
    title: string;
    description: string;
    status: 'planning' | 'active' | 'on-track' | 'at-risk' | 'delayed' | 'completed';
    deadline: Date;
    color: string;
    icon: string;
    healthScore: number;
    aiSummary: string;
    aiRecommendations?: string[];
    aiGenerated: boolean;
    aiRunsToday: number;
    lastAiRunAt?: Date;
    manager: Types.ObjectId;
    members: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
export const Project = model<IProject>("Project", projectSchema);