import express from "express";
import { authenticatePusher } from "../controllers/pusher.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Route for authenticating private Pusher channels
router.post("/auth", protect, authenticatePusher);

export default router;
