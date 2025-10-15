import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },


  // profile 
  avatar: {type: String, default: ""},
  bio: {type: String, default: ""},
  gender: {type: String, enum: ["male", "female", "other"], default: "other"},
  dateofBirth: {type: Date, default: Date.new},

  address: {
    Stream: {type: String, default: ""},
    city: {type: String, default: ""},
    state: {type: String, default: ""},
    country: {type: String, default: ""},
    pinCode: {type: String, default: ""},
  },


  // Permissions and roles 
  role: { type: String, enum: ["user", "admin"], default: "user" },
  createdAt: { type: Date, default: Date.now },

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
