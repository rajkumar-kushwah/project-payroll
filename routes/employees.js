import express from "express";
import {
  searchEmployees,
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeById,
  filterEmployees,
} from "../controllers/employeeController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);

// Specific routes first
router.get("/search", searchEmployees);
router.get("/employees/filter", filterEmployees);

// Then dynamic param routes
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);

// CRUD
router.post("/", addEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;
