import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    //  Basic Identification
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
    },
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

    //  Job Details
    jobRole: {
      type: String,
      required: false,
    },
    department: {
      type: String,
      required: false,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },

    //  Salary Info
    salary: {
      type: Number,
      required: [true, "Salary amount is required"],
      default: 0,
    },

    //  Status
    status: {
      type: String,
      enum: ["active", "inactive", "terminated"],
      default: "active",
    },

    //  Notes (optional remarks)
    notes: {
      type: String,
    },

    //  Created by which admin/user
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Employee", employeeSchema);
