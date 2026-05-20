import express from "express";
import { runCronAudit } from "../utils/cron.js";

const router = express.Router();

// GET /api/cron
router.get("/", async (req, res) => {
    const authHeader = req.headers.authorization;

    // In local development, we allow triggering without credentials for easy testing.
    // In production (Vercel), we strictly check the CRON_SECRET token.
    if (process.env.NODE_ENV === "production") {
        if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ message: "Unauthorized request source" });
        }
    }

    try {
        console.log("[Cron Endpoint] Scheduled Vercel Audit trigger initiated...");
        // Run audit asynchronously so Vercel doesn't run into function execution timeouts
        runCronAudit().catch((err) => {
            console.error("[Cron Endpoint] Background audit failed:", err);
        });

        return res.status(200).json({ message: "Cron audit triggered successfully" });
    } catch (err: any) {
        console.error("[Cron Endpoint] Error triggering audit:", err);
        return res.status(500).json({ message: "Failed to trigger cron audit", error: err?.message || err });
    }
});

export default router;
