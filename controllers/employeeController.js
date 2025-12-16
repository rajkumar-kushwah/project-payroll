import Employee from "../models/Employee.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// -------------------------------------------------------------------
// GET ALL EMPLOYEES
// -------------------------------------------------------------------
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ companyId: req.user.companyId }).sort({ createdAt: -1 });
    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// GET SINGLE EMPLOYEE
// -------------------------------------------------------------------
export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.json({ success: true, emp });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// ADD EMPLOYEE
// -------------------------------------------------------------------
export const addEmployee = async (req, res) => {
  try {
    const {
      name, email, phone, dob, jobRole, department,
      designation, joinDate, status, basicSalary, notes, password
    } = req.body;

    // Check duplicates
    const exists = await Employee.findOne({
      $or: [{ email: email?.toLowerCase() }, { phone }],
      companyId: req.user.companyId,
    });
    if (exists) return res.status(400).json({ message: "Employee already exists" });

    // Avatar
    let avatar = "";
    if (req.file?.path) avatar = req.file.path;

    // Inside addEmployee controller
let hashedPassword = password;
if (password) {
  const salt = await bcrypt.genSalt(10);
  hashedPassword = await bcrypt.hash(password, salt);
}
    // Create Employee
    const emp = await Employee.create({
      name,
      email: email.toLowerCase(),
      phone,
      dateOfBirth: dob ? new Date(dob) : undefined,
      jobRole,
      department,
      designation,
      joinDate: joinDate ? new Date(joinDate) : Date.now(),
      basicSalary: Number(basicSalary) || 0,
      status: status || "active",
      notes,
      avatar,
      companyId: req.user.companyId,
      createdBy: req.user._id,
      password: hashedPassword, // password set by HR
    });

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      emp,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// UPDATE EMPLOYEE
// -------------------------------------------------------------------
export const updateEmployeeProfile = async (req, res) => {
  try {
    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    });

    if (req.file?.path) updateData.avatar = req.file.path;

    if (updateData.joinDate) updateData.joinDate = new Date(updateData.joinDate);
    if (updateData.dob) updateData.dateOfBirth = new Date(updateData.dob);

    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      updateData,
      { new: true }
    );

    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.json({ success: true, message: "Updated successfully", emp });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// DELETE EMPLOYEE
// -------------------------------------------------------------------
export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.json({ success: true, message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// SEARCH EMPLOYEES
// -------------------------------------------------------------------
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

      if (mongoose.isValidObjectId(search)) query.$or.push({ _id: new mongoose.Types.ObjectId(search) });
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: employees.length, employees });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// FILTER EMPLOYEES
// -------------------------------------------------------------------
export const filterEmployees = async (req, res) => {
  try {
    const { jobRole, department, minSalary, maxSalary, sort } = req.query;
    const query = { companyId: req.user.companyId };

    if (jobRole) query.jobRole = jobRole;
    if (department) query.department = department;

    if (minSalary || maxSalary) {
      query.basicSalary = {};
      if (minSalary) query.basicSalary.$gte = Number(minSalary);
      if (maxSalary) query.basicSalary.$lte = Number(maxSalary);
    }

    let employees = await Employee.find(query);

    // Sorting
    if (sort === "a-z") employees = employees.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "salary-high") employees = employees.sort((a, b) => b.basicSalary - a.basicSalary);
    else if (sort === "latest") employees = employees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: employees.length, employees });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


