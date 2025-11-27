
import User from "../models/User.js";
import Company from "../models/Company.js";
import bcrypt from "bcryptjs";

// Add new user (Owner only)
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

//  Single Toggle (Promote/Demote + Activate/Deactivate)
export const toggleUserRoleStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const loginUser = req.user;
    if (loginUser.role !== "owner")
      return res.status(403).json({ message: "Only owner can modify roles" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "owner")
      return res.status(400).json({ message: "Owner cannot be modified" });

    // Find company
    const company = await Company.findById(loginUser.companyId);
    if (!company)
      return res.status(404).json({ message: "Company not found" });

    // --- TOGGLE LOGIC ---
    if (user.role === "admin") {
      user.role = "user";
      user.status = "inactive";

      // Remove from company admins[]
      company.admins = company.admins.filter(
        (id) => id.toString() !== user._id.toString()
      );

    } else {
      user.role = "admin";
      user.status = "active";

      // Add to company admins[]
      if (!company.admins.includes(user._id)) {
        company.admins.push(user._id);
      }
    }

    await user.save();
    await company.save();

    res.json({
      success: true,
      message: "User role updated + Company updated",
      user,
      company,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Fetch all users
export const getAdminDashboardData = async (req, res) => {
  try {
    if (!["owner", "admin"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    const users = await User.find({
      companyId: req.user.companyId,
      isDeleted: false,
    }).select("-password");

    res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete user
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
