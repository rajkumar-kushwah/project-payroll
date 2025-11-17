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
    const { name, email, password, phone, companyName, role } = req.body;

    if (!name || !email || !password || !phone || !companyName || !role)
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
      companyName,
      role:role.toLowerCase(),
      emailVerified: true, // auto-verify email
      phoneVerified: false,
      createdByIP: req.ip,
      isDeleted: false,
    });

    await newUser.save();

    // Fire-and-forget email
    const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress || 'Unknown';
    sendInfoEmail(newUser.name, newUser.email, ip, req.headers['user-agent'], newUser._id)
      .then(() => console.log("Info email sent successfully!"))
      .catch(err => console.error("Email failed:", err.message));


      // Auto verify after 1 sec
      setTimeout(async () => {
        newUser.emailVerified = true,
        newUser.status = "active",
        await newUser.save();
       console.log(` ${newUser.email} auto-verified and activated`);
      }, 1000);

    // Immediate response to client
    res.status(201).json({
      message: "Registered successfully. Account Activated...",
      userId: newUser._id,
      token
    });

  } catch (err) {
    console.error("Register router error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/login", async (req, res) => {
  const { email, password, captchaToken } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    // 1️⃣ Check user email first
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "Account not registered." });

    if (!user.emailVerified)
      return res.status(400).json({ message: "Email not verified. Please check your inbox." });

    // 2️⃣ Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password." });

    // 3️⃣ Now check reCAPTCHA
    if (!captchaToken)
      return res.status(400).json({ message: "Please complete the reCAPTCHA." });

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
    const { data: captchaData } = await axios.post(verifyUrl, null, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!captchaData.success) {
      console.error("Captcha failed:", captchaData["error-codes"]);
      return res.status(400).json({ message: "reCAPTCHA verification failed." });
    }

    // 4️⃣ IP, last login, send email, JWT
    const ip = req.headers["x-forwarded-for"]?.split(",").shift() || req.socket?.remoteAddress || "Unknown";

    sendLoginEmail(user.name, user.email, ip, req.headers["user-agent"])
      .then(() => console.log("Login email sent!"))
      .catch(err => console.error("Login email failed:", err.message));

    user.lastLogin = new Date();
    await user.save();

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET missing in .env");
      return res.status(500).json({ message: "Server configuration error." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    });

    const registeredAt = moment(user.createdAt).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A");
    const updatedAt = moment(user.updatedAt).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A");
    const lastLoginIST = user.lastLogin
      ? moment(user.lastLogin).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A")
      : null;

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        avatar: user.avatar,
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



// router.post("/login", async (req, res) => {
//   const { email, password, captchaToken } = req.body;

//   try {
//     // 1️ Basic validation
//     if (!email || !password || !captchaToken) {
//       return res.status(400).json({ message: "Email, password and captcha are required." });
//     }

//     // 2️ Verify reCAPTCHA
//     const params = new URLSearchParams();
//     params.append("secret", process.env.RECAPTCHA_SECRET_KEY);
//     params.append("response", captchaToken);

//     const { data: captchaRes } = await axios.post(
//       "https://www.google.com/recaptcha/api/siteverify",
//       params
//     );

//     if (!captchaRes.success) {
//       return res.status(400).json({ message: "reCAPTCHA verification failed." });
//     }

//     // 3️ Find user
//     const user = await User.findOne({ email: email.toLowerCase() });
//     if (!user) return res.status(404).json({ message: "Account not registered." });
//     if (!user.emailVerified)
//       return res.status(400).json({ message: "Email not verified. Please check your inbox." });

//     // 4️ Verify password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ message: "Incorrect password." });

//     // 5 Capture IP safely
//     const ip =
//       req.headers["x-forwarded-for"]?.split(",").shift() ||
//       req.socket?.remoteAddress ||
//       req.connection?.remoteAddress ||
//       "Unknown";

//     // Optional: send login email (fire-and-forget)
//     sendLoginEmail(user.name, user.email, ip, req.headers["user-agent"]).catch((err) =>
//       console.error("Login email failed:", err.message)
//     );

//     // 6️ Update last login
//     user.lastLogin = new Date();
//     await user.save();

//     // 7️ Generate JWT
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: process.env.JWT_EXPIRES_IN || "1d",
//     });

//     // 8️Format timestamps in IST
//     const registeredAt = moment(user.createdAt)
//       .tz("Asia/Kolkata")
//       .format("DD/MM/YYYY hh:mm:ss A");
//     const updatedAt = moment(user.updatedAt)
//       .tz("Asia/Kolkata")
//       .format("DD/MM/YYYY hh:mm:ss A");
//     const lastLoginIST = user.lastLogin
//       ? moment(user.lastLogin).tz("Asia/Kolkata").format("DD/MM/YYYY hh:mm:ss A")
//       : null;

//     // 9️ Send response
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
//         profileComplete: user.profileComplete,
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

//     // 1️ Create new user
//     const newUser = new User({
//       name,
//       email: email.toLowerCase(),
//       password: hashedPassword,
//       phone: formattedPhone,
//       companyName,
//       role: role.toLowerCase(),
//       emailVerified: true, // auto-verify
//       phoneVerified: false,
//       createdByIP: req.ip,
//       isDeleted: false,
//     });

//     await newUser.save();

//     // 2️ Create linked profile document
//     const newProfile = new Profile({
//       userId: newUser._id,
//       companyName,
//       role: role.toLowerCase(),
//       address: { Stream: "", city: "", state: "", country: "", pinCode: "" },
//       designation: "",
//       department: "",
//       bio: "",
//       gender: "other",
//       dateOfBirth: "",
//       isDeleted: false,
//       createdByIP: req.ip,
//       updatedByIP: req.ip,
      
//     });
//     await newProfile.save();

//     // 3️ Fire-and-forget email
//     const ip =
//       req.headers["x-forwarded-for"]?.split(",").shift() ||
//       req.socket?.remoteAddress ||
//       "Unknown";
//     sendInfoEmail(newUser.name, newUser.email, ip, req.headers["user-agent"], newUser._id)
//       .then(() => console.log("Info email sent successfully!"))
//       .catch((err) => console.error("Email failed:", err.message));

//     // 4 Auto verify after 1 second
//     setTimeout(async () => {
//       newUser.emailVerified = true;
//       newUser.status = "active";
//       await newUser.save();
//       console.log(`${newUser.email} auto-verified and activated`);
//     }, 1000);

//     // 5 Respond immediately
//     res.status(201).json({
//       message: "Registered successfully. Account Activated...",
//       userId: newUser._id,
//       profileId: newProfile._id,
//       token,
//     });
//   } catch (err) {
//     console.error("Register router error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });



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

// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required." });
//     }

//     const user = await User.findOne({ email: email.toLowerCase() });
//     if (!user) {
//       return res.status(404).json({ message: "Account not registered." });
//     }

//     //  Email verification check
//     if (!user.emailVerified) {
//       return res.status(400).json({ message: "Email not verified. Please check your inbox." });
//     }

//     //  Password check
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Incorrect password." });
//     }

//     // Capture IP safely
//     const ip =
//       req.headers["x-forwarded-for"]?.split(",").shift() ||
//       req.socket?.remoteAddress ||
//       req.connection?.remoteAddress ||
//       "Unknown";

//     //  Send login notification email (fail-safe)
//     try {
//       await sendLoginEmail(user.name, user.email, ip, req.headers["user-agent"]);
//     } catch (emailErr) {
//       console.error("Login email sending failed:", emailErr.message);
//       // Don't block login if email fails
//     }

//     //  Update last login time
//     user.lastLogin = new Date();
//     await user.save();

//     //  Generate token (check env)
//     if (!process.env.JWT_SECRET) {
//       console.error("JWT_SECRET missing in .env");
//       return res.status(500).json({ message: "Server configuration error." });
//     }

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "1d",
//     });

//     //  Format timestamps
//     const registeredAt = moment(user.createdAt)
//       .tz("Asia/Kolkata")
//       .format("DD/MM/YYYY hh:mm:ss A");
//     const updatedAt = moment(user.updatedAt)
//       .tz("Asia/Kolkata")
//       .format("DD/MM/YYYY hh:mm:ss A");
//     const lastLoginIST = user.lastLogin
//       ? moment(user.lastLogin)
//           .tz("Asia/Kolkata")
//           .format("DD/MM/YYYY hh:mm:ss A")
//       : null;

//     //  Send response
//     res.status(200).json({
//       message: "Login successful",
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
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


// router.post("/login", async (req, res) => {
//   const { email, password, captchaToken } = req.body;

//   try {
//     if (!email || !password || !captchaToken) {
//       return res.status(400).json({ message: "Email, password captcha are required." });
//     }

//     // verify reCAPTCHA WITH GOOGLE
//     const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
//     const {data: captchaData} = await axios.post(verifyUrl);

//     if (!captchaData.success) {
//       return res.status(400).json({ message: "reCAPTCHA verify faild."})
//     }

//     const user = await User.findOne({ email: email.toLowerCase() });
//     if (!user) {
//       return res.status(404).json({ message: "Account not registered." });
//     }

//     if (!user.emailVerified) {
//       return res.status(400).json({ message: "Email not verified. Please check your inbox." });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Incorrect password." });
//     }

//     // Capture IP safely
//     const ip =
//       req.headers["x-forwarded-for"]?.split(",").shift() ||
//       req.socket?.remoteAddress ||
//       req.connection?.remoteAddress ||
//       "Unknown";

//     // Fire-and-forget login email
//     sendLoginEmail(user.name, user.email, ip, req.headers["user-agent"])
//       .then(() => console.log("Login email sent successfully!"))
//       .catch((emailErr) => console.error("Login email failed:", emailErr.message));

//     // Update last login time
//     user.lastLogin = new Date();
//     await user.save();

//     if (!process.env.JWT_SECRET) {
//       console.error("JWT_SECRET missing in .env");
//       return res.status(500).json({ message: "Server configuration error." });
//     }

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: process.env.JWT_EXPIRES_IN || "1d",
//     });

//     const registeredAt = moment(user.createdAt)
//       .tz("Asia/Kolkata")
//       .format("DD/MM/YYYY hh:mm:ss A");
//     const updatedAt = moment(user.updatedAt)
//       .tz("Asia/Kolkata")
//       .format("DD/MM/YYYY hh:mm:ss A");
//     const lastLoginIST = user.lastLogin
//       ? moment(user.lastLogin)
//           .tz("Asia/Kolkata")
//           .format("DD/MM/YYYY hh:mm:ss A")
//       : null;

//     // Send immediate response
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
// router.post('/send-otp', async (req, res) => {
//   const { email } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     const otp = generateOTP();
//     const hashedOtp = hashData(otp);

//     user.resetPasswordOTP = hashedOtp;
//     user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
//     await user.save();

//     await sendOtpEmail(user.email, otp);

//     res.json({ message: `OTP sent to email` });
//   } catch (err) {
//     console.error("Send OTP error:", err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });


// /api/auth/send-otp
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




// router.put("/profile", protect , upload.single("avatar"), async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const { name, phone, bio, gender, dateofBirth, address,role } = req.body;

//     if (name) user.name = name;
//     if (phone) user.phone = phone;
//     if (bio) user.bio = bio;
//     if (gender) user.gender = gender;
//     if (dateofBirth) user.dateofBirth = new Date(dateofBirth);
//    if (address) {
//   user.address = typeof address === "string" ? JSON.parse(address) : address;
// }

//   // Check if user has never updated role
//   if (role) {
//       // Only allow if roleUpdated not set
//       if (!user.roleUpdated) {
//         user.role = role.toLowerCase().trim();
//         user.roleUpdated = true; // mark it so user cannot change again
//       } else {
//         return res.status(403).json({ message: "Role can only be updated once" });
//       }
//     }

//     if (req.file && req.file.path) user.avatar = req.file.path;

//     await user.save();
//     res.json({ message: "Profile updated successfully", user });
//   } catch (err) {
//     console.error("Update profile error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

//  PUT: Update profile info



//  Update Profile (user can edit later)

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




export default router;
