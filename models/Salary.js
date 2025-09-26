import mongoose from "mongoose";

const SalarySchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  month: { type: String, required: true },
  basic: { type: Number, required: true },
  hra: { type: Number, default: 0 },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  leaves: { type: Number, default: 0 },       
  totalWorkingDays: { type: Number, default: 22 },
  netSalary: { type: Number, required: true },
  status: { type: String, default: "Unpaid" },
  paidOn: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model("Salary", SalarySchema);
