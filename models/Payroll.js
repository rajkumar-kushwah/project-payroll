// src/models/Payroll.js

import mongoose from "mongoose";

const { Schema } = mongoose;

const payrollSchema = new Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",      // assume employees are stored in User model
      required: true,
    },
    payPeriodStart: {
      type: Date,
      required: true,
    },
    payPeriodEnd: {
      type: Date,
      required: true,
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    grossPay: {
      type: Number,
      required: true,
      min: 0,
    },
    netPay: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paidDate: {
      type: Date,
    },
    // optional comments or notes
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

const Payroll = mongoose.model("Payroll", payrollSchema);

export default Payroll;
