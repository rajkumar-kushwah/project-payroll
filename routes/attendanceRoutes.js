import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  addAttendance,
  getAttendance,
  deleteAttendance,
  updateAttendance,
} from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/add", protect, addAttendance);
router.get("/", protect, getAttendance);
router.delete("/:id", protect, deleteAttendance);
router.put("/:id", protect, updateAttendance);


export default router;
