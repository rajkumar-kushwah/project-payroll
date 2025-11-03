import express from "express";
import {
  getSalariesByEmployee,
  getSalaryById,
  addSalary,
  markSalaryPaid,
  deleteSalary,
  filterSalaries,
  updateSalary 
} from "../controllers/salaryController.js";
import { protect } from "../middleware/authMiddleware.js"; //  ensure user is logged in

const router = express.Router();

//  All routes are protected (only logged-in user access)
router.use(protect);

// 1. Get all salary records
router.get("/employee/:employeeId", getSalariesByEmployee);

//  2. Filter salary by month or status
router.get("/filter", filterSalaries);

//  3. Get single salary record
router.get("/:id", getSalaryById);

//  4. Add new salary (if needed manually)
router.post("/", addSalary);

//  5. Mark salary as paid
router.patch("/:id/pay", markSalaryPaid);

//  6. Delete salary
router.delete("/:id", deleteSalary);

// 7. Update full salary record (replace)
router.put("/:id", updateSalary);


export default router;
