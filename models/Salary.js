import mongoose from "mongoose";

const salarySchema = new mongoose.Schema({
    EmployeeId: {type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true},
    month: { type: String, required: true },
    baseSalary: {type: Number, required: true},
    bonus: {type: Number, default: 0},
    deductions: { type: Number, default: 0 },
    leaves: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    paidAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("Salary", salarySchema);
