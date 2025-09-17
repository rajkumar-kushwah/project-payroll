// models/Employee.js
import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    role: { type: String, default: "employee" },
    department: { type: String },
    joinDate: { type: Date, default: Date.now },
    salary: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "inactive", "terminated"],
      default: "active",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

const Employee = mongoose.model("Employee", employeeSchema);
export default Employee;
