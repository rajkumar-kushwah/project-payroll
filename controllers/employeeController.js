import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Salary from "../models/Salary.js";
import { v4 as uuidv4 } from "uuid";

// -------------------------------------------------------------
// GET ALL EMPLOYEES
// -------------------------------------------------------------
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 });

    res.json(employees);
  } catch (err) {
    console.error("Error in getEmployees:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------------------------------------------
// GET SINGLE EMPLOYEE
// -------------------------------------------------------------
export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(emp);
  } catch (err) {
    console.error("Error in getEmployeeById:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------------------------------------------
// ADD EMPLOYEE (AUTO EMP-ID)
// -------------------------------------------------------------
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

    // Check existing employee
    const exists = await Employee.findOne({
      $or: [{ email: email?.toLowerCase() }, { phone }],
      createdBy: req.user._id,
    });

    if (exists) {
      return res.status(400).json({ message: "Employee already exists" });
    }

    // Auto employee code
    const count = await Employee.countDocuments({ createdBy: req.user._id });
    const employeeCode = `EMP-${String(count + 1).padStart(3, "0")}`;

    // Create employee
    const emp = await Employee.create({
      employeeId: employeeCode,
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

    // Create salary record
    const salaryRecord = await Salary.create({
      salaryId: uuidv4(),
      employeeId: emp._id,
      month: new Date().toISOString().slice(0, 7),
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

    res.status(201).json({
      message: "Employee created successfully",
      data: { emp, salaryRecord },
    });

  } catch (err) {
    console.error("Error in addEmployee:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------
// UPDATE EMPLOYEE
// -------------------------------------------------------------
export const updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true }
    );

    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ message: "Employee updated", data: emp });

  } catch (err) {
    console.error("Error in updateEmployee:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------------------------------------------
// DELETE EMPLOYEE + SALARIES
// -------------------------------------------------------------
export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    await Salary.deleteMany({ employeeId: emp._id });

    res.json({ message: "Employee deleted" });

  } catch (err) {
    console.error("Error in deleteEmployee:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------------------------------------------
// SEARCH EMPLOYEES
// -------------------------------------------------------------
export const searchEmployees = async (req, res) => {
  try {
    const { search } = req.query;

    const query = {};

    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { department: regex },
        { jobRole: regex },
        { status: regex },
        { employeeCode: regex },
      ];

      // ObjectId check
      if (mongoose.isValidObjectId(search)) {
        query.$or.push({ _id: new mongoose.Types.ObjectId(search) });
      }
    }

    query.createdBy = req.user._id;

    const employees = await Employee.find(query)
      .sort({ createdAt: -1 });

    res.json(employees);

  } catch (err) {
    console.error("Error in searchEmployees:", err);
    res.status(500).json({ message: "Server error" });
  }
};
