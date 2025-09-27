import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Blacklist from "../models/Blacklist.js";
import verifyToken from '../middleware/authMiddleware.js';
import { sendOtpEmail } from '../utils/sendEmail.js';

const router = express.Router();

// utils
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashData = (data) => crypto.createHash('sha256').update(data).digest('hex');


// ======================= PUBLIC ROUTES =======================

//  Register
// Register route
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    // Token generate karo
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Profile info hata diya
    res.json({
      message: "User registered successfully",
      token,        
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || "User"  // optional
      }
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});




// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Account not registered' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

   res.status(200).json({
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
     role: user.role,   
    
    // agar profile image ka path save karte ho
  },
});

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

//  Logout (secure)
router.post('/logout', async (req, res) => {
   try {
      const token = req.headers["authorization"]?.split(" ")[1];
      if (!token) return res.status(401).json({ message: 'No token provided' });

         // token blacklist में डाल दो
         await Blacklist.create({ token });

         res.json({ message: 'Logged out successfully'});
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

    // ✅ OTP verified → issue reset token
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
    // ✅ Verify resetToken
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

export default router;
