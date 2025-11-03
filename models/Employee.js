import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, unique: true, sparse: true },
    jobrole: { type: String, default: "employee" },
    department: { type: String, required: true },
    joinDate: { type: Date, default: Date.now },
    salary: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["active", "inactive", "terminated"],
      default: "active",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

// index for faster queries
employeeSchema.index({ name: 1, department: 1 });

export default mongoose.model("Employee", employeeSchema);
