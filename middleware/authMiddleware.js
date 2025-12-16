import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Blacklist from "../models/Blacklist.js";

// =======================
// PROTECT ROUTES
// =======================
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ message: "Token missing" });

    const token = authHeader.split(" ")[1];

    // Check blacklist
    const blacklisted = await Blacklist.findOne({ token });
    if (blacklisted)
      return res.status(401).json({ message: "Token invalid. Login again." });

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // DB check
    const user = await User.findById(decoded.id)
      .select("_id role companyId employeeId status isDeleted");

    if (!user || user.isDeleted || user.status !== "active") {
      return res.status(401).json({ message: "Account inactive or deleted" });
    }

    // Standardized user object for controllers
    req.user = {
      _id: user._id,
      role: user.role,
      companyId: user.companyId,
      employeeId: user.employeeId || null,
    };

    next();
  } catch (err) {
    console.error("AuthMiddleware Error:", err.message);
    return res.status(403).json({ message: "Token invalid or expired" });
  }
};

// =======================
// ROLE BASED PROTECT
// =======================
export const adminProtect = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not logged in" });
  if (!["admin", "owner"].includes(req.user.role))
    return res.status(403).json({ message: "Admin access required" });
  next();
};

export const ownerProtect = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not logged in" });
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Owner access required" });
  next();
};

// =======================
// EMPLOYEE PROTECT
// =======================
export const employeeProtect = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not logged in" });
  if (req.user.role !== "employee")
    return res.status(403).json({ message: "Employee access only" });
  next();
};
