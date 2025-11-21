import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ["present","absent","leave","half-day"], required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  totalHours: { type: Number },
  logType: { type: String, enum: ["manual","self"], default: "manual" }, // manual = admin/owner marks, self = employee login
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin/owner id
}, { timestamps: true });

export default mongoose.model("Attendance", attendanceSchema);
