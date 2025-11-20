import Salary from "../models/Salary.js";
import Employee from "../models/Employee.js";
import { v4 as uuidv4 } from "uuid";

// 1️ Get all salaries of an employee (company-based)
export const getSalariesByEmployee = async (req, res) => {
  try {
    const salaries = await Salary.find({
      employeeId: req.params.employeeId,
      companyId: req.user.companyId,   // ✔ company based data
    });

    if (!salaries.length)
      return res.status(404).json({ message: "No salaries found" });

    res.json(salaries);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2️⃣ Get Salary By ID
export const getSalaryById = async (req, res) => {
  try {
    const salary = await Salary.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    }).populate("employeeId", "name email department jobRole");

    if (!salary)
      return res.status(404).json({ message: "Salary record not found" });

    res.json(salary);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// 3️ Add Salary
export const addSalary = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      basic,
      hra,
      allowances,
      deductions,
      leaves,
      totalWorkingDays
    } = req.body;

    // Employee MUST belong to same company
    const emp = await Employee.findOne({
      _id: employeeId,
      companyId: req.user.companyId
    });

    if (!emp)
      return res.status(403).json({ message: "Employee not found or unauthorized" });

    const exists = await Salary.findOne({
      employeeId,
      month,
      companyId: req.user.companyId,
    });

    if (exists)
      return res.status(400).json({ message: "Salary for this month already exists" });

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
      companyId: req.user.companyId,   // ✔ Important
      createdBy: req.user._id,
      status: "unpaid",
    });

    res.status(201).json({ message: "Salary created successfully", data: salary });

  } catch (err) {
    res.status(500).json({ message: "Error adding salary", error: err.message });
  }
};

// 4️ Mark Salary Paid
export const markSalaryPaid = async (req, res) => {
  try {
    const salary = await Salary.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!salary)
      return res.status(404).json({ message: "Salary not found" });

    if (salary.status === "paid")
      return res.status(400).json({ message: "Already paid" });

    salary.status = "paid";
    salary.paidOn = new Date();

    await salary.save();

    res.json({ message: "Salary marked as paid", data: salary });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// 5️ Delete Salary
export const deleteSalary = async (req, res) => {
  try {
    const salary = await Salary.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!salary)
      return res.status(404).json({ message: "Salary not found" });

    res.json({ message: "Salary deleted" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// 6️ Filter Salaries (month / status / employee)
export const filterSalaries = async (req, res) => {
  try {
    const { month, status, employeeId } = req.query;

    const filter = {
      companyId: req.user.companyId,
    };

    if (month) filter.month = month;
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;

    const salaries = await Salary.find(filter)
      .populate("employeeId", "name email department jobRole")
      .sort({ createdAt: -1 });

    res.json(salaries);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// 7️ Update Salary
export const updateSalary = async (req, res) => {
  try {
    const updated = await Salary.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.user.companyId,
      },
      req.body,
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Salary not found or forbidden" });

    res.json({
      message: "Salary updated successfully",
      data: updated,
    });

  } catch (err) {
    res.status(500).json({ message: "Error updating salary" });
  }
};
