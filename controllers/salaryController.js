import Salary from "../models/Salary.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

// 1️ Get all salaries of a specific employee
export const getSalariesByEmployee = async (req, res) => {
  try {
    const salaries = await Salary.find({
      employeeId: req.params.employeeId,
      companyId: req.user.companyId,
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: salaries.length, data: salaries });
  } catch (err) {
    console.error("Error in getSalariesByEmployee:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 2️ Get salary by ID
export const getSalaryById = async (req, res) => {
  try {
    const salary = await Salary.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    }).populate("employeeId", "name email department jobRole");

    if (!salary)
      return res.status(404).json({ success: false, message: "Salary not found" });

    res.json({ success: true, data: salary });
  } catch (err) {
    console.error("Error in getSalaryById:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// 3️ Add new salary with attendance integration

export const addSalary = async (req, res) => {
  try {
    const { employeeId, month, basic, hra, allowances, deductions } = req.body;

    if (!mongoose.isValidObjectId(employeeId)) {
      return res.status(400).json({ success: false, message: "Invalid employee ID" });
    }

    const emp = await Employee.findOne({
      _id: employeeId,
      companyId: req.user.companyId,
    });
    if (!emp)
      return res.status(403).json({ success: false, message: "Employee not found or unauthorized" });

    // Check duplicate
    const exists = await Salary.findOne({ employeeId, month, companyId: req.user.companyId });
    if (exists)
      return res.status(400).json({ success: false, message: "Salary for this month already exists" });

    // Attendance check
    const attendances = await Attendance.find({
      employeeId,
      date: { $regex: `^${month}` }, // all dates in the month
      createdBy: req.user._id,
    });

    const totalDays = attendances.length || 30; // default 30 days if attendance not yet added
    const absentDays = attendances.filter(a => a.status === "absent" || a.status === "leave").length;
    const workingDays = totalDays - absentDays;

    // Salary calculation
    const perDaySalary = basic / totalDays;
    const netSalary =
      perDaySalary * workingDays + Number(hra || 0) + Number(allowances || 0) - Number(deductions || 0);

    const salary = await Salary.create({
      salaryId: `SAL-${uuidv4().slice(0, 8)}`,
      employeeId,
      month,
      basic,
      hra,
      allowances,
      deductions,
      leaves: absentDays,
      totalWorkingDays: totalDays,
      netSalary,
      companyId: req.user.companyId,
      createdBy: req.user._id,
      status: "unpaid",
    });

    res.status(201).json({ success: true, message: "Salary created successfully", data: salary });
  } catch (err) {
    console.error("Error in addSalary:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// 4️ Mark salary as paid
export const markSalaryPaid = async (req, res) => {
  try {
    const salary = await Salary.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!salary) return res.status(404).json({ success: false, message: "Salary not found" });
    if (salary.status === "paid") return res.status(400).json({ success: false, message: "Salary already paid" });

    salary.status = "paid";
    salary.paidOn = new Date();
    await salary.save();

    res.json({ success: true, message: "Salary marked as paid", data: salary });
  } catch (err) {
    console.error("Error in markSalaryPaid:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 5️⃣ Delete salary
export const deleteSalary = async (req, res) => {
  try {
    const salary = await Salary.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!salary) return res.status(404).json({ success: false, message: "Salary not found" });

    res.json({ success: true, message: "Salary deleted" });
  } catch (err) {
    console.error("Error in deleteSalary:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 6️ Filter salaries (month / status / employee)
export const filterSalaries = async (req, res) => {
  try {
    const { month, status, employeeId } = req.query;

    const filter = { companyId: req.user.companyId };
    if (month) filter.month = month;
    if (status) filter.status = status;

    if (employeeId) {
      if (!mongoose.isValidObjectId(employeeId))
        return res.status(400).json({ success: false, message: "Invalid employeeId" });
      filter.employeeId = employeeId;
    }

    const salaries = await Salary.find(filter)
      .populate("employeeId", "name email department jobRole")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: salaries.length, data: salaries });
  } catch (err) {
    console.error("Error in filterSalaries:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 7️ Update salary
export const updateSalary = async (req, res) => {
  try {
    const updated = await Salary.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ success: false, message: "Salary not found or unauthorized" });

    res.json({ success: true, message: "Salary updated successfully", data: updated });
  } catch (err) {
    console.error("Error in updateSalary:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
