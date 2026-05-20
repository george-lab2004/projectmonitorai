import { Document, Schema, Types, model } from "mongoose";

export interface ITask extends Document {
    _id: Types.ObjectId;
    title: string;
    description?: string;
    project: Types.ObjectId;
    assignee: Types.ObjectId;
    status: 'todo' | 'in-progress' | 'in-review' | 'done';
    priority: 'low' | 'medium' | 'high';
    tags?: string[];
    deadline: Date;
    completedAt?: Date;
    comments?: {
        _id: any; author: Types.ObjectId, body: string, createdAt: Date
    }[];
    fileUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

const taskSchema = new Schema<ITask>({
    title: { type: String, required: true },
    description: { type: String },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    assignee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['todo', 'in-progress', 'in-review', 'done'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    tags: [{ type: String }],
    deadline: { type: Date, required: true },
    completedAt: { type: Date },
    comments: [{
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        body: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    fileUrl: { type: String }
}, { timestamps: true });

taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ project: 1, status: 1 });

export const Task = model<ITask>("Task", taskSchema);
