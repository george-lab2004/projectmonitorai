import { GoogleGenerativeAI } from "@google/generative-ai";
import { Project } from "../models/project.model.js";
import { createNotification } from "../utils/notification.util.js";
import { MODELS } from "./ai.service.js";
import {
    getProjectStatus,
    getOverdueTasks,
    getTeamWorkload,
    getRiskAlerts
} from "./ai.functions.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
};

export const runProjectAiAnalysis = async (projectId: string): Promise<any> => {
    const project = await Project.findById(projectId);
    if (!project) {
        throw new Error("Project not found");
    }

    // 1. Quota Verification (Max 5 runs per day)
    let currentRunsToday = project.aiRunsToday;
    if (project.lastAiRunAt && !isSameDay(new Date(), new Date(project.lastAiRunAt))) {
        currentRunsToday = 0;
    }

    if (currentRunsToday >= 5) {
        throw new Error("QUOTA_EXHAUSTED");
    }

    // 2. Gather Context using DB functions
    const statusDist = await getProjectStatus({ projectId });
    const overdueTasks = await getOverdueTasks({ projectId });
    const workload = await getTeamWorkload({ projectId });
    const riskAlerts = await getRiskAlerts({ projectId });

    if ('error' in statusDist || 'error' in workload) {
        throw new Error("Failed to compile project data for AI analysis");
    }

    // 3. Format Prompt
    const prompt = `
You are the Project Monitor AI Auditor.
Analyze the following project metrics and return a JSON object evaluating the project.

Project Title: ${project.title}
Project Description: ${project.description}

### Task Status Counts:
- Todo: ${statusDist.statusDistribution.todo}
- In Progress: ${statusDist.statusDistribution["in-progress"]}
- In Review: ${statusDist.statusDistribution["in-review"]}
- Done: ${statusDist.statusDistribution.done}
- Total Tasks: ${statusDist.totalTasks}

### Overdue Tasks:
${overdueTasks.map((t: any) => `- Task: "${t.title}" | Assignee: "${t.assignee?.name || 'Unassigned'}" (ID: ${t.assignee?._id || ''}) | Deadline: ${t.deadline}`).join("\n")}

### Team Workloads (Active Task Counts):
${workload.map((w: any) => `- Developer: "${w.name}" (ID: ${w._id || ''}) | Active Tasks: ${w.activeTasks}`).join("\n")}

### Risk Bottlenecks (Deadline within 48h):
${riskAlerts.map((a: any) => `- Task: "${a.task.title}" | Assignee: "${a.assignee?.name || 'Unassigned'}" (ID: ${a.assignee?._id || ''}) | Deadline: ${a.task.deadline}`).join("\n")}

You MUST return a JSON response matching this schema:
{
  "healthScore": <number between 0 and 100>,
  "aiSummary": "<paragraph summarizing progress, naming delayed or overloaded employees by name, and suggesting concrete next steps>",
  "riskAlerts": [
    {
      "recipientId": "<mongodb user objectid string of assignee or manager>",
      "title": "Project Risk: Overdue Task",
      "body": "Task [Title] is overdue. Please sync up."
    }
  ],
  "workloadAlerts": [
    {
      "recipientId": "<mongodb user objectid string of assignee or manager>",
      "title": "Workload Alert: Overloaded",
      "body": "[Name] has [count] active tasks. Please re-assign tasks if necessary."
    }
  ]
}

Instructions for JSON:
- Do not add markdown backticks (\`\`\`json). Just return the raw JSON text.
- If a task is overdue, set recipientId to the assignee's ObjectId string if it exists, otherwise use the project manager's ID: "${project.manager.toString()}".
- If a developer is overloaded, set recipientId to that developer's ObjectId string.
- Keep the aiSummary professional, direct, and under 150 words.
- Always include the manager ID: "${project.manager.toString()}" in the alert lists if the issue affects project delivery.
`;

    // 4. Call Gemini with retry loop
    let modelIndex = 0;
    let lastError: any = null;
    let aiResponseText = "";

    while (modelIndex < MODELS.length) {
        const currentModel = MODELS[modelIndex];
        if (!currentModel) break;

        try {
            const modelInstance = genAI.getGenerativeModel({
                model: currentModel,
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const result = await modelInstance.generateContent(prompt);
            aiResponseText = result.response.text();
            break;
        } catch (err: any) {
            lastError = err;
            console.warn(`[AI Auditor] Fallback triggered: ${currentModel} failed ->`, err?.message || err);
            modelIndex++;
        }
    }

    if (!aiResponseText) {
        throw new Error(lastError?.message || "AI failed to audit project");
    }

    // 5. Parse and Save Results
    const analysis = JSON.parse(aiResponseText);

    project.healthScore = typeof analysis.healthScore === 'number' ? analysis.healthScore : 100;
    project.aiSummary = analysis.aiSummary || "Audit completed successfully.";
    project.aiGenerated = true;
    project.aiRunsToday = currentRunsToday + 1;
    project.lastAiRunAt = new Date();
    await project.save();

    // 6. Dispatch Notifications
    const allAlerts = [...(analysis.riskAlerts || []), ...(analysis.workloadAlerts || [])];
    for (const alert of allAlerts) {
        try {
            if (alert.recipientId && alert.title && alert.body) {
                await createNotification(
                    alert.recipientId,
                    "ai",
                    alert.title,
                    alert.body,
                    `/projects/${project._id}`
                );
            }
        } catch (notifErr: any) {
            console.error("[AI Auditor] Failed to dispatch notification:", notifErr?.message || notifErr);
        }
    }

    return {
        projectId: project._id,
        healthScore: project.healthScore,
        aiSummary: project.aiSummary,
        aiRunsToday: project.aiRunsToday,
        lastAiRunAt: project.lastAiRunAt
    };
};
