import jwt from "jsonwebtoken";
import User from "../models/User.js"; 
import Blacklist from "../models/Blacklist.js";  

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token is missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const blacklisted = await Blacklist.findOne({ token });
    if (blacklisted) {
      return res.status(401).json({ message: "Token is invalid. Please login again." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add this line
    req.user = decoded; // { id: ... }

    next();
  } catch (err) {
    console.error("JWT Verify Error:", err.message);
    return res.status(403).json({ message: "Token invalid or expired" });
  }
};

// Middleware deleted account user verification

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Account deleted or unauthorized" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("AuthMiddleware Error:", err.message);
    res.status(401).json({ message: "Unauthorized" });
  }
};

export default verifyToken;
