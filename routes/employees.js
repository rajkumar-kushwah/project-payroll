import express from "express";
import {searchEmployees, getEmployees, addEmployee, updateEmployee, deleteEmployee, getEmployeeById } from "../controllers/employeeController.js";
import { protect } from "../middleware/authMiddleware.js";


const router = express.Router();
router.use(protect);
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.post("/", addEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);
router.get("/search", searchEmployees);


export default router;
