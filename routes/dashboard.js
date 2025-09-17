import express from "express";
import verifyToken from "../middleware/authMiddleware.js";
import Employee from "../models/Employee.js";
import Candidate from "../models/Candidate.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const employeesCount = await Employee.countDocuments();
    const candidatesCount = await Candidate.countDocuments();
    const adminsCount = await User.countDocuments({ role: "admin" });

    res.json({
      employees: employeesCount,
      candidates: candidatesCount,
      admins: adminsCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
