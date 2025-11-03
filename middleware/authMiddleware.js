import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Blacklist from "../models/Blacklist.js";

//  Auth Middleware (single, clean version)
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token is missing" });
    }

    const token = authHeader.split(" ")[1];

    //  Check if token is blacklisted
    const blacklisted = await Blacklist.findOne({ token });
    if (blacklisted) {
      return res.status(401).json({ message: "Token is invalid. Please login again." });
    }

    //  Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //  Find user from decoded token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Account deleted or unauthorized" });
    }

    console.log(" Authenticated user ID:", user._id);
    //  Attach full user info to request
    req.user = user;

    next();
  } catch (err) {
    console.error("AuthMiddleware Error:", err.message);
    return res.status(403).json({ message: "Token invalid or expired" });
  }
};

export default authMiddleware;
