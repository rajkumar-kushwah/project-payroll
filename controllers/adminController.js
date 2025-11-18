import User from "../models/User.js";
import Company from "../models/Company.js";

// Promote user to admin
// =======================
export const addAdmin = async (req, res) => {
  try {
    const owner = req.user; // Must be the company owner
    const { userId } = req.params;

    const company = await Company.findById(owner.companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    if (company.ownerId.toString() !== owner._id.toString())
      return res.status(403).json({ message: "Only owner can add admins" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.companyId?.toString() !== company._id.toString())
      return res.status(400).json({ message: "User does not belong to your company" });

    if (company.admins.includes(userId))
      return res.status(400).json({ message: "User is already an admin" });

    // Add to company admins
    company.admins.push(userId);
    console.log("Before saving company admins:", company.admins);
    await company.save();
    console.log("Company saved");

    // Update user role
    user.role = "admin";
    user.isDeleted = false; // restore if needed
    console.log("Before saving user role:", user.role);
    await user.save();
    console.log("User saved");

 
    // await sendInfoEmail(user.email, "Role Update", "You have been promoted to admin.");

    res.status(200).json({ message: "User promoted to admin successfully", userId: user._id });
  } catch (err) {
    console.error("Add Admin Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// Remove admin → downgrade to user
// =======================
export const removeAdmin = async (req, res) => {
  try {
    const owner = req.user; // Must be the company owner
    const { adminId } = req.params;

    const company = await Company.findById(owner.companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    if (company.ownerId.toString() !== owner._id.toString())
      return res.status(403).json({ message: "Only owner can remove admins" });

    if (!company.admins.includes(adminId))
      return res.status(400).json({ message: "Admin not found in your company" });

    const admin = await User.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Downgrade role to user
    admin.role = "user";
    await admin.save();

    // Remove from company admins array
    company.admins = company.admins.filter(a => a.toString() !== adminId);
    await company.save();

    // Optional: send email notification
    // await sendInfoEmail(admin.email, "Role Update", "Your admin access has been revoked.");

    res.json({ message: "Admin downgraded to user successfully" });
  } catch (err) {
    console.error("Remove Admin Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
