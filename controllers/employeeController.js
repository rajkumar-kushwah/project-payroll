import Employee from "../models/Employee.js";
import mongoose from "mongoose";

// -------------------------------------------------------------------
// GET ALL EMPLOYEES
// -------------------------------------------------------------------
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({
      companyId: req.user.companyId,
    }).sort({ createdAt: -1 });

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
    const emp = await Employee.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.json({ success: true, emp });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// ADD EMPLOYEE (Salary auto-generate nahi hoti)
// -------------------------------------------------------------------
export const addEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      jobRole,
      department,
      designation,
      joinDate,
      status,
      notes,
    } = req.body;

    const exists = await Employee.findOne({
      $or: [{ email: email?.toLowerCase() }, { phone }],
      companyId: req.user.companyId,
    });

    if (exists)
      return res.status(400).json({ message: "Employee already exists" });

    // Cloudinary upload
    let avatar = "";
    if (req.file) {
      avatar = req.file.path || req.file.secure_url || ""; // ✅ Cloudinary safe check
    }

    const emp = await Employee.create({
      name,
      email,
      phone,
      jobRole,
      department,
      designation,
      joinDate,
      status,
      notes,
      avatar, // save Cloudinary URL
      companyId: req.user.companyId,
      createdBy: req.user._id,
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
export const updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );

    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.json({ success: true, message: "Updated successfully", emp });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// DELETE EMPLOYEE
// -------------------------------------------------------------------
export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

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

      if (mongoose.isValidObjectId(search)) {
        query.$or.push({ _id: new mongoose.Types.ObjectId(search) });
      }
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });

    res.json({ success: true, employees });
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
      query.salary = {};
      if (minSalary) query.salary.$gte = Number(minSalary);
      if (maxSalary) query.salary.$lte = Number(maxSalary);
    }

    let employees = await Employee.find(query);

    // SORTING
    if (sort === "a-z") {
      employees = employees.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    } else if (sort === "salary-high") {
      employees = employees.sort((a, b) => b.salary - a.salary);
    } else if (sort === "latest") {
      employees = employees.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    res.json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const createEmployeeProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      jobRole,
      department,
      designation,
      joinDate,
      status,
      notes,
    } = req.body;

    // Check if employee already exists
    const exists = await Employee.findOne({
      $or: [{ email: email?.toLowerCase() }, { phone }],
      companyId: req.user.companyId,
    });

    if (exists)
      return res.status(400).json({ message: "Employee already exists" });

    // Avatar upload
    let avatar = "";
    if (req.file && req.file.path) {
      avatar = req.file.path; // Cloudinary URL
    }

    const emp = await Employee.create({
      name,
      email,
      phone,
      jobRole,
      department,
      designation,
      joinDate,
      status,
      notes,
      avatar, // save avatar URL
      companyId: req.user.companyId,
      createdBy: req.user._id,
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

export const updateEmployeeProfile = async (req, res) => {
  try {
    // Build update object safely
    const updateData = {};
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    });

    if (req.file && req.file.path) {
      updateData.avatar = req.file.path;
    }

    // Convert joinDate to Date type if present
    if (updateData.joinDate) {
      updateData.joinDate = new Date(updateData.joinDate);
    }

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


