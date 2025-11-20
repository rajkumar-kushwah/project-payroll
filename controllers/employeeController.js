import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Salary from "../models/Salary.js";
import { v4 as uuidv4 } from "uuid";

// -------------------------------------------------------------
// GET ALL EMPLOYEES (ADMIN + OWNER both see company data)
// -------------------------------------------------------------
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({
      companyId: req.user.companyId,
    }).sort({ createdAt: -1 });

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
      companyId: req.user.companyId,
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
// ADD EMPLOYEE
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

    // Check existing
    const exists = await Employee.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phone: phone },
      ],
      companyId: req.user.companyId,
    });

    if (exists) {
      return res.status(400).json({ message: "Employee already exists" });
    }

    // Create employee
    const emp = await Employee.create({
      name,
      email,
      phone,
      jobRole,
      designation,
      department,
      salary,
      joinDate,
      status,
      notes,

      companyId: req.user.companyId,
      createdBy: req.user._id,
    });

    // Create Salary Record
    const salaryRecord = await Salary.create({
      salaryId: uuidv4(),
      employeeId: emp._id,
      companyId: req.user.companyId,

      month: new Date().toISOString().slice(0, 7),
      basic: emp.salary || 0,
      hra: 0,
      allowances: 0,
      deductions: 0,
      leaves: 0,
      totalWorkingDays: 30,
      netSalary: emp.salary || 0,
      status: "unpaid",
    });

    res.status(201).json({
      message: "Employee created successfully",
      data: { emp, salaryRecord },
    });
  } catch (err) {
    console.error("Error in addEmployee:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------------------------------------------
// UPDATE EMPLOYEE
// -------------------------------------------------------------
export const updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
      },
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
// DELETE EMPLOYEE + SALARY RECORDS
// -------------------------------------------------------------
export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    await Salary.deleteMany({
      employeeId: emp._id,
      companyId: req.user.companyId,
    });

    res.json({ message: "Employee deleted" });
  } catch (err) {
    console.error("Error in deleteEmployee:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------------------------------------------
// SEARCH
// -------------------------------------------------------------
export const searchEmployees = async (req, res) => {
  try {
    const { search } = req.query;

    const query = { companyId: req.user.companyId };

    if (search) {
      const regex = { $regex: search, $options: "i" };

      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { department: regex },
        { jobRole: regex },
        { employeeCode: regex },
        { status: regex },
      ];

      // If ID entered
      if (mongoose.isValidObjectId(search)) {
        query.$or.push({ _id: new mongoose.Types.ObjectId(search) });
      }
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });

    res.json(employees);
  } catch (err) {
    console.error("Error in searchEmployees:", err);
    res.status(500).json({ message: "Server error" });
  }
};
