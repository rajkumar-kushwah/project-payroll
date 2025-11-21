import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Salary from "../models/Salary.js";
import { v4 as uuidv4 } from "uuid";

// ------------------------------------------
// GET ALL EMPLOYEES
// ------------------------------------------
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ companyId: req.user.companyId }).sort({ createdAt: -1 });
    res.json({ success: true, count: employees.length, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ------------------------------------------
// GET SINGLE EMPLOYEE
// ------------------------------------------
export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });
    res.json({ success: true, data: emp });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ------------------------------------------
// ADD EMPLOYEE + CREATE INITIAL SALARY
// ------------------------------------------
export const addEmployee = async (req, res) => {
  try {
    const {
      name, email, phone, jobRole, joinDate, department, designation, salary, status, notes
    } = req.body;

    // Check if employee exists by email or phone
    const exists = await Employee.findOne({
      $or: [{ email: email?.toLowerCase() }, { phone }],
      companyId: req.user.companyId
    });
    if (exists) return res.status(400).json({ success: false, message: "Employee already exists" });

    const basicSalary = Number(salary) || 0;

    // Create employee
    const emp = await Employee.create({
      name,
      email: email?.toLowerCase(),
      phone,
      jobRole,
      designation,
      department,
      salary: basicSalary,
      joinDate: joinDate || new Date().toISOString(),
      status: status || "active",
      notes: notes || "",
      companyId: req.user.companyId,
      createdBy: req.user._id
    });

    // Create initial salary record
    const salaryRecord = await Salary.create({
      salaryId: uuidv4(),
      employeeId: emp._id,
      companyId: req.user.companyId,
      month: new Date().toISOString().slice(0, 7), // YYYY-MM
      basic: basicSalary,
      hra: 0,
      allowances: 0,
      deductions: 0,
      leaves: 0,
      totalWorkingDays: 30,
      netSalary: basicSalary,
      status: "unpaid",
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, message: "Employee created", data: { emp, salaryRecord } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ------------------------------------------
// UPDATE EMPLOYEE
// ------------------------------------------
export const updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });
    res.json({ success: true, message: "Employee updated", data: emp });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ------------------------------------------
// DELETE EMPLOYEE + SALARY RECORDS
// ------------------------------------------
export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });

    // Delete all salary records for this employee
    await Salary.deleteMany({ employeeId: emp._id, companyId: req.user.companyId });

    res.json({ success: true, message: "Employee and salary records deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ------------------------------------------
// SEARCH EMPLOYEES
// ------------------------------------------
export const searchEmployees = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { companyId: req.user.companyId };

    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { name: regex }, { email: regex }, { phone: regex },
        { department: regex }, { jobRole: regex }, { employeeCode: regex },
        { status: regex }
      ];
      if (mongoose.isValidObjectId(search)) query.$or.push({ _id: new mongoose.Types.ObjectId(search) });
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: employees.length, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ------------------------------------------
// FILTER EMPLOYEES
// ------------------------------------------
export const filterEmployees = async (req, res) => {
  try {
    const { jobRole, department, minSalary, maxSalary, sort } = req.query;
    const query = { companyId: req.user.companyId };

    if (jobRole) query.jobRole = jobRole;
    if (department) query.department = department;
    if (minSalary) query.salary = { ...query.salary, $gte: Number(minSalary) };
    if (maxSalary) query.salary = { ...query.salary, $lte: Number(maxSalary) };

    let employees = await Employee.find(query);

    // Sorting
    if (sort === "a-z") employees = employees.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "salary-high") employees = employees.sort((a, b) => b.salary - a.salary);
    else if (sort === "latest") employees = employees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: employees.length, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
