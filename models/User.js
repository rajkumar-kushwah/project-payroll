import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "Administrator" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  resetPasswordOTP: { type: String },
  otpExpire: { type: Date },
  lastLogin: { type: Date }

}, { timestamps: true });

export default mongoose.model('User', userSchema);
