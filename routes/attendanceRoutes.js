import express from "express";
import {
  getAttendance,
  checkIn,
  checkOut,
  updateAttendance,
  deleteAttendance,
} from "../controllers/attendanceController.js";

import {
  protect,
  adminProtect,
  ownerProtect,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* ===========================
   LOGIN REQUIRED FOR ALL
=========================== */
router.use(protect);

/* ===========================
   ADMIN / OWNER SIDE
=========================== */
// Admin/Owner can mark check-in/out for any employee
router.post("/check-in", adminProtect, checkIn);
router.post("/check-out", adminProtect, checkOut);

// Get attendance with full filter (employee, status, date-range, month, year, pagination)
router.get("/", adminProtect, getAttendance);

// Update / Delete attendance by ID
router.put("/:id", adminProtect, updateAttendance);
router.delete("/:id", adminProtect, deleteAttendance);

/* ===========================
   OWNER ONLY (Optional)
=========================== */
// router.delete("/delete-all", ownerProtect, deleteAllAttendance);

export default router;
