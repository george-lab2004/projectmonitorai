import { asyncHandler } from "../middlewares/async-handler.middleware.js";
import type { Request, Response } from "express";
import { Project } from "../models/project.model.js";
import type { IUser } from "../models/user.model.js";

import { createNotification } from "../utils/notification.util.js";
import { runProjectAiAnalysis } from "../ai/ai.auditor.js";

interface AuthRequest extends Request {
    user?: IUser | null;
}

export const getProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Not authorized" });
    }

    let query: any = {};
    if (req.user.role !== "manager") {
        query = { members: req.user._id };
    } else {
        query = { manager: req.user._id };
    }

    const projects = await Project.find(query).lean();
    res.status(200).json(projects);
});
export const getProjectById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const project = await Project.findById(id).lean();
    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

    // Access control check: Must be manager OR assigned team member
    if (req.user) {
        const userId = req.user._id.toString();
        const isManager = project.manager?.toString() === userId || req.user.role === 'manager';
        const isMember = project.members?.some(memberId => memberId.toString() === userId);
        if (!isManager && !isMember) {
            return res.status(403).json({ message: "Not authorized to access this project" });
        }
    } else {
        return res.status(401).json({ message: "Not authorized" });
    }

    res.status(200).json(project);
})
export const createProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Not authorized" });
    }

    const { title, description, status, deadline, color, icon, members } = req.body
    if (!title || !description || !status || !deadline || !color || !icon) {
        return res.status(400).json({ message: "all fields are required" })
    }

    const membersList = members || [];

    const project = await Project.create({
        title,
        description,
        status,
        deadline,
        color,
        icon,
        healthScore: 100,
        aiSummary: "",
        aiGenerated: false,
        manager: req.user._id,
        members: membersList
    })

    // Send notifications to all assigned team members
    for (const memberId of membersList) {
        await createNotification(
            memberId,
            "success",
            "Added to Project & Group Chat",
            `You have been added to Project "${title}" and its group chat!`,
            `/projects/${project._id}`
        );
    }

    res.status(200).json({ message: "project created successfully", project });
})
export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const project = await Project.findByIdAndDelete(id)
    if (!project) {
        return res.status(400).json({ message: "invalid project id" })
    }
    res.status(200).json({ message: "project deleted successfully", project })
})

export const triggerManualProjectAudit = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Not authorized" });
    }

    const { id } = req.params;
    if (typeof id !== "string") {
        return res.status(400).json({ message: "Invalid project ID format" });
    }
    const project = await Project.findById(id);
    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

    // Access control: Only project manager or manager role can trigger manual audits
    const userId = req.user._id.toString();
    const isManager = project.manager?.toString() === userId || req.user.role === "manager";
    if (!isManager) {
        return res.status(403).json({ message: "Only the project manager can trigger manual AI audits" });
    }

    try {
        const auditResult = await runProjectAiAnalysis(id);
        res.status(200).json({
            message: "Project AI audit completed successfully",
            audit: auditResult
        });
    } catch (err: any) {
        if (err?.message === "QUOTA_EXHAUSTED") {
            return res.status(429).json({
                message: "This project has reached the daily limit of 5 AI audits. Please try again tomorrow!",
                error: "QUOTA_EXHAUSTED"
            });
        }
        res.status(500).json({
            message: err?.message || "Failed to trigger AI audit",
        });
    }
});

export const updateProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Not authorized" });
    }

    const { id } = req.params;
    if (typeof id !== "string") {
        return res.status(400).json({ message: "Invalid project ID format" });
    }

    const project = await Project.findById(id);
    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

    // Access control: Only project manager can update project details
    const userId = req.user._id.toString();
    const isManager = project.manager?.toString() === userId || req.user.role === "manager";
    if (!isManager) {
        return res.status(403).json({ message: "Only the project manager can update project details" });
    }

    const { title, description, status, deadline, color, icon, members } = req.body;

    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;
    if (deadline !== undefined) project.deadline = deadline;
    if (color !== undefined) project.color = color;
    if (icon !== undefined) project.icon = icon;
    if (members !== undefined) project.members = members;

    await project.save();

    res.status(200).json({ message: "Project updated successfully", project });
});  