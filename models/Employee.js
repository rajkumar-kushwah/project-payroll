import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    // Auto-generated EMP-001, EMP-002...
    employeeCode: {
      type: String,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: { type: String },

    jobRole: { type: String },
    department: { type: String },

    joinDate: {
      type: Date,
      default: Date.now,
    },

    salary: {
      type: Number,
      required: true,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "terminated"],
      default: "active",
    },

    notes: { type: String },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-generate EMP-001
employeeSchema.pre("save", async function (next) {
  if (!this.employeeCode) {
    const lastEmp = await mongoose
      .model("Employee")
      .findOne()
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastEmp && lastEmp.employeeCode) {
      nextNumber =
        parseInt(lastEmp.employeeCode.split("-")[1]) + 1;
    }

    this.employeeCode = `EMP-${String(nextNumber).padStart(3, "0")}`;
  }

  next();
});

export default mongoose.model("Employee", employeeSchema);
