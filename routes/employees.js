import express from "express";
import {
  searchEmployees,
  getEmployees,
  addEmployee,
  // updateEmployee,
  deleteEmployee,
  getEmployeeById,
  // createEmployeeProfile,
  updateEmployeeProfile,
} from "../controllers/employeeController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.use(protect);

// FIXED ROUTES FIRST
router.get("/search", searchEmployees);

// AVATAR ROUTES – before :id
// router.post("/profile", upload.single("avatar"), createEmployeeProfile);
router.put("/profile/:id", upload.single("avatar"), updateEmployeeProfile);

// NORMAL EMPLOYEE ROUTES
router.get("/", getEmployees);
router.post("/", upload.single("avatar"), addEmployee);

// DYNAMIC ROUTES LAST
router.get("/:id", getEmployeeById);
// router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;
