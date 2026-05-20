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
        
        // We MUST await here. In Vercel serverless environments, returning the HTTP response 
        // immediately freezes the execution container, killing any uncompleted background promises.
        await runCronAudit();

        return res.status(200).json({ message: "Cron audit completed successfully" });
    } catch (err: any) {
        console.error("[Cron Endpoint] Error running cron audit:", err);
        return res.status(500).json({ message: "Failed to execute cron audit", error: err?.message || err });
    }
});

export default router;
