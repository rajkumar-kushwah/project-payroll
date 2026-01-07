import mongoose from "mongoose";
const { Schema } = mongoose;

const payrollSchema = new Schema(
  {
    employeeCode: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: "" },
    month: { type: String, required: true }, // e.g., "Jan 2026"

    totalWorking: Number,
    present: Number,
    leave: Number,
    officeHolidays: Number,
    weeklyOff: Number,
    missingDays: Number,
    overtimeHours: Number,
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("Payroll", payrollSchema);
