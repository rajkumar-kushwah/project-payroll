import express from "express";
import {
  applyLeave,
  updateLeaveStatus,
  getMyLeaves,
  getLeaves,
  deleteLeave,
} from "../controllers/leaveController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= EMPLOYEE ================= */

// Employee → Apply Leave
router.post("/", protect, applyLeave);

// Employee → My Leaves
router.get("/my", protect, getMyLeaves);


router.get("/", protect, getLeaves);
// routes/leaveRoutes.js
router.delete("/:id", protect, deleteLeave);


// // Admin/Owner/HR → Pending Leaves
// router.get("/pending", protect, getPendingLeaves);

// Admin/Owner/HR → Approve / Reject
router.put("/:id", protect, updateLeaveStatus);

export default router;
