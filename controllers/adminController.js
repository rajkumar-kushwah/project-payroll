import User from "../models/User.js";
import Company from "../models/Company.js";

// Add new user
export const addUser = async (req, res) => {
  try {
    const owner = req.user;
    if (owner.role !== "owner") 
      return res.status(403).json({ message: "Only owner can add users" });

    const { name, email, password, role } = req.body;
    const newUser = await User.create({
      name,
      email,
      password,
      role,
      companyId: owner.companyId,
      emailVerified: true, // ✅ Auto-verify email
      status: "active",    // ✅ Set status to active immediately
    });

    res.status(201).json({ message: "User added", user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Promote to admin
export const addAdmin = async (req, res) => {
  try {
    const owner = req.user;
    const { userId } = req.params;

    const company = await Company.findById(owner.companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    if (company.ownerId.toString() !== owner._id.toString())
      return res.status(403).json({ message: "Only owner can add admins" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (company.admins.includes(userId)) return res.status(400).json({ message: "User already admin" });

    company.admins.push(userId);
    await company.save();

    user.role = "admin";
    await user.save();

    res.status(200).json({ message: "User promoted to admin", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Demote admin
export const removeAdmin = async (req, res) => {
  try {
    const owner = req.user;
    const { adminId } = req.params;

    const company = await Company.findById(owner.companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    company.admins = company.admins.filter(a => a.toString() !== adminId);
    await company.save();

    const admin = await User.findById(adminId);
    if (admin) {
      admin.role = "user";
      await admin.save();
    }

    res.status(200).json({ message: "Admin demoted to user" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Fetch all users for dashboard including existing admins
export const getAdminDashboardData = async (req, res) => {
  try {
    const owner = req.user;
    const users = await User.find({ companyId: owner.companyId, isDeleted: false });

    res.json({ users }); // frontend will filter by role
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
