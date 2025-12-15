import express from "express";
import { addLeave, getLeavesByMonth, deleteLeave } from "../controllers/leaveController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, addLeave);
router.get("/:year/:month", protect, getLeavesByMonth);
router.delete("/:id", protect, deleteLeave);

export default router;
