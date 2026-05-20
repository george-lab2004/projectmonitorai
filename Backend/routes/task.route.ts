import express from "express";
import {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    addComment,
    deleteComment
} from "../controllers/task.controller.js";
import { protect, manager } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createTaskValidator, updateTaskValidator, updateTaskStatusValidator } from "../validators/task.validator.js";

const router = express.Router();

router.route("/")
    .get(protect, getTasks)
    .post(protect, manager, validate(createTaskValidator), createTask);

router.route("/:id")
    .get(protect, getTaskById)
    .put(protect, validate(updateTaskValidator), updateTask)
    .delete(protect, manager, deleteTask);

router.patch("/:id/status", protect, validate(updateTaskStatusValidator), updateTaskStatus);

router.route("/:id/comments")
    .post(protect, addComment);

router.route("/:id/comments/:cid")
    .delete(protect, deleteComment);

export default router;
