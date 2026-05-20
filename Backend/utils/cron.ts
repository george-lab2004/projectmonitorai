import cron from "node-cron";
import { Project } from "../models/project.model.js";
import { runProjectAiAnalysis } from "../ai/ai.auditor.js";

// Core project auditing function (reusable for Express routes/Vercel crons)
export const runCronAudit = async (): Promise<void> => {
    console.log("[Cron Audit] Starting proactive Project AI Audit...");

    try {
        // Fetch all active/uncompleted projects
        const activeProjects = await Project.find({
            status: { $in: ["planning", "active", "on-track", "at-risk", "delayed"] }
        });

        console.log(`[Cron Audit] Found ${activeProjects.length} active projects to audit.`);

        for (const project of activeProjects) {
            try {
                console.log(`[Cron Audit] Running audit for Project: "${project.title}" (${project._id})`);
                await runProjectAiAnalysis(project._id.toString());
                console.log(`[Cron Audit] Successfully audited Project: "${project.title}"`);
            } catch (auditErr: any) {
                if (auditErr?.message === "QUOTA_EXHAUSTED") {
                    console.warn(`[Cron Audit] Quota limit reached for Project: "${project.title}". Skipping.`);
                } else {
                    console.error(`[Cron Audit] Error auditing Project: "${project.title}":`, auditErr?.message || auditErr);
                }
            }
        }
    } catch (err: any) {
        console.error("[Cron Audit] General audit error:", err?.message || err);
        throw err;
    }
};

// Run locally every 8 hours: 00:00, 08:00, and 16:00
cron.schedule("0 */8 * * *", async () => {
    console.log("[Cron Job] Running local scheduled task...");
    await runCronAudit().catch((err) => {
        console.error("[Cron Job] Scheduled task execution failed:", err);
    });
});