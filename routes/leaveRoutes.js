import express from "express";
import {
  applyLeave,
  getPendingLeaves,
  updateLeaveStatus,
  getMyLeaves,
  getLeaves,
} from "../controllers/leaveController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ================= EMPLOYEE ================= */

// Employee → Apply Leave
router.post("/", protect, applyLeave);

// Employee → My Leaves
router.get("/my", protect, getMyLeaves);


router.get("/", protect, getLeaves);


/* ================= ADMIN / OWNER / HR ================= */

// // Admin/Owner/HR → Pending Leaves
// router.get("/pending", protect, getPendingLeaves);

// Admin/Owner/HR → Approve / Reject
router.put("/:id", protect, updateLeaveStatus);

export default router;
