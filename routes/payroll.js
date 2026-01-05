import express from "express";
import {
  savePayrollSummary,
  getPayrollSummaries,
  getPayrollSummaryByEmployee
} from "../controllers/payrollSummaryController.js";
import { adminProtect, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

//  1️ Generate or Update Payroll (auto from attendance)
router.post("/generate", savePayrollSummary);

//  2️ Get all payroll summaries for a month (Payroll Page table)
router.get("/list", getPayrollSummaries);

//  3️ Get single employee payroll (for payslip)
router.get("/single", getPayrollSummaryByEmployee);

export default router;
