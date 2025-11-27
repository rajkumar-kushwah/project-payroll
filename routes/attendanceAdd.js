// routes/masterAttendanceRoutes.js
import express from "express";
import {
  addAttendance,
  updateAttendance,
  deleteAttendance,
  filterAttendance
} from "../controllers/addAttanadace.js";
import { protect, adminProtect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Login required for all
router.use(protect);

// Admin only: manual add/update/delete
router.post("/add", adminProtect, addAttendance);
router.put("/:id", adminProtect, updateAttendance);
router.delete("/:id", adminProtect, deleteAttendance);
router.get("/filter", adminProtect, filterAttendance);

export default router;
