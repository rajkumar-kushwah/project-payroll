import mongoose from "mongoose";

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

    month: {
      type: String, // "2025-11"
      required: true,
    },

    basic: { type: Number, required: true },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    leaves: { type: Number, default: 0 },
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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Auto-generate SAL-001, SAL-002...
SalarySchema.pre("save", async function (next) {
  if (!this.salaryId) {
    const lastSalary = await mongoose
      .model("Salary")
      .findOne()
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastSalary && lastSalary.salaryId) {
      nextNumber =
        parseInt(lastSalary.salaryId.split("-")[1]) + 1;
    }

    this.salaryId = `SAL-${String(nextNumber).padStart(3, "0")}`;
  }

  next();
});

export default mongoose.model("Salary", SalarySchema);
