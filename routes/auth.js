import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Blacklist from "../models/Blacklist.js";
import verifyToken,{authMiddleware} from '../middleware/authMiddleware.js';
import { sendVerificationEmail,sendLoginEmail ,sendLogoutEmail,sendDeleteEmail } from '../utils/sendEmail.js';



import moment from 'moment-timezone';

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
    if (!name || !email || !password || !phone) return res.status(400).json({ message: "All fields required" });

    // if (!strictEmailRule(email)) return res.status(400).json({ message: "Invalid email format" });
   if (!strictEmailRule(email)) {
  return res.status(400).json({ message: "Email must be like name123@example.com" });
}
    
 // Phone validation - add **yaha**
    const phoneRegex = /^(\+91)?[6-9][0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }


    if (await User.findOne({ email: email.toLowerCase(), isDeleted: false })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
    if (await User.findOne({ phone: formattedPhone })) {
      return res.status(400).json({ message: "Phone already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const token = generateToken();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 min

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: formattedPhone,
      emailVerificationToken: token,
      emailVerificationExpiry: new Date(expiry),
      emailVerified: false,
      phoneVerified: false,
      createdByIP: req.ip,
      isDeleted: false
    });

    await newUser.save();

    const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress || req.connection?.remoteAddress || 'Unknown';

    // Send verification email
    await sendVerificationEmail(
      newUser.name,
      newUser.email,
      token,
      ip,
      req.headers['user-agent']
    )
       .then(() => console.log(`Verification email sent to ${newUser.email}`))
      .catch(err => console.error("Email sending failed:", err));

    res.status(201).json({ message: "Registered successfully. Check email to verify." });
  } catch (err) {
    console.error("Register router error",err);
    res.status(500).json({ message: "Server error" });
  }
});


// ===== REGISTER =====

// router.post("/register", async (req, res) => {
//   let newUser;
//   try {
//     const { name, email, password, phone } = req.body;

//     if (!name || !email || !password || !phone)
//       return res.status(400).json({ message: "All fields required" });

//     // Email & phone validation
//     const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
//     const phoneRegex = /^(\+91)?[6-9][0-9]{9}$/;
//     if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid email" });
//     if (!phoneRegex.test(phone)) return res.status(400).json({ message: "Invalid phone" });

//     // Check duplicates
//     if (await User.findOne({ email: email.toLowerCase(), isDeleted: false }))
//       return res.status(400).json({ message: "Email already registered" });

//     const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
//     if (await User.findOne({ phone: formattedPhone }))
//       return res.status(400).json({ message: "Phone already registered" });

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 12);

//     // Create user
//     newUser = new User({
//       name,
//       email: email.toLowerCase(),
//       password: hashedPassword,
//       phone: formattedPhone,
//       emailVerified: true,
//       autoVerified: true,
//       phoneVerified: false,
//       createdByIP: req.ip,
//       isDeleted: false,
//     });

//     await newUser.save();

//     const ip =
//       req.headers["x-forwarded-for"]?.split(",").shift() ||
//       req.socket?.remoteAddress ||
//       "Unknown";

//     // Send verification email to user
//     await sendVerificationEmail(newUser.name, newUser.email, newUser._id.toString(), ip, req.headers["user-agent"]);

//     //  Send info email to admin (you)
//     await sendAdminNotificationEmail(newUser, ip);

//     res.status(201).json({ message: "Registered successfully. Email sent to user & admin notified." });
//   } catch (err) {
//     console.error("Registration/email failed:", err.message);
//     if (newUser?._id) await User.findByIdAndDelete(newUser._id);
//     res.status(500).json({ message: "Registration failed: Email could not be sent." });
//   }
// });




// router.post("/register", async (req, res) => {
//   let newUser;
//   try {
//     const { name, email, password, phone } = req.body;
//     if (!name || !email || !password || !phone)
//       return res.status(400).json({ message: "All fields required" });

//     // Email & phone validation
//     const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
//     const phoneRegex = /^(\+91)?[6-9][0-9]{9}$/;
//     if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid email" });
//     if (!phoneRegex.test(phone)) return res.status(400).json({ message: "Invalid phone" });

//     // Already exists check
//     if (await User.findOne({ email: email.toLowerCase(), isDeleted: false }))
//       return res.status(400).json({ message: "Email already registered" });

//     const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
//     if (await User.findOne({ phone: formattedPhone }))
//       return res.status(400).json({ message: "Phone already registered" });

//     const hashedPassword = await bcrypt.hash(password, 12);

//     newUser = new User({
//       name,
//       email: email.toLowerCase(),
//       password: hashedPassword,
//       phone: formattedPhone,
//       emailVerified: true,
//       autoVerified: true,
//       phoneVerified: false,
//       createdByIP: req.ip,
//       isDeleted: false,
//     });

//     await newUser.save();

//     const ip = req.headers["x-forwarded-for"]?.split(",").shift() || req.socket?.remoteAddress || "Unknown";

//     // Send welcome email
//     await sendVerificationEmail(newUser.email, newUser._id.toString(), ip, req.headers["user-agent"]);

//     res.status(201).json({ message: "Registered successfully. Email auto-verified." });
//   } catch (err) {
//     console.error("Registration/email failed:", err.message);
//     if (newUser?._id) await User.findByIdAndDelete(newUser._id);
//     res.status(500).json({ message: "Registration failed: Email could not be sent." });
//   }
// });



// ===== VERIFY EMAIL =====



router.get("/verify-email", async (req, res) => {
  try {
    const { email, token } = req.query;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.emailVerified) return res.status(400).json({ message: "Email already verified" });
    if (user.emailVerificationToken !== token || Date.now() > new Date(user.emailVerificationExpiry)) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();
    console.log("User verified successfully:", user);

    res.json({ message: "Email verified successfully. You can now login." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== RESEND VERIFICATION EMAIL =====
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.emailVerified) return res.status(400).json({ message: 'User already verified' });

  const token = crypto.randomBytes(20).toString('hex'); // naya token
  user.emailVerificationToken = token;
  user.emailVerificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
  await user.save();


  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}`;
  await sendEmail(email, 'Verify Your Email', `Click here to verify: ${verificationLink}`);

  res.status(200).json({ message: 'Verification email resent successfully!' });
});


// Login
// Login (email must be verified)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'Account not registered' });

    // Email verification check
    if (!user.emailVerified) return res.status(400).json({ message: 'Email not verified. Check your inbox.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect password' });
    
        // Calculate IP
    const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress || req.connection?.remoteAddress || 'Unknown';

    // Send login email
    await sendLoginEmail(
      user.name,
       user.email,
       ip,
       req.headers['user-agent']
      );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    const registeredAt = moment(user.createdAt).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A");
    const updatedAt = moment(user.updatedAt).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A");
    const lastLoginIST = moment(user.lastLogin).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A");

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
    console.error("Login error:", err);
    res.status(500).json({ message: 'Server error' });
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
