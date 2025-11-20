import mongoose from "mongoose";
import Employee from "./Employee.js";
import { v4 as uuidv4 } from "uuid";

const SalarySchema = new mongoose.Schema(
  {
    salaryId: {
      type: String,
      unique: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    month: {
      type: String, // format: "YYYY-MM"
      required: true,
    },

    basic: { type: Number, required: true },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    leaves: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    reimbursement: { type: Number, default: 0 },

    // Government compliance fields
    epf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    pt: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 },

    totalWorkingDays: { type: Number, required: true },

    netSalary: { type: Number, required: true },

    status: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
    },

    paidOn: {
      type: Date,
      default: null,
    },

    payslipUrl: { type: String, default: null },

    statusHistory: [
      {
        status: { type: String, enum: ["paid", "unpaid"] },
        changedOn: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-generate SAL-001 style salaryId per company
SalarySchema.pre("save", async function (next) {
  if (!this.salaryId) {
    const lastSalary = await mongoose
      .model("Salary")
      .findOne({ companyId: this.companyId })
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastSalary && lastSalary.salaryId) {
      nextNumber = parseInt(lastSalary.salaryId.split("-")[1]) + 1;
    }

    this.salaryId = `SAL-${String(nextNumber).padStart(3, "0")}`;
  }

  // Auto-calculate netSalary if not manually set
  this.netSalary =
    (this.basic || 0) +
    (this.hra || 0) +
    (this.allowances || 0) +
    (this.overtimeHours || 0) * 100 + // example overtime calculation
    (this.bonus || 0) +
    (this.reimbursement || 0) -
    ((this.deductions || 0) +
      (this.epf || 0) +
      (this.esi || 0) +
      (this.pt || 0) +
      (this.incomeTax || 0));

  next();
});

export default mongoose.model("Salary", SalarySchema);
