import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Salary from "../models/Salary.js";
import { v4 as uuidv4 } from "uuid";

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

export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    res.json(emp);
  } catch (err) {
    console.error("Error in getEmployeeById:", err);
    res.status(500).json({ message: "Server error" });
  }
};

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

    const existingEmployee = await Employee.findOne({
      $or: [{ email: email?.toLowerCase() }, { phone }],
      createdBy: req.user._id, // limit to user
    });

    if (existingEmployee) {
      return res.status(400).json({ message: "Employee already exists" });
    }

    const emp = await Employee.create({
      employeeId: "EMP-" + uuidv4().slice(0, 8),
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
      message: "Employee and salary created successfully",
      data: { emp, salaryRecord },
    });
  } catch (err) {
    console.error("Error in addEmployee:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

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

    const employees = await Employee.find(query)
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(employees);
  } catch (err) {
    console.error("Error in searchEmployees:", err);
    res.status(500).json({ message: "Server error" });
  }
};
