// models/WorkSchedule.js
import mongoose from "mongoose";

const WorkScheduleSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true, unique: true },
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Company", 
    required: true 
  },

  employeeId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
   // Add static fields for name & avatar
  employeeName: { type: String, required: true },
  employeeAvatar: { type: String, default: "/default-avatar.png" },

  shiftName: { type: String, required: true },

  inTime: { type: String, required: true },
  outTime: { type: String, required: true },

  weeklyOff: { type: [String], default: ["Sunday"] },

  shiftType: { 
    type: String, 
    enum: ["Full-day", "Half-day", "Night", "Flexible"],
    default: "Full-day" 
  },

  breakStart: { type: String, default: null },
  breakEnd: { type: String, default: null },

  gracePeriod: { type: Number, default: 10 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }

}, { timestamps: true });

export default mongoose.model("WorkSchedule", WorkScheduleSchema);
