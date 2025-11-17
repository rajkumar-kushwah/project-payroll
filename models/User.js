import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },

  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  companyName: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive", "Pending"], default: "Pending" },

  // Profile
  avatar: { type: String, default: "" },
  bio: { type: String, default: "" },
  gender: { type: String, enum: ["Male", "Female", "Other",], default: "Other" },
  dateOfBirth: { type: Date, default: null },

  address: {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    pinCode: { type: String, default: "" },
  },

  // Permissions and roles
  role: {
    type: String,
    enum: ["Owner", "HR", "CEO", "Admin", "Employee", "User"],
    lowercase: true,
    trim: true,
    required: true,
    default: "",
  },
  roleUpdated: { type: Boolean, default: false },

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

  // Soft delete
  isDeleted: { type: Boolean, default: false }

}, { timestamps: true });

export default mongoose.model("User", userSchema);
