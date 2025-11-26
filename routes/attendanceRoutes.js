import express from "express";
import {
  addAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendance,
  filterAttendance,
  checkIn,
  checkOut,
  registerAttendance,
  getRegisteredEmployees,
} from "../controllers/attendanceController.js";

import {
  protect,
  adminProtect,
  ownerProtect,
} from "../middleware/authMiddleware.js";

import upload from "../middleware/upload.js";

const router = express.Router();

/* ===========================
   LOGIN REQUIRED FOR ALL
=========================== */
router.use(protect);

/* ===========================
   ADMIN/OWNER SIDE ATTENDANCE
=========================== */
// Admin/Owner can manually mark attendance
router.post("/check-in", adminProtect, checkIn);
router.post("/check-out", adminProtect, checkOut);
router.get("/", adminProtect, getAttendance);
router.get("/filter", adminProtect, filterAttendance);
router.post("/add", adminProtect, addAttendance);
router.put("/:id", adminProtect, updateAttendance);
router.delete("/:id", adminProtect, deleteAttendance);

/* ===========================
   ATTENDANCE REGISTER (NEW)
=========================== */
// Admin/Owner register employee office timings
router.post("/register", adminProtect, registerAttendance);         // Add employee to AttendanceRegister
router.get("/register", adminProtect, getRegisteredEmployees);      // Get all registered employees

/* ===========================
   OWNER ONLY (Optional)
=========================== */
// router.delete("/delete-all", ownerProtect, deleteAllAttendance);

export default router;
