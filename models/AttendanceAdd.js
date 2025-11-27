// models/AttendanceAdd.js
import mongoose from "mongoose";

const attendanceAddSchema = new mongoose.Schema({
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

  // Store date in yyyy-mm-dd format
  date: { 
    type: String,  
    required: true 
  },

  checkIn: { type: Date },       // office IN time (fixed)
  checkOut: { type: Date },      // office OUT time (fixed)
  remarks: { type: String },
  status: { type: String, enum: ["active", "inactive"], required: true },

  // Important flag — tells system this record came from manual admin form
  registeredFromForm: { 
    type: Boolean, 
    default: true 
  },

  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },

}, { timestamps: true });

export default mongoose.model("AttendanceAdd", attendanceAddSchema);
