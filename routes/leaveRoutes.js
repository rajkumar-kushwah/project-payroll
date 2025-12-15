import express from "express";
import { addLeave, getLeavesByMonth, deleteLeave, getAllEmployees } from "../controllers/leaveController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, addLeave);
router.get("/:year/:month", protect, getLeavesByMonth);
router.delete("/:id", protect, deleteLeave);
router.get("/employees", protect, getAllEmployees);


export default router;
