import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto, { verify } from 'crypto';
import User from '../models/User.js';
import Blacklist from "../models/Blacklist.js";
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';
import { sendOtpEmail } from '../utils/sendEmail.js';
import {sendInfoEmail,sendLoginEmail  } from '../utils/sendEmail.js';

// ,sendLoginEmail ,sendLogoutEmail,sendDeleteEmail
import moment from "moment-timezone";
import axios from 'axios';
import Employee from '../models/Employee.js';
import Salary from '../models/Salary.js';
import Company from '../models/Company.js';


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



// router.post("/register", async (req, res) => {
//   try {
//     const { name, email, password, phone, companyName, role } = req.body;

//     if (!name || !email || !password || !phone || !companyName || !role)
//       return res.status(400).json({ message: "All fields required" });

//     if (!strictEmailRule(email))
//       return res.status(400).json({ message: "Email must be like name123@example.com" });

//     const phoneRegex = /^(\+91)?[6-9][0-9]{9}$/;
//     if (!phoneRegex.test(phone))
//       return res.status(400).json({ message: "Invalid phone number format" });

//     if (await User.findOne({ email: email.toLowerCase(), isDeleted: false }))
//       return res.status(400).json({ message: "Email already registered" });

//     const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
//     if (await User.findOne({ phone: formattedPhone }))
//       return res.status(400).json({ message: "Phone already registered" });

//     const hashedPassword = await bcrypt.hash(password, 12);
//     const token = crypto.randomBytes(32).toString("hex");

//     const newUser = new User({
//       name,
//       email: email.toLowerCase(),
//       password: hashedPassword,
//       phone: formattedPhone,
//       companyName,
//       role:role.toLowerCase(),
//       emailVerified: true, // auto-verify email
//       phoneVerified: false,
//       createdByIP: req.ip,
//       isDeleted: false,
//     });

//     await newUser.save();

//     // Fire-and-forget email
//     const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress || 'Unknown';
//     sendInfoEmail(newUser.name, newUser.email, ip, req.headers['user-agent'], newUser._id)
//       .then(() => console.log("Info email sent successfully!"))
//       .catch(err => console.error("Email failed:", err.message));


//       // Auto verify after 1 sec
//       setTimeout(async () => {
//         newUser.emailVerified = true,
//         newUser.status = "active",
//         await newUser.save();
//        console.log(` ${newUser.email} auto-verified and activated`);
//       }, 1000);

//     // Immediate response to client
//     res.status(201).json({
//       message: "Registered successfully. Account Activated...",
//       userId: newUser._id,
//       token
//     });

//   } catch (err) {
//     console.error("Register router error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });


// router.post("/login", async (req, res) => {
//   const { email, password, captchaToken } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ message: "Email and password are required." });
//   }

//   try {
//     // 1️⃣ Check user email first
//     const user = await User.findOne({ email: email.toLowerCase() });
//     if (!user) return res.status(404).json({ message: "Account not registered." });

//     if (!user.emailVerified)
//       return res.status(400).json({ message: "Email not verified. Please check your inbox." });

//     // 2️⃣ Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ message: "Incorrect password." });

//     // 3️ Now check reCAPTCHA
//     if (!captchaToken)
//       return res.status(400).json({ message: "Please complete the reCAPTCHA." });

//     const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
//     const { data: captchaData } = await axios.post(verifyUrl, null, {
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     });

//     if (!captchaData.success) {
//       console.error("Captcha failed:", captchaData["error-codes"]);
//       return res.status(400).json({ message: "reCAPTCHA verification failed." });
//     }

//     // 4️ IP, last login, send email, JWT
//     const ip = req.headers["x-forwarded-for"]?.split(",").shift() || req.socket?.remoteAddress || "Unknown";

//     sendLoginEmail(user.name, user.email, ip, req.headers["user-agent"])
//       .then(() => console.log("Login email sent!"))
//       .catch(err => console.error("Login email failed:", err.message));

//     user.lastLogin = new Date();
//     await user.save();

//     if (!process.env.JWT_SECRET) {
//       console.error("JWT_SECRET missing in .env");
//       return res.status(500).json({ message: "Server configuration error." });
//     }

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: process.env.JWT_EXPIRES_IN || "1d",
//     });

//     const registeredAt = moment(user.createdAt).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A");
//     const updatedAt = moment(user.updatedAt).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A");
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
//         companyName: user.companyName,
//         avatar: user.avatar,
//         registeredAt,
//         updatedAt,
//         lastLogin: lastLoginIST,
//       },
//     });
//   } catch (err) {
//     console.error("Login error:", err.message, err.stack);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// });


router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, companyName } = req.body;

    // Validation
    if (!name || !email || !password || !phone || !companyName)
      return res.status(400).json({ message: "All fields are required" });

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const token = generateToken();

    // 1️ Create USER (default role)
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: formattedPhone,
      companyName,
      role: "user",          // Default role
      emailVerified: true,   // auto verify
      phoneVerified: false,
      createdByIP: req.ip,
      isDeleted: false,
    });

    await newUser.save();

    // 2️ Create Company automatically
    const newCompany = new Company({
      name: companyName,
      ownerId: newUser._id,
      admins: [],
      employees: [],
      status: "active"
    });
    await newCompany.save();

    // 3️ Link USER with companyId
    newUser.companyId = newCompany._id;
    await newUser.save();

    // Fire-and-forget info email
    const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress || 'Unknown';
    sendInfoEmail(newUser.name, newUser.email, ip, req.headers['user-agent'], newUser._id)
      .then(() => console.log("Info email sent successfully!"))
      .catch(err => console.error("Email failed:", err.message));

    // Optional: auto-verify after 1 sec
    setTimeout(async () => {
      newUser.emailVerified = true;
      newUser.status = "active";
      await newUser.save();
      console.log(`${newUser.email} auto-verified and activated`);
    }, 1000);

    res.status(201).json({
      message: "Registered successfully. Account Activated!",
      userId: newUser._id,
      companyId: newCompany._id,
      token
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== LOGIN =====
router.post("/login", async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    if (!email || !password || !captchaToken)
      return res.status(400).json({ message: "Email, password and captcha required." });

    // Check user
    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (!user) return res.status(404).json({ message: "Account not registered." });
    if (!user.emailVerified) return res.status(400).json({ message: "Email not verified." });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password." });

    // Verify reCAPTCHA
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
    const { data: captchaData } = await axios.post(verifyUrl, null, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!captchaData.success) return res.status(400).json({ message: "reCAPTCHA failed." });

    // Send login email
    const ip = req.headers["x-forwarded-for"]?.split(",").shift() || req.socket?.remoteAddress || "Unknown";
    sendLoginEmail(user.name, user.email, ip, req.headers["user-agent"])
      .then(() => console.log("Login email sent"))
      .catch(err => console.error(err.message));

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1d" });

    const registeredAt = moment(user.createdAt).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A");
    const lastLoginIST = user.lastLogin ? moment(user.lastLogin).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A") : null;

    res.status(200).json({
      message: "Login successful",
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        companyId: user.companyId,
        registeredAt,
        lastLogin: lastLoginIST
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

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
router.get('/profile', protect , async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({message: "User not found"});
    res.json(user);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Update Profile

router.put("/profile", protect, upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      name,
      phone,
      bio,
      gender,
      dateOfBirth,
      address,
      role,
      companyName,
      designation,
      department,
    } = req.body;

    // Update basic fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (bio) user.bio = bio;
    if (gender) user.gender = gender;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (companyName) user.companyName = companyName;
    if (designation) user.designation = designation;
    if (department) user.department = department;

    // Avatar upload
    if (req.file && req.file.path) user.avatar = req.file.path;

    // Address
    if (address) {
      user.address =
        typeof address === "string" ? JSON.parse(address) : address;
    }

    // Role update only once
    if (role && !user.roleUpdated) {
      user.role = role.toLowerCase().trim();
      user.roleUpdated = true;
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


//===================== DELETE USER ======================

// DELETE account
router.delete("/delete-account", protect , async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    // IP capture
    const ip =
      req.headers["x-forwarded-for"]?.split(",").shift() ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      "Unknown";
    // User Agent
    const userAgent = req.headers["user-agent"] || "Unknown Device";

    // find all employee and this users
    const employees = await Employee.find({createdBy: user._id});
      // delete all employee salaries
    for (const emp of employees) {
      await Salary.deleteMany({employeeId: emp._id});
    }
      // delete all employees created by user
    await Employee.deleteMany({createdBy: user._id});

    // Delete user first
    const deletedUser = await User.findByIdAndDelete(user._id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found or already deleted" });
    }

    // Email send after deletion (non-blocking)
    try {
      await sendDeleteEmail(deletedUser.name, deletedUser.email, ip, userAgent);
    } catch (err) {
      console.error("Delete Email Error:", err.message);
    }

    return res.json({ message: "Account deleted successfully and confirmation email sent" });
  } catch (err) {
    console.error("Delete Account Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.put("/update-password", protect , async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Both old and new passwords are required" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password Update Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Admin delete by Owner
router.delete("/admin/:adminId", protect, async (req, res) => {
  try {
    const owner = req.user; // Must be USER (owner)
    const { adminId } = req.params;

    const company = await Company.findById(owner.companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    // Check if admin belongs to same company
    if (!company.admins.includes(adminId)) 
      return res.status(400).json({ message: "Admin not found in your company" });

    // Soft delete admin
    const admin = await User.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.isDeleted = true;
    await admin.save();

    // Remove admin from company admins array
    company.admins = company.admins.filter(a => a.toString() !== adminId);
    await company.save();

    // Optional: send email
    // sendAccessRevokedEmail(admin.email);

    res.json({ message: "Admin access revoked successfully" });

  } catch (err) {
    console.error("Delete Admin Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



export default router;
