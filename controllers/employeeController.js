import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Salary from "../models/Salary.js";

//  Get all employees (only those created by logged-in user)
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

//  Get employee by ID (only if created by logged-in user)
export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    res.json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

//  Add new employee (store createdBy)
export const addEmployee = async (req, res) => {
  try {
    const emp = await Employee.create({
      ...req.body,
      createdBy: req.user._id, // logged-in user
    });

    // Auto-create salary record
    const salary = await Salary.create({
      EmployeeId: emp._id,
      month: new Date().toISOString().slice(0, 7),
      baseSalary: emp.salary || 0,
      bonus: 0,
      deductions: 0,
      leaves: 0,
      netPay: emp.salary || 0,
    });

    res.status(201).json({
      message: "Employee added successfully",
      data: { emp, salary },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

//  Update employee (only if created by logged-in user)
export const updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true }
    );

    if (!emp) return res.status(404).json({ message: "Employee not found or unauthorized" });
    res.json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

//  Delete employee (only if created by logged-in user)
export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!emp) return res.status(404).json({ message: "Employee not found or unauthorized" });

    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

//  Search employees (only from logged-in user's data)
export const searchEmployees = async (req, res) => {
  try {
    const { search } = req.query;
    let query = { createdBy: req.user._id };

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
        { jobrole: searchRegex },
        { status: searchRegex },
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
