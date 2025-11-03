import express from "express";
import {searchEmployees, getEmployees, addEmployee, updateEmployee, deleteEmployee, getEmployeeById } from "../controllers/employeeController.js";
import authMiddleware from "../middleware/authMiddleware.js";


const router = express.Router();
router.use(authMiddleware);
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.post("/", addEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);
router.get("/search", searchEmployees);


export default router;
