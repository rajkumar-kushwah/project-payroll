import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },

  role: { type: String, enum: ["Administrator", "HR", "Employee"], default: "Employee" },

  // Email verification
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpiry: { type: Date },

  // Phone OTP
  phoneVerified: { type: Boolean, default: false },
  phoneOtp: { type: String },
  phoneOtpExpiry: { type: Date },

  // Password reset
  resetPasswordToken: { type: String },
  resetPasswordExpiry: { type: Date },

  // Login security
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },

  // Audit / Tracking
  createdByIP: { type: String },
  lastLoginIP: { type: String },
  deviceInfo: { type: String },

// delete account
isDeleted: { type: Boolean, default: false }


}, { timestamps: true });

export default mongoose.model("User", userSchema);
