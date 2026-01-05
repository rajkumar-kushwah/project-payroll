import express from "express";
import {
  generatePayroll,
  getPayrolls,
  getEmployeePayroll,
  exportPayrollCsv,
  exportPayrollPdf,
} from "../controllers/payrollSummaryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ------------------- Routes ------------------- //
router.use(protect);

// 1️ Generate / Update Payroll (DB me save)
router.post("/generate", generatePayroll);

// 2️ Get all payroll summaries (optional filters)
router.get("/", getPayrolls);

// 3️ Single employee payroll
router.get("/single", getEmployeePayroll);

// 4️ Export all employees payroll as CSV
router.get("/export/csv", exportPayrollCsv);

// 5️ Export single employee payroll as PDF
router.get("/export/pdf", exportPayrollPdf);

export default router;
