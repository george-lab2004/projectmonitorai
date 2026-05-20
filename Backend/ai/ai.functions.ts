import { Task } from "../models/task.model.js";
import { Project } from "../models/project.model.js";
import { User } from "../models/user.model.js";

export const getProjectList = async () => {
    return await Project.find().populate("manager", "name email").lean();
};

export const getOverdueTasks = async (args: { projectId?: string }) => {
    const query: any = {
        status: { $ne: "done" },
        deadline: { $lt: new Date() }
    };
    if (args.projectId) {
        query.project = args.projectId;
    }
    return await Task.find(query)
        .populate("assignee", "name email")
        .populate("project", "title")
        .lean();
};

export const getProjectStatus = async (args: { projectId: string }) => {
    const project = await Project.findById(args.projectId).lean();
    if (!project) return { error: "Project not found" };

    const tasks = await Task.find({ project: args.projectId }).lean();
    const stats = {
        todo: 0,
        "in-progress": 0,
        "in-review": 0,
        done: 0,
    };
    tasks.forEach(t => {
        if (t.status in stats) {
            stats[t.status]++;
        }
    });
    return {
        project: { title: project.title, status: project.status, deadline: project.deadline },
        totalTasks: tasks.length,
        statusDistribution: stats
    };
};

export const getTeamWorkload = async (args: { projectId: string }) => {
    const project = await Project.findById(args.projectId).populate("members", "name email").lean();
    if (!project) return { error: "Project not found" };

    const tasks = await Task.find({ project: args.projectId, status: { $ne: "done" } }).lean();
    const workload: Record<string, { _id: string; name: string; email: string; activeTasks: number }> = {};

    // Initialize map with current team members
    project.members.forEach((m: any) => {
        workload[m._id.toString()] = { _id: m._id.toString(), name: m.name, email: m.email, activeTasks: 0 };
    });

    tasks.forEach(t => {
        if (!t.assignee) return;
        const assigneeId = t.assignee.toString();
        if (workload[assigneeId]) {
            workload[assigneeId].activeTasks++;
        }
    });

    return Object.values(workload);
};

export const getProjectHealth = async (args: { projectId: string }) => {
    const project = await Project.findById(args.projectId).select("title healthScore aiSummary").lean();
    if (!project) return { error: "Project not found" };
    return project;
};

export const generateProjectHealth = async (args: { projectId: string }) => {
    const totalTasks = await Task.countDocuments({ project: args.projectId });
    if (totalTasks === 0) {
        await Project.findByIdAndUpdate(args.projectId, { healthScore: 100 });
        return { projectId: args.projectId, healthScore: 100, message: "No tasks found, health score is 100" };
    }
    const overdueTasks = await Task.countDocuments({
        project: args.projectId,
        status: { $ne: "done" },
        deadline: { $lt: new Date() }
    });
    const highPriorityOverdue = await Task.countDocuments({
        project: args.projectId,
        status: { $ne: "done" },
        priority: "high",
        deadline: { $lt: new Date() }
    });

    let score = 100 - (overdueTasks * 15) - (highPriorityOverdue * 10);
    score = Math.max(0, Math.min(100, score));

    await Project.findByIdAndUpdate(args.projectId, { healthScore: score });
    return { projectId: args.projectId, healthScore: score, totalTasks, overdueTasks };
};

export const getMemberPerformance = async (args: { memberId: string; projectId?: string }) => {
    const user = await User.findById(args.memberId).select("name email role").lean();
    if (!user) return { error: "User not found" };

    const query: any = { assignee: args.memberId };
    if (args.projectId) {
        query.project = args.projectId;
    }

    const tasks = await Task.find(query).lean();
    const total = tasks.length;
    let completed = 0;
    let overdue = 0;
    let completedOnTime = 0;

    tasks.forEach(t => {
        if (t.status === "done") {
            completed++;
            if (t.completedAt && t.deadline && new Date(t.completedAt) <= new Date(t.deadline)) {
                completedOnTime++;
            } else if (!t.completedAt && t.updatedAt && new Date(t.updatedAt) <= new Date(t.deadline)) {
                completedOnTime++;
            }
        } else if (t.deadline && new Date(t.deadline) < new Date()) {
            overdue++;
        }
    });

    return {
        member: user,
        metrics: {
            totalAssigned: total,
            completed,
            completedOnTime,
            overdue,
            onTimeRate: completed > 0 ? Math.round((completedOnTime / completed) * 100) : 100
        }
    };
};

export const getTeamPerformance = async (args: { projectId: string }) => {
    const project = await Project.findById(args.projectId).populate("members", "name email").lean();
    if (!project) return { error: "Project not found" };

    const performanceList = [];
    for (const member of project.members as any[]) {
        const perf = await getMemberPerformance({ memberId: member._id.toString(), projectId: args.projectId });
        performanceList.push(perf);
    }

    return {
        projectId: args.projectId,
        projectTitle: project.title,
        teamPerformance: performanceList
    };
};

export const getRiskAlerts = async (args: { projectId?: string }) => {
    const query: any = { status: { $ne: "done" } };
    if (args.projectId) {
        query.project = args.projectId;
    }

    const tasks = await Task.find(query).populate("assignee", "name email").populate("project", "title").lean();
    const alerts: any[] = [];
    const now = new Date();
    const threshold = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

    tasks.forEach(t => {
        if (t.deadline && new Date(t.deadline) < now) {
            alerts.push({
                type: "OVERDUE",
                task: { id: t._id, title: t.title, priority: t.priority, deadline: t.deadline },
                project: t.project,
                assignee: t.assignee
            });
        } else if (t.deadline && new Date(t.deadline) <= threshold) {
            alerts.push({
                type: "DEADLINE_APPROACHING",
                task: { id: t._id, title: t.title, priority: t.priority, deadline: t.deadline },
                project: t.project,
                assignee: t.assignee
            });
        }
    });

    return alerts;
};

export const getWorkloadAlerts = async (args: { projectId?: string }) => {
    const query: any = { status: { $ne: "done" } };
    if (args.projectId) {
        query.project = args.projectId;
    }

    const tasks = await Task.find(query).populate("assignee", "name email").lean();
    const countMap: Record<string, { assignee: any; count: number }> = {};

    tasks.forEach(t => {
        if (!t.assignee) return;
        const id = t.assignee._id.toString();
        if (!countMap[id]) {
            countMap[id] = { assignee: t.assignee, count: 0 };
        }
        countMap[id].count++;
    });

    const alerts = Object.values(countMap)
        .filter(item => item.count >= 5)
        .map(item => ({
            assignee: item.assignee,
            activeTaskCount: item.count,
            status: "OVERLOADED",
            message: `${item.assignee.name} is overloaded with ${item.count} active tasks.`
        }));

    return alerts;
};

export const getUserList = async () => {
    return await User.find().select("name email role").lean();
};

export const aiFunctionsExecutors = {
    getProjectList,
    getOverdueTasks,
    getProjectStatus,
    getTeamWorkload,
    getProjectHealth,
    generateProjectHealth,
    getMemberPerformance,
    getTeamPerformance,
    getRiskAlerts,
    getWorkloadAlerts,
    getUserList
};
export const aiFunctionExecutors = aiFunctionsExecutors;