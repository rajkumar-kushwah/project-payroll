import express from "express";
import {
  searchEmployees,
  getEmployees,
  addEmployee,
  deleteEmployee,
  getEmployeeById,
  updateEmployeeProfile,
  getMyProfile,
} from "../controllers/employeeController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// ALL ROUTES PROTECTED
router.use(protect);

// ======================
// STATIC / FIXED ROUTES
// ======================
router.get("/me/profile", getMyProfile);
router.get("/search", searchEmployees);

// AVATAR UPDATE
router.put("/profile/:id", upload.single("avatar"), updateEmployeeProfile);

// ======================
// NORMAL EMPLOYEE CRUD
// ======================
router.get("/", getEmployees);
router.post("/", upload.single("avatar"), addEmployee);

// ======================
// DYNAMIC ROUTES LAST
// ======================
router.get("/:id", getEmployeeById);
router.delete("/:id", deleteEmployee);

export default router;
