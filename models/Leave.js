// employee-management/models/Leave.js

import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    employeeCode: { type: String, required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    avatar: { type: String},
    date: { type: Date, required: true },
    type: { type: String, enum: ["Paid", "Unpaid"], default: "Paid" },
    reason: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // HR
  },
  { timestamps: true }
);

export default mongoose.model("Leave", leaveSchema);
