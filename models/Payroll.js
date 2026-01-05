import mongoose from "mongoose";
const { Schema } = mongoose;

const payrollSummarySchema = new Schema(
  {
    employeeCode: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: "" },
    month: { type: String, required: true }, // e.g., "Jan 2026"
    totalDays: Number,
    present: Number,
    paidLeaves: Number,
    unpaidLeaves: Number,
    officeHolidays: Number,
    weeklyOffCount: Number,
    missingDays: Number,   // <-- New: Missing days
    overtimeHours: Number,
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("Payroll", payrollSummarySchema);
