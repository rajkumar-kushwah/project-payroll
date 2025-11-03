import Salary from "../models/Salary.js";
import Employee from "../models/Employee.js";
import { v4 as uuidv4 } from "uuid";

// 1️ Get all salaries of logged-in user's employees
export const getAllSalaries = async (req, res) => {
  try {
    const salaries = await Salary.find().populate("employeeId", "name email department");
    res.status(200).json(salaries);
  } catch (error) {
    console.error("Error in getAllSalaries:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// 2️ Get single salary record by ID
export const getSalaryById = async (req, res) => {
  try {
    const salary = await Salary.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    }).populate("employeeId", "name department jobRole email");

    if (!salary)
      return res.status(404).json({ message: "Salary record not found" });

    res.json(salary);
  } catch (err) {
    console.error("Error in getSalaryById:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 3️ Add new salary record manually
export const addSalary = async (req, res) => {
  try {
    const { employeeId, month, basic, hra, allowances, deductions, leaves, totalWorkingDays } = req.body;

    const emp = await Employee.findOne({ _id: employeeId, createdBy: req.user._id });
    if (!emp) return res.status(403).json({ message: "Unauthorized or employee not found" });

    const existing = await Salary.findOne({ employeeId, month });
    if (existing) return res.status(400).json({ message: "Salary for this month already exists" });

    const netSalary = basic + hra + allowances - deductions;

    const salary = await Salary.create({
      salaryId: `SAL-${uuidv4().slice(0, 8)}`,
      employeeId,
      month,
      basic,
      hra,
      allowances,
      deductions,
      leaves,
      totalWorkingDays,
      netSalary,
      createdBy: req.user._id,
      status: "unpaid",
    });

    res.status(201).json({ message: "Salary added successfully", data: salary });
  } catch (err) {
    console.error("Error in addSalary:", err);
    res.status(500).json({ message: "Server error while adding salary", error: err.message });
  }
};

// 4️ Mark salary as paid
export const markSalaryPaid = async (req, res) => {
  try {
    const salary = await Salary.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!salary)
      return res.status(404).json({ message: "Salary not found" });

    if (salary.status === "paid")
      return res.status(400).json({ message: "Salary is already paid" });

    salary.status = "paid";
    salary.paidOn = new Date();
    await salary.save();

    res.json({
      message: "Salary marked as paid successfully",
      data: salary,
    });
  } catch (err) {
    console.error("Error in markSalaryPaid:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 5️ Delete salary record
export const deleteSalary = async (req, res) => {
  try {
    const salary = await Salary.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!salary)
      return res.status(404).json({ message: "Salary not found" });

    res.json({ message: "Salary deleted successfully" });
  } catch (err) {
    console.error("Error in deleteSalary:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 6️ Filter salaries by month or status
export const filterSalaries = async (req, res) => {
  try {
    const { month, status } = req.query;
    const filter = { createdBy: req.user._id };

    if (month) filter.month = month;
    if (status) filter.status = status;

    const salaries = await Salary.find(filter)
      .populate("employeeId", "name department jobRole email")
      .sort({ createdAt: -1 });

    res.json(salaries);
  } catch (err) {
    console.error("Error in filterSalaries:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// In salaryController.js
export const updateSalary = async (req, res) => {
  try {
    const updatedSalary = await Salary.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id }, // only update if created by logged user
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedSalary) {
      return res.status(404).json({ message: "Salary not found or unauthorized" });
    }

    res.json({
      message: "Salary updated successfully",
      data: updatedSalary,
    });
  } catch (error) {
    console.error("Error in updateSalary:", error);
    res.status(500).json({ message: "Error updating salary", error: error.message });
  }
};
