import express from "express";
import {
  getSalariesByEmployee,
  getSalaryById,
  addSalary,
  markSalaryPaid,
  deleteSalary,
  filterSalaries,
  updateSalary,
} from "../controllers/salaryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// 1. Get all salaries of an employee
router.get("/employee/:employeeId", getSalariesByEmployee);

// 2. Filter salaries (month / status / employee)
// Admin OR Owner can filter
router.get("/filter", (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "owner") return next();
  return res.status(403).json({ message: "Admin/Owner access required" });
}, filterSalaries);

// 3. Get single salary record
router.get("/:id", getSalaryById);

// 4. Add new salary
router.post("/", addSalary);

// 5. Mark salary as paid
router.patch("/:id/pay", markSalaryPaid);

// 6. Delete salary
router.delete("/:id", deleteSalary);

// 7. Update salary
router.put("/:id", updateSalary);

export default router;
