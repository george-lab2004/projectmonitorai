import express from "express";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications
} from "../controllers/notification.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/")
    .get(protect, getNotifications)
    .delete(protect, clearAllNotifications);

router.patch("/read-all", protect, markAllNotificationsRead);

router.route("/:id")
    .delete(protect, deleteNotification);

router.patch("/:id/read", protect, markNotificationRead);

export default router;
