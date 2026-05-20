import express from "express";
import { chatWithAI } from "./ai.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/chat", protect, chatWithAI);

export default router;
