import User from "../models/User.js";
import Company from "../models/Company.js";
import Employee from "../models/Employee.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// 🔹 Add new user (Owner only)
export const addUser = async (req, res) => {
  try {
    if (req.user.role !== "owner")
      return res.status(403).json({ message: "Only owner can add users" });

    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      companyId: req.user.companyId,
      emailVerified: true,
      status: "active",
    });

    res.status(201).json({ message: "User added successfully", user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Toggle User Role / Status (Owner only)
export const toggleUserRoleStatus = async (req, res) => {
  try {
    const { newRole } = req.body;
    const { userId } = req.params;
    const loginUser = req.user;

    if (loginUser.role !== "owner")
      return res.status(403).json({ message: "Only owner can modify roles" });

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user ID" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "owner")
      return res.status(400).json({ message: "Owner cannot be modified" });

    const company = await Company.findById(loginUser.companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    company.admins = company.admins || [];

    if (newRole === "admin") {
      user.role = "admin";
      user.status = "active";
      if (!company.admins.includes(user._id)) company.admins.push(user._id);
    } else if (newRole === "user") {
      user.role = "user";
      user.status = "inactive";
      company.admins = company.admins.filter(id => id.toString() !== user._id.toString());
    } else if (newRole === "employee") {
      user.role = "employee";
      user.status = "active";
      company.admins = company.admins.filter(id => id.toString() !== user._id.toString());
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    await user.save();
    await company.save();

    res.json({
      success: true,
      message: `User role updated to ${user.role} and status to ${user.status}`,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Fetch all users (Admin / Owner)
export const getAdminDashboardData = async (req, res) => {
  try {
    if (!["owner", "admin"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    const users = await User.find({
      companyId: req.user.companyId,
      isDeleted: false,
      role: { $in: ["admin", "user", "employee"] },
    }).select("-password");

    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Delete User
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "owner")
      return res.status(400).json({ message: "Owner cannot be deleted" });

    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Promote Employee → Admin
export const promoteEmployeeToAdmin = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only owner can promote" });
    }

    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // Ab userId dependency remove kiya, direct employee reference
    employee.isAdmin = true;

    await employee.save();

    res.json({
      success: true,
      message: "Employee promoted to admin successfully",
    });
  } catch (err) {
    console.error("PROMOTE ERROR 👉", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Get Employees List
export const getEmployees = async (req, res) => {
  try {
    const query = {
      companyId: req.user.companyId,
      isDeleted: false,
    };

    if (req.query.onlyEmployees === "true") {
      query.isAdmin = false;
    }

    const employees = await Employee.find(query);

    res.json({
      success: true,
      employees,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
