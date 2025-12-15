import express from "express";
import {
  searchEmployees,
  getEmployees,
  addEmployee,
  deleteEmployee,
  getEmployeeById,
  updateEmployeeProfile,
} from "../controllers/employeeController.js";
import { protect,adminProtect, employeeProtect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.use(protect);

// Search employees (admin only)
router.get("/search", adminProtect, searchEmployees);

// Update profile – admin can update anyone, employee can update self
router.put("/profile/:id", upload.single("avatar"), updateEmployeeProfile);

// Employee CRUD – only admin
router.get("/", adminProtect, getEmployees);
router.post("/", adminProtect, upload.single("avatar"), addEmployee);

// DYNAMIC ROUTES LAST
router.get("/:id", getEmployeeById);
router.delete("/:id", adminProtect, deleteEmployee);

export default router;
