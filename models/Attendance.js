import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Employee", 
    required: true 
  },

  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Company", 
    required: true 
  },

  date: { type: Date, required: true },

  status: { 
    type: String, 
    enum: ["present", "absent", "leave", "half-day"], 
    required: true 
  },

  shiftId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "WorkSchedule" 
  },

  checkIn: { type: Date },
  checkOut: { type: Date },

  totalHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  missingHours: { type: Number, default: 0 },

  isLate: { type: Boolean, default: false },
  lateByMinutes: { type: Number, default: 0 },

  isEarlyCheckout: { type: Boolean, default: false },
  earlyByMinutes: { type: Number, default: 0 },

  isOvertime: { type: Boolean, default: false },

  remarks: { type: String },

  logType: { 
    type: String, 
    enum: ["manual", "self"], 
    default: "manual" 
  },

  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },

}, { timestamps: true });


//  UNIQUE INDEX (ek employee ek date par ek hi attendance)
attendanceSchema.index(
  { employeeId: 1, date: 1, companyId: 1 },
  { unique: true }
);

export default mongoose.model("Attendance", attendanceSchema);
