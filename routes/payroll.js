import express from "express";
import {
  getPayrolls,
  exportPayrollCsv,
  exportPayrollPdf,
} from "../controllers/payrollSummaryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// Get payroll summary (auto-generate + auto-save)
router.get("/", getPayrolls);

// Export all employees payroll as CSV
router.get("/export/csv", exportPayrollCsv);

// Export single employee payroll as PDF
router.get("/export/pdf", exportPayrollPdf);

export default router;
