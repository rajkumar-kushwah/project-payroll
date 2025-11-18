import express from "express";
import { adminProtect, protect } from "../middleware/authMiddleware.js";
import { addAdmin, removeAdmin } from "../controllers/adminController.js";
import { adminDashboardController } from "../controllers/dashboardController.js";

const router = express.Router();

// Promote a user to admin
router.post("/admin/:userId", protect, addAdmin);

// Remove admin → downgrade to user
router.delete("/admin/:adminId", protect, removeAdmin);

// Dashboard → only admin/owner
router.get("/", protect, adminProtect, adminDashboardController);

export default router;
