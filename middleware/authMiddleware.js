import jwt from "jsonwebtoken";
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

    // ✅ Add this line
    req.user = decoded; // { id: ... }

    next();
  } catch (err) {
    console.error("JWT Verify Error:", err.message);
    return res.status(403).json({ message: "Token invalid or expired" });
  }
};

export default verifyToken;
