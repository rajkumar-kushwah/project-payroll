import mongoose from "mongoose";

const AttendanceRegisterSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

  fixedIn: { type: String, required: true },     // "09:00"
  fixedOut: { type: String, required: true },    // "18:00"

  status: { type: String, default: "active" },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("AttendanceRegister", AttendanceRegisterSchema);
