import { asyncHandler } from "../middlewares/async-handler.middleware.js";
import type { Request, Response } from "express";
import { Task } from "../models/task.model.js";
import { Project } from "../models/project.model.js";
import type { IUser } from "../models/user.model.js";
import { Types } from "mongoose";
import { createNotification } from "../utils/notification.util.js";
import { pusher } from "../config/pusher.config.js";

// Custom type so we don't have to keep checking if (req.user)
interface AuthenticatedRequest extends Request {
    user: IUser;
}

// 1. GET /api/tasks (Manager: all | Member: assigned only)
export const getTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query = req.user.role === 'manager' ? {} : { assignee: req.user._id };
    const tasks = await Task.find(query).populate('project', 'title').lean();
    res.status(200).json(tasks);
});

// 2. GET /api/tasks/:id (Populate assignee, project, comments.author)
export const getTaskById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const task = await Task.findById(req.params.id)
        .populate('assignee', 'name avatar')
        .populate('project', 'title')
        .populate('comments.author', 'name avatar')
        .lean();

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Access control check: Must be manager OR project member OR task assignee
    const project = await Project.findById(task.project).lean();
    if (!project) {
        return res.status(404).json({ message: "Project associated with this task not found" });
    }

    const isManager = project.manager?.toString() === req.user._id.toString() || req.user.role === 'manager';
    const isMember = project.members?.some(memberId => memberId.toString() === req.user._id.toString());
    const isAssignee = task.assignee?._id?.toString() === req.user._id.toString() || task.assignee?.toString() === req.user._id.toString();

    if (!isManager && !isMember && !isAssignee) {
        return res.status(403).json({ message: "Not authorized to access this task" });
    }

    res.status(200).json(task);
});

// 3. POST /api/tasks (Manager only)
export const createTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can create tasks" });
    }
    const task = await Task.create(req.body);

    // Notify assignee when task is created
    if (task.assignee) {
        // Fetch project to get its title
        const populatedTask = await task.populate("project", "title");
        const projectTitle = (populatedTask.project as any).title;

        await createNotification(
            task.assignee,
            "task",
            "New Task Assigned",
            `You have been assigned task "${task.title}" in Project "${projectTitle}"`,
            `/projects/${task.project}/tasks/${task._id}`
        );
    }

    res.status(201).json(task);
});

// 4. PUT /api/tasks/:id (Manager or assignee)
export const updateTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (req.user.role !== 'manager' && task.assignee.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to update this task" });
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updatedTask);
});

// 5. DELETE /api/tasks/:id (Manager only)
export const deleteTask = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({ message: "Only managers can delete tasks" });
    }
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.status(200).json({ message: "Task deleted successfully" });
});

// 6. PATCH /api/tasks/:id/status (Member or manager -> Emit socket)
export const updateTaskStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true });

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Populate project to get manager and title details
    const populatedTask = await task.populate("project");
    const projectTitle = (populatedTask.project as any).title;
    const managerId = (populatedTask.project as any).manager;

    // Trigger Pusher event for real-time Kanban updates on this project's board
    try {
        await pusher.trigger(`private-project-${task.project.toString()}`, "task-updated", {
            taskId: task._id,
            status: task.status
        });
    } catch (err: any) {
        console.error("Pusher trigger failed in updateTaskStatus:", err?.message || err);
    }

    // Notify the Project Manager if updated by assignee
    if (req.user._id.toString() !== managerId.toString()) {
        await createNotification(
            managerId,
            "task",
            "Task Status Updated",
            `${req.user.name} moved task "${task.title}" to ${status.toUpperCase()} in Project "${projectTitle}"`,
            `/projects/${task.project}/tasks/${task._id}`
        );
    }

    // Notify the Assignee if updated by Manager
    if (req.user._id.toString() === managerId.toString() && task.assignee) {
        await createNotification(
            task.assignee,
            "task",
            "Your Task Status Changed by Manager",
            `The manager moved your task "${task.title}" to ${status.toUpperCase()} in Project "${projectTitle}"`,
            `/projects/${task.project}/tasks/${task._id}`
        );
    }

    res.status(200).json(task);
});

// 7. POST /api/tasks/:id/comments (Any member)
export const addComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { body } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.comments = task.comments || [];
    task.comments.push({
        _id: new Types.ObjectId(),
        author: req.user._id as Types.ObjectId,
        body,
        createdAt: new Date(),
    });
    await task.save();

    // Fetch project details to notify assignee/manager
    const populatedTask = await task.populate("project");
    const projectTitle = (populatedTask.project as any).title;
    const managerId = (populatedTask.project as any).manager;

    // Notify Assignee (if commenter is not the assignee)
    if (task.assignee && req.user._id.toString() !== task.assignee.toString()) {
        await createNotification(
            task.assignee,
            "message",
            "New Comment on Task",
            `${req.user.name} commented on task "${task.title}" in Project "${projectTitle}"`,
            `/projects/${task.project}/tasks/${task._id}`
        );
    }

    // Notify Project Manager (if commenter is not the manager)
    if (managerId && req.user._id.toString() !== managerId.toString()) {
        await createNotification(
            managerId,
            "message",
            "New Comment on Task",
            `${req.user.name} commented on task "${task.title}" in Project "${projectTitle}"`,
            `/projects/${task.project}/tasks/${task._id}`
        );
    }

    res.status(201).json({ message: "Comment added" });
});

// 8. DELETE /api/tasks/:id/comments/:cid (Comment author only)
export const deleteComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, cid } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const comment = task.comments?.find(c => c._id?.toString() === cid);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    task.comments = task.comments?.filter(c => c._id?.toString() !== cid) || [];
    await task.save();

    res.status(200).json({ message: "Comment removed" });
});
