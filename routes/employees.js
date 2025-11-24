import express from "express";
import {
  searchEmployees,
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeById,
  createEmployeeProfile,
   updateEmployeeProfile,
} from "../controllers/employeeController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from '../middleware/upload.js';

const router = express.Router();
router.use(protect);

// FIXED ROUTES FIRST
router.get("/search", searchEmployees);

// BASE ROUTES
router.get("/", getEmployees);

// DYNAMIC ROUTES AT LAST
router.get("/:id", getEmployeeById);
router.post("/", addEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

router.post("/profile", upload.single("avatar"), createEmployeeProfile);

router.put("/profile/:id", upload.single("avatar"), updateEmployeeProfile);


export default router;
