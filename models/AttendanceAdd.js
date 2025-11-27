// models/WorkSchedule.js
import mongoose from "mongoose";

const WorkScheduleSchema = new mongoose.Schema({
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Employee", 
    required: false // agar company-wide default schedule ho to optional
  },
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Company", 
    required: true 
  },
  shiftName: { type: String, default: "Default Shift" },
  inTime: { type: String, required: true },      // "HH:MM"
  outTime: { type: String, required: true },     // "HH:MM"
  weeklyOff: { type: [String], default: ["Sunday"] },
  shiftType: { type: String, enum: ["Full-day", "Half-day", "Night", "Flexible"], default: "Full-day" },
  breakStart: { type: String },  // optional
  breakEnd: { type: String },    // optional
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model("WorkSchedule", WorkScheduleSchema);

