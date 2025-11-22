import express from "express";
import { protect, adminProtect,ownerProtect } from "../middleware/authMiddleware.js";
import { addUser, addAdmin, removeAdmin, getAdminDashboardData, deleteUser, reactivateUser } from "../controllers/adminController.js";

const router = express.Router();

// Owner only → Add new user
router.post("/company/add-user", protect, ownerProtect, addUser);

// Owner only → Promote to admin
router.post("/admin/:userId", protect, ownerProtect, addAdmin);

// Owner only → Demote admin
router.delete("/admin/:adminId", protect, ownerProtect, removeAdmin);

// Owner/Admin → Fetch all users for dashboard
router.get("/admin-dashboard", protect, adminProtect, getAdminDashboardData);

// Owner only → Delete user
router.delete("/company/user/:userId", protect, ownerProtect, deleteUser);
router.post("/user/reactivate/:userId", protect, ownerProtect, reactivateUser);



export default router;
