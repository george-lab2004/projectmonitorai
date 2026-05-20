import express from "express";
import {
    getMessage,
    sendMessage,
    deleteMessage,
    updateMessage,
    markChannelAsRead
} from "../controllers/message.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/:channel")
    .get(protect, getMessage);

router.post("/", protect, sendMessage);

router.route("/:id")
    .put(protect, updateMessage)
    .delete(protect, deleteMessage);

router.patch("/:channel/read", protect, markChannelAsRead);

export default router;
