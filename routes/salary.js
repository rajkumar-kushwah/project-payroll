import express from "express";
import { addSalary, getSalaryByEmployee, updateSalary, deleteSalary, paySalary, getSalaryById } from "../controllers/salaryController.js";

const router = express.Router();

router.post("/", addSalary);                // Add salary
router.get("/:employeeId", getSalaryByEmployee);  // Get salary by employee
router.put("/:id", updateSalary);          // Edit salary
router.delete("/:id", deleteSalary);       // Delete salary
router.put("/pay/:id", paySalary);         // Mark salary as Paid
router.get("/single/:id", getSalaryById); // Get single salary


export default router;
