import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Salary from "../models/Salary.js";
import { v4 as uuidv4 } from "uuid"; // for unique salaryId

// 1️ Get all employees of logged-in user
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    console.error("Error in getEmployees:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 2️ Get single employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    res.json(emp);
  } catch (err) {
    console.error("Error in getEmployeeById:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 3️ Add new employee → auto-create salary
export const addEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      jobRole,
      joinDate,
      department,
      designation,
      salary,
      status, 
      notes,
    } = req.body;

    //  Step 1: Create employee with unique employeeId
    const emp = await Employee.create({
      employeeId: "EMP-" + uuidv4().slice(0, 8), //  auto employee ID
      name,
      email,
      phone,
       jobRole,
      department,
      designation,
      salary,
      joinDate,
      status,
      notes,
      createdBy: req.user._id,
    });

    //  Step 2: Auto-create salary record for that employee
    const salaryRecord = await Salary.create({
      salaryId: uuidv4(),
      employeeId: emp._id, //  link salary to employee
      month: new Date().toISOString().slice(0, 7), // YYYY-MM
      basic: emp.salary || 0,
      hra: 0,
      allowances: 0,
      deductions: 0,
      leaves: 0,
      totalWorkingDays: 30,
      netSalary: emp.salary || 0,
      createdBy: req.user._id,
      status: "unpaid",
    });

    //  Step 3: Send response
    res.status(201).json({
      message: "Employee and salary created successfully",
      data: { emp, salaryRecord },
    });
  } catch (err) {
    console.error("Error in addEmployee:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 4️ Update employee
export const updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true }
    );
    if (!emp) return res.status(404).json({ message: "Employee not found or unauthorized" });

    res.json({ message: "Employee updated successfully", data: emp });
  } catch (err) {
    console.error("Error in updateEmployee:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 5️ Delete employee and related salary records
export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!emp) return res.status(404).json({ message: "Employee not found or unauthorized" });

    await Salary.deleteMany({ employeeId: emp._id });

    res.json({ message: "Employee and related salary records deleted successfully" });
  } catch (err) {
    console.error("Error in deleteEmployee:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 6️ Search employees
export const searchEmployees = async (req, res) => {
  try {
    const { search } = req.query;
    let query = { createdBy: req.user._id };

    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { name: regex },
        { email: regex },
        { department: regex },
        { jobRole: regex },
        { status: regex },
      ];
      if (mongoose.isValidObjectId(search)) {
        query.$or.push({ _id: new mongoose.Types.ObjectId(search) });
      }
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 }).limit(10);
    res.json(employees);
  } catch (err) {
    console.error("Error in searchEmployees:", err);
    res.status(500).json({ message: "Server error" });
  }
};
