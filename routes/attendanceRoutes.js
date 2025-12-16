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
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* ===========================
   LOGIN REQUIRED
=========================== */
router.use(protect);

/* ===========================
   CHECK-IN / CHECK-OUT
=========================== */
// employee → apna
//  hr/owner → kisi ka bhi
router.post("/check-in", checkIn);
router.post("/check-out", checkOut);

/* ===========================
   VIEW ATTENDANCE
=========================== */
// employee → apna
// hr/owner → sabka
router.get("/", getAttendance);

/* ===========================
   ADMIN / HR / OWNER ONLY
=========================== */
router.put("/:id", adminProtect, updateAttendance);
router.delete("/:id", adminProtect, deleteAttendance);

export default router;
