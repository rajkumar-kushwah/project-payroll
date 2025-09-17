import express from "express";
import verifyToken from "../middleware/authMiddleware.js";
import Employee from "../models/Employee.js";

const router = express.Router();

// Create employee
router.post("/", verifyToken, async (req, res) => {
  try {
    const emp = await Employee.create(req.body);
    res.status(201).json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all employees
router.get("/", verifyToken, async (req, res) => {
  try {
    const list = await Employee.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
