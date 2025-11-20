import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    // -------------------------
    // Basic Info
    // -------------------------
    employeeCode: {
      type: String,
      unique: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },

    jobRole: { type: String },
    department: { type: String },
    designation: { type: String },
    joinDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "inactive", "terminated"],
      default: "active",
    },
    notes: { type: String },

    // -------------------------
    // Salary Info
    // -------------------------
    salaryDetails: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      netSalary: { type: Number, default: 0 },
      lastUpdated: { type: Date },
    },

    // -------------------------
    // Trainings / Onboarding
    // -------------------------
    trainings: [
      {
        trainingId: { type: mongoose.Schema.Types.ObjectId, ref: "Training" },
        assignedOn: { type: Date },
        completed: { type: Boolean, default: false },
      },
    ],

    // -------------------------
    // Documents & Agreements
    // -------------------------
    documents: [
      {
        docType: String,
        fileUrl: String,
        verified: { type: Boolean, default: false },
      },
    ],
    agreements: [
      {
        type: String, // employment / policy / nda
        signed: { type: Boolean, default: false },
        signedOn: Date,
        fileUrl: String,
      },
    ],
  },
  { timestamps: true }
);

// -------------------------
// Auto Employee Code (EMP-001)
// -------------------------
employeeSchema.pre("save", async function (next) {
  if (!this.employeeCode) {
    const lastEmp = await mongoose
      .model("Employee")
      .findOne({ companyId: this.companyId })
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastEmp && lastEmp.employeeCode) {
      nextNumber = parseInt(lastEmp.employeeCode.split("-")[1]) + 1;
    }

    this.employeeCode = `EMP-${String(nextNumber).padStart(3, "0")}`;
  }

  next();
});

export default mongoose.model("Employee", employeeSchema);
