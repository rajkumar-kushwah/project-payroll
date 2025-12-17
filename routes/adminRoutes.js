



import express from "express";
import {
  addUser,
  toggleUserRoleStatus,
  getAdminDashboardData,
  deleteUser,
  promoteEmployeeToAdmin,
  getEmployees,
} from "../controllers/adminController.js";

import { protect, ownerProtect, adminProtect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Owner → Add new user
router.post("/company/add-user", protect, ownerProtect, addUser);

// Owner → Promote + Demote + Activate + Deactivate (Single route)
router.put("/company/user/toggle/:userId", protect, ownerProtect, toggleUserRoleStatus);

// Owner/Admin → Dashboard data
router.get("/admin-dashboard", protect, adminProtect, getAdminDashboardData);

// Owner → Delete user
router.delete("/company/user/:userId", protect, ownerProtect, deleteUser);

router.put("/company/employee/promote/:employeeId", protect, ownerProtect, promoteEmployeeToAdmin );
router.get("/employees", protect, getEmployees);



export default router;
