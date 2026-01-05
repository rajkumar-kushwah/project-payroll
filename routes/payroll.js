import express from "express";
import {
  generatePayroll,
  getPayrolls,
  getEmployeePayroll,
} from "../controllers/payrollSummaryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);

router.post("/generate", generatePayroll);
router.get("/", getPayrolls); // filters here
router.get("/single", getEmployeePayroll);

export default router;
