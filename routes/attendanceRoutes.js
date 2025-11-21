import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  addAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendance,
  filterAttendance,
  checkIn,
  checkOut,
} from "../controllers/attendanceController.js";

const router = express.Router();
router.use(protect);

// STATIC ROUTES FIRST
router.get("/filter", filterAttendance);
router.get("/", getAttendance);

// AUTO (Employee Side)
router.post("/check-in", checkIn);
router.post("/check-out", checkOut);

// MANUAL (Admin/Owner)
router.post("/add", addAttendance);
router.put("/:id", updateAttendance);
router.delete("/:id", deleteAttendance);

export default router;
