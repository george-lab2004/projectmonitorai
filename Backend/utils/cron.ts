import cron from "node-cron";
import { Project } from "../models/project.model.js";
import { runProjectAiAnalysis } from "../ai/ai.auditor.js";

// Run every 8 hours: 00:00, 08:00, and 16:00
cron.schedule("0 */8 * * *", async () => {
    console.log("[Cron Job] Starting scheduled proactive Project AI Audit...");

    try {
        // Fetch all active/uncompleted projects
        const activeProjects = await Project.find({
            status: { $in: ["planning", "active", "on-track", "at-risk", "delayed"] }
        });

        console.log(`[Cron Job] Found ${activeProjects.length} active projects to audit.`);

        for (const project of activeProjects) {
            try {
                console.log(`[Cron Job] Running audit for Project: "${project.title}" (${project._id})`);
                await runProjectAiAnalysis(project._id.toString());
                console.log(`[Cron Job] Successfully audited Project: "${project.title}"`);
            } catch (auditErr: any) {
                if (auditErr?.message === "QUOTA_EXHAUSTED") {
                    console.warn(`[Cron Job] Quota limit reached for Project: "${project.title}". Skipping.`);
                } else {
                    console.error(`[Cron Job] Error auditing Project: "${project.title}":`, auditErr?.message || auditErr);
                }
            }
        }
    } catch (err: any) {
        console.error("[Cron Job] General Cron error:", err?.message || err);
    }
});