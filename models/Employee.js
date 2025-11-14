import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    // Auto Employee Code (EMP-001)
    employeeCode: { type: String, unique: true },

    // Basic Info
    name: {
      type: String,
      required: [true, "Employee name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
    },
    phone: {
      type: String,
    },

    // Job Details
    jobRole: {
      type: String,
    },
    department: {
      type: String,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },

    // Salary
    salary: {
      type: Number,
      required: true,
      default: 0,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "terminated"],
      default: "active",
    },

    // Notes
    notes: {
      type: String,
    },

    // Created By
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-generate EMP-001, EMP-002...
employeeSchema.pre("save", async function (next) {
  if (!this.employeeCode) {
    const lastEmp = await mongoose
      .model("Employee")
      .findOne()
      .sort({ createdAt: -1 });

    let nextNumber = 1;
    if (lastEmp?.employeeCode) {
      nextNumber = parseInt(lastEmp.employeeCode.split("-")[1]) + 1;
    }

    this.employeeCode = `EMP-${String(nextNumber).padStart(3, "0")}`;
  }

  next();
});

export default mongoose.model("Employee", employeeSchema);
