import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },

  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },

  phone: { type: String, default: "" },
  companyName: { type: String, default: "" },
  status: { type: String, enum: ["active", "inactive", "pending"], default: "pending" },

  avatar: { type: String, default: "" }, // Can store uploaded URL or default avatar
  bio: { type: String, default: "" },
  gender: { type: String, enum: ["male", "female", "other"], default: "other" },
  dateOfBirth: { type: Date },

  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pinCode: String,
  },

  role: {
    type: String,
    enum: ["owner", "admin", "hr", "ceo", "employee", "user"],
    default: "user",
  },

  roleUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  roleUpdated: { type: Boolean, default: false },

  // Advanced role history
  roleHistory: [
    {
      previousRole: String,
      newRole: String,
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      changedOn: Date,
    },
  ],

  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },

  createdByIP: String,
  lastLoginIP: String,
  deviceInfo: String,
  lastLogin: { type: Date, default: null },

  // Login history for auditing
  loginHistory: [
    {
      ip: String,
      device: String,
      success: Boolean,
      timestamp: Date,
    },
  ],

  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null },
  
  otp: {
  type: String,
  default: null,
},

otpExpires: {
  type: Date,
  default: null,
},


  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },

  verificationToken: { type: String, default: null },
  verificationExpires: { type: Date, default: null },

  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },

  // Optional user preferences
  preferences: {
    timezone: { type: String, default: "UTC" },
    language: { type: String, default: "en" },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },
  },

}, { timestamps: true });

export default mongoose.model("User", userSchema);
