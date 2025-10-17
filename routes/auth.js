import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Blacklist from "../models/Blacklist.js";
import verifyToken,{authMiddleware} from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';
import { sendOtpEmail } from '../utils/sendEmail.js';
import {sendInfoEmail ,sendLoginEmail ,sendLogoutEmail,sendDeleteEmail } from '../utils/sendEmail.js';


import moment from "moment-timezone";



const router = express.Router();

// utils
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashData = (data) => crypto.createHash('sha256').update(data).digest('hex');

// Email validators
// const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
const strictEmailRule = (email) => /^[A-Za-z]+[0-9]+@[A-Za-z0-9]+\.[A-Za-z]{2,}$/.test(email);

// Generate random token
const generateToken = () => crypto.randomBytes(20).toString("hex");

// ===== REGISTER =====
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone)
      return res.status(400).json({ message: "All fields required" });

    if (!strictEmailRule(email))
      return res.status(400).json({ message: "Email must be like name123@example.com" });

    const phoneRegex = /^(\+91)?[6-9][0-9]{9}$/;
    if (!phoneRegex.test(phone))
      return res.status(400).json({ message: "Invalid phone number format" });

    if (await User.findOne({ email: email.toLowerCase(), isDeleted: false }))
      return res.status(400).json({ message: "Email already registered" });

    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
    if (await User.findOne({ phone: formattedPhone }))
      return res.status(400).json({ message: "Phone already registered" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const token = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: formattedPhone,
      emailVerified: true, // auto-verify email
      emailVerificationToken: undefined,
      emailVerificationExpiry: undefined,
      phoneVerified: false,
      createdByIP: req.ip,
      isDeleted: false,
    });

    await newUser.save();

    const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress || 'Unknown';

    try {
      console.log("Sending info email to:", newUser.email);
      await sendInfoEmail(newUser.name, newUser.email, ip, req.headers['user-agent'], newUser._id);
      console.log("Info email sent successfully!");
    } catch (err) {
      console.error("Email failed but registration successful:", err.message);
    }

    res.status(201).json({
      message: "Registered successfully. Email auto-verified.",
      userId: newUser._id,
      token
    });

  } catch (err) {
    console.error("Register router error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// router.post("/register", async (req, res) => {
//   try {
//     const { name, email, password, phone } = req.body;

//     // 1. Basic validations
//     if (!name || !email || !password || !phone)
//       return res.status(400).json({ message: "All fields required" });

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email))
//       return res.status(400).json({ message: "Invalid email format" });

//     const phoneRegex = /^(\+91)?[6-9][0-9]{9}$/;
//     if (!phoneRegex.test(phone))
//       return res.status(400).json({ message: "Invalid phone number" });

//     // 2. Check existing user
//     const existingEmail = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
//     if (existingEmail)
//       return res.status(400).json({ message: "Email already registered" });

//     const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
//     const existingPhone = await User.findOne({ phone: formattedPhone });
//     if (existingPhone)
//       return res.status(400).json({ message: "Phone already registered" });

//     // 3. Hash password
//     const hashedPassword = await bcrypt.hash(password, 10); // faster than 12

//     // 4. Create user
//     const newUser = new User({
//       name,
//       email: email.toLowerCase(),
//       password: hashedPassword,
//       phone: formattedPhone,
//       emailVerified: true, // auto-verify
//       phoneVerified: false,
//       isDeleted: false,
//       createdByIP: req.ip,
      
//     });

//     await newUser.save();

//     // 5. Send info email async
//     (async () => {
//       try {
//         await sendInfoEmail(
//           newUser.name,
//           newUser.email,
//           req.headers["x-forwarded-for"]?.split(",").shift() || req.socket?.remoteAddress || "Unknown",
//           req.headers["user-agent"],
//           newUser._id
//         );
//       } catch (err) {
//         console.error("Info email error:", err.message);
//       }
//     })();

//     // 6. Generate token
//     const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

//     res.status(201).json({
//       message: "Registered successfully",
//       token,
//       user: {
//         id: newUser._id,
//         name: newUser.name,
//         email: newUser.email,
//         phone: newUser.phone,
//       },
//     });

//   } catch (err) {
//     console.error("Register error:", err.message);
//     res.status(500).json({ message: "Server error" });
//   }
// });




// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password)
//       return res.status(400).json({ message: "Email and password required" });

//     const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
//     if (!user) return res.status(404).json({ message: "Account not registered" });

//     if (!user.emailVerified)
//       return res.status(400).json({ message: "Email not verified" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

//     // Update last login
//     user.lastLogin = new Date();
//     await user.save();

//     // Send login email async
//     (async () => {
//       try {
//         await sendLoginEmail(
//           user.name,
//           user.email,
//           req.headers["x-forwarded-for"]?.split(",").shift() || req.socket?.remoteAddress || "Unknown",
//           req.headers["user-agent"]
//         );
//       } catch (err) {
//         console.error("Login email error:", err.message);
//       }
//     })();

//     // Generate JWT token
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

//     // Format timestamps
//     const lastLoginIST = user.lastLogin
//       ? moment(user.lastLogin).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A")
//       : null;

//     res.status(200).json({
//       message: "Login successful",
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         lastLogin: lastLoginIST,
//       },
//     });

//   } catch (err) {
//     console.error("Login error:", err.message);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// Login (email must be verified)

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "Account not registered." });
    }

    //  Email verification check
    if (!user.emailVerified) {
      return res.status(400).json({ message: "Email not verified. Please check your inbox." });
    }

    //  Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password." });
    }

    // Capture IP safely
    const ip =
      req.headers["x-forwarded-for"]?.split(",").shift() ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      "Unknown";

    //  Send login notification email (fail-safe)
    try {
      await sendLoginEmail(user.name, user.email, ip, req.headers["user-agent"]);
    } catch (emailErr) {
      console.error("Login email sending failed:", emailErr.message);
      // Don't block login if email fails
    }

    //  Update last login time
    user.lastLogin = new Date();
    await user.save();

    //  Generate token (check env)
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET missing in .env");
      return res.status(500).json({ message: "Server configuration error." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    //  Format timestamps
    const registeredAt = moment(user.createdAt)
      .tz("Asia/Kolkata")
      .format("DD/MM/YYYY hh:mm:ss A");
    const updatedAt = moment(user.updatedAt)
      .tz("Asia/Kolkata")
      .format("DD/MM/YYYY hh:mm:ss A");
    const lastLoginIST = user.lastLogin
      ? moment(user.lastLogin)
          .tz("Asia/Kolkata")
          .format("DD/MM/YYYY hh:mm:ss A")
      : null;

    //  Send response
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        registeredAt,
        updatedAt,
        lastLogin: lastLoginIST,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message, err.stack);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});




// ===== VERIFY LOGIN OTP =====



//  Logout (secure)
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    // Verify token to get user id
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });


    // token blacklist me dal do
    await Blacklist.create({ token });

    // IP capture
    const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress || req.connection?.remoteAddress || 'Unknown';

    // Send logout email
    await sendLogoutEmail(user.name, user.email, ip, req.headers['user-agent']);

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});


//  Send OTP (email only)
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    const hashedOtp = hashData(otp);

    user.resetPasswordOTP = hashedOtp;
    user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendOtpEmail(user.email, otp);

    res.json({ message: `OTP sent to email` });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});


//  Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.resetPasswordOTP || user.otpExpire < Date.now()) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    const hashedOtp = hashData(otp);
    if (user.resetPasswordOTP !== hashedOtp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    //  OTP verified → issue reset token
    const resetToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    // Clear OTP once verified
    user.resetPasswordOTP = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.json({ message: "OTP verified successfully", resetToken });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


//  Reset Password
router.post("/reset-password", async (req, res) => {
  const { email, newPassword, resetToken } = req.body;

  try {
    //  Verify resetToken
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    if (!decoded || decoded.email !== email) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password reset successfully ✅" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ======================= PROTECTED ROUTES =======================

//  Example: Get Profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});



//  Update Profile with avatar

// router.put("/profile", verifyToken, uploads.single("avatar"), async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { name, email, phone, bio, gender, dateofBirth, address } = req.body;

//     // Parse address if sent as string
//     let addressData = {};
//     try {
//       addressData = typeof address === "string" ? JSON.parse(address) : address;
//     } catch (err) {
//       addressData = {};
//     }

//     const updateData = {
//       name,
//       email,
//       phone,
//       bio,
//       gender,
//       dateofBirth,
//       address: addressData,
//       updatedAt: Date.now(),
//     };

//     // Add avatar URL if file uploaded
//     if (req.file) {
//       updateData.avatar = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
//     }

//     const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

//     if (!updatedUser) return res.status(404).json({ message: "User not found" });

//     res.json({ message: "Profile updated successfully", user: updatedUser });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });


router.put("/profile", authMiddleware, upload.single("avatar"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, phone, bio, gender, dateofBirth, address,role } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (bio) user.bio = bio;
    if (gender) user.gender = gender;
    if (dateofBirth) user.dateofBirth = new Date(dateofBirth);
   if (address) {
  user.address = typeof address === "string" ? JSON.parse(address) : address;
}

  // Check if user has never updated role
  if (role) {
      // Only allow if roleUpdated not set
      if (!user.roleUpdated) {
        user.role = role.toLowerCase().trim();
        user.roleUpdated = true; // mark it so user cannot change again
      } else {
        return res.status(403).json({ message: "Role can only be updated once" });
      }
    }

    if (req.file && req.file.path) user.avatar = req.file.path;

    await user.save();
    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



//===================== DELETE USER ======================

// DELETE account
router.delete("/delete-account", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    // IP capture
    const ip = req.headers['x-forwarded-for']?.split(',').shift()
            || req.socket?.remoteAddress
            || req.connection?.remoteAddress
            || 'Unknown';

    // Send delete confirmation email (errors logged but don't block)
    try {
      await sendDeleteEmail(user.name, user.email, ip, req.headers['user-agent']);
    } catch(err) {
      console.error("Delete Email Error:", err.message);
    }

    // Delete user
    await User.findByIdAndDelete(user._id);

    return res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete Account Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
