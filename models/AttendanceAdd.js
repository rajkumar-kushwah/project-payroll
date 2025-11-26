// models/AttendanceAdd.js
import mongoose from "mongoose";

const attendanceAddSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  remarks: { type: String },
  registeredFromForm: { type: Boolean, default: true }, // ✅ important flag
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin/owner id
}, { timestamps: true });

export default mongoose.model("AttendanceAdd", attendanceAddSchema);
