import express from "express";
import {
    getProject,
    getProjectById,
    createProject,
    deleteProject,
    triggerManualProjectAudit,
    updateProject
} from "../controllers/project.controller.js";
import { protect, manager } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createProjectValidator, updateProjectValidator } from "../validators/project.validator.js";

const router = express.Router();

router.route("/")
    .get(protect, getProject)
    .post(protect, manager, validate(createProjectValidator), createProject);

router.route("/:id")
    .get(protect, getProjectById)
    .delete(protect, manager, deleteProject)
    .put(protect, manager, validate(updateProjectValidator), updateProject);

router.post("/:id/audit", protect, triggerManualProjectAudit);

export default router;
