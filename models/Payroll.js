import mongoose from "mongoose";
const { Schema } = mongoose;

const payrollSummarySchema = new Schema(
  {
    employeeCode: {
      type: String,
      required: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    month: {
      type: String, // "Jan 2026"
      required: true,
    },

    totalDays: Number,
    present: Number,
    absent: Number,
    paidLeaves: Number,
    unpaidLeaves: Number,
    officeHolidays: Number,
    overtimeHours: Number,

    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("Payroll", payrollSummarySchema);
