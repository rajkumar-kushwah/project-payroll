import Employee from "../models/Employee.js";
import User from "../models/User.js";

// Dashboard Controller → Only Admin + Owner
export const adminDashboardController = async (req, res) => {
  try {
    const employeesCount = await Employee.countDocuments();
    const adminsCount = await User.countDocuments({ role: "admin" });

    res.json({
      employees: employeesCount,
      admins: adminsCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
