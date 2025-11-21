import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  setSalary,
  updateSalary,
  getSalary,
  getAllSalary,
  filterSalary,
  searchSalary,
} from "../controllers/salaryController.js";

const router = express.Router();
router.use(protect);

// STATIC ROUTES FIRST
router.get("/search", searchSalary);
router.get("/filter", filterSalary);
router.get("/", getAllSalary);

// DYNAMIC ROUTES LAST
router.post("/:employeeId/set", setSalary);
router.put("/:employeeId/update", updateSalary);
router.get("/:employeeId", getSalary);

export default router;
