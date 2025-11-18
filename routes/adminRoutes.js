import express from "express";
import { protect, adminProtect } from "../middleware/authMiddleware.js";
import { addUser, addAdmin, removeAdmin, getAdminDashboardData } from "../controllers/adminController.js";

const router = express.Router();

// Owner only → Add new user
router.post("/company/add-user", protect, adminProtect, addUser);

// Owner only → Promote to admin
router.post("/admin/:userId", protect, adminProtect, addAdmin);

// Owner only → Demote admin
router.delete("/admin/:adminId", protect, adminProtect, removeAdmin);

// Owner/Admin → Fetch all users for dashboard
router.get("/admin-dashboard", protect, adminProtect, getAdminDashboardData);

export default router;
