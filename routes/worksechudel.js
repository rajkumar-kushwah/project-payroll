// routes/workScheduleRoutes.js
import express from "express";
import {
  addWorkSchedule,
  getWorkSchedules,
  getWorkScheduleById,
  updateWorkSchedule,
  deleteWorkSchedule
} from "../controllers/workScheduleController.js";

import { protect, adminProtect, ownerProtect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Login required for all routes
router.use(protect);

// ----------------------------
// Admin / Owner only routes
// ----------------------------
router.post("/add", adminProtect, addWorkSchedule);
router.put("/:id", adminProtect, updateWorkSchedule);
router.delete("/:id", adminProtect, deleteWorkSchedule);

// ----------------------------
// Get schedules (admin / owner can see all, others can see their own)
// ----------------------------
router.get("/", adminProtect, getWorkSchedules);
router.get("/:id", adminProtect, getWorkScheduleById);

export default router;
