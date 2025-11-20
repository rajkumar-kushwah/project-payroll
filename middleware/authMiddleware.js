// import jwt from "jsonwebtoken";
// import User from "../models/User.js";
// import Blacklist from "../models/Blacklist.js";

// //  Auth Middleware (Protect)
// export const protect = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ message: "Token is missing" });
//     }

//     const token = authHeader.split(" ")[1];

//     //  Check blacklist
//     const blacklisted = await Blacklist.findOne({ token });
//     if (blacklisted) {
//       return res.status(401).json({ message: "Token is invalid. Please login again." });
//     }

//     //  Verify JWT
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     //  Get user from DB
//     const user = await User.findById(decoded.id).select("-password");
//     if (!user) {
//       return res.status(401).json({ message: "Account deleted or unauthorized" });
//     }

//     //  Attach user data to request
//     req.user = user;
//     next();
//   } catch (err) {
//     console.error("AuthMiddleware Error:", err.message);
//     return res.status(403).json({ message: "Token invalid or expired" });
//   }
// };

// export const adminProtect = (req, res, next) => {
//   if (!req.user) return res.status(401).json({ message: "Not logged in" });
//   if (req.user.role !== "admin" && req.user.role !== "owner") {
//     return res.status(403).json({ message: "Admin access required" });
//   }
//   next();
// };

// export const ownerProtect = (req, res, next) => {
//   if (!req.user) return res.status(401).json({ message: "Not logged in" });
//   if (req.user.role !== "owner") {
//     return res.status(403).json({ message: "Owner access required" });
//   }
//   next();
// };


import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Blacklist from "../models/Blacklist.js";

// Protect all routes
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ message: "Token missing" });

    const token = authHeader.split(" ")[1];

    const blacklisted = await Blacklist.findOne({ token });
    if (blacklisted) return res.status(401).json({ message: "Token invalid. Login again." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "Account deleted or unauthorized" });

    req.user = user;
    next();
  } catch (err) {
    console.error("AuthMiddleware Error:", err.message);
    return res.status(403).json({ message: "Token invalid or expired" });
  }
};

// Admin + Owner protect
export const adminProtect = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not logged in" });
  if (!["admin", "owner"].includes(req.user.role)) return res.status(403).json({ message: "Admin access required" });
  next();
};

// Owner only protect
export const ownerProtect = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not logged in" });
  if (req.user.role !== "owner") return res.status(403).json({ message: "Owner access required" });
  next();
};
