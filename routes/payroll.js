import express from "express";
import Payroll from "../models/Payroll.js";

const router = express.Router();

// GET all payrolls
router.get("/", async (req, res) => {
  try {
    const payrolls = await Payroll.find().populate("employee", "name email");
    res.json(payrolls);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE payroll
router.post("/", async (req, res) => {
  try {
    const { employee, basicSalary, bonus, deductions } = req.body;
    const netPay = basicSalary + (bonus || 0) - (deductions || 0);

    const payroll = new Payroll({
      employee,
      basicSalary,
      bonus,
      deductions,
      netPay,
    });

    await payroll.save();
    res.json(payroll);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE payroll status (Paid / Pending)
router.put("/:id", async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(payroll);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE payroll
router.delete("/:id", async (req, res) => {
  try {
    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ message: "Payroll deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
