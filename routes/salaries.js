import express from "express";
import { addSalary, getSalaryByEmployee, updateSalary, deleteSalary } from "../controllers/salaryController.js";

const router = express.Router();

router.post("/", addSalary);
router.get("/employee/:employeeId", getSalaryByEmployee);
router.put("/:id", updateSalary);
router.delete("/:id", deleteSalary);

export default router;
