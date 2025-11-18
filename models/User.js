import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },

  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },

  phone: { type: String, default: "" },
  companyName: { type: String, default: "" },
  status: { type: String, enum: ["active", "inactive", "pending"], default: "pending" },

  avatar: { type: String, default: "" },
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
    enum: ["owner", "hr", "ceo", "admin", "employee", "user"],
    required: true,
  },

  roleUpdated: { type: Boolean, default: false },

  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },

  createdByIP: String,
  lastLoginIP: String,
  deviceInfo: String,

  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },

  isDeleted: { type: Boolean, default: false }

}, { timestamps: true });


export default mongoose.model("User", userSchema);
