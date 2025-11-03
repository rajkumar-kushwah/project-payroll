import mongoose from "mongoose";

const SalarySchema = new mongoose.Schema(
  {
    salaryId: {
      type: String,
      unique: true,
      default: () => `SAL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`, // auto ID
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    month: {
      type: String, // e.g. "2025-11"
      required: true,
    },

    basic: {
      type: Number,
      required: true,
    },

    hra: {
      type: Number,
      default: 0,
    },

    allowances: {
      type: Number,
      default: 0,
    },

    deductions: {
      type: Number,
      default: 0,
    },

    leaves: {
      type: Number,
      default: 0,
    },

    totalWorkingDays: {
      type: Number,
      required: true,
    },

    netSalary: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
    },

    paidOn: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Salary", SalarySchema);
