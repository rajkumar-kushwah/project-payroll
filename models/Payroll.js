// src/models/Payroll.js

import mongoose from "mongoose";

const { Schema } = mongoose;

const payrollSummarySchema = new Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    name:{
      type: String,
      required: true
    },
    avater:{
      type: String,
      default: "",
    },
    month: {
      type: String, // e.g., "Jan 2026"
      required: true,
    },
    totalDays: {
      type: Number,
      default: 30,
    },
    present: {
      type: Number,
      default: 0,
    },
    absent: {
      type: Number,
      default: 0,
    },
    paidLeaves: {
      type: Number,
      default: 0,
    },
    unpaidLeaves: {
      type: Number,
      default: 0,
    },
    officeHolidays: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    // optional: notes or remarks
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

const PayrollSummary = mongoose.model("PayrollSummary", payrollSummarySchema);

export default PayrollSummary;
