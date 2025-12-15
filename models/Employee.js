import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: { type: String, unique: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    avatar: { type: String, default: "" },
    name: { type: String, required: true },
    email: { type: String, required: true },
    dateOfBirth: { type: Date },
    phone: { type: String },
    jobRole: { type: String },
    department: { type: String },
    designation: { type: String },
    joinDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["active", "inactive", "terminated"], default: "active" },
    notes: { type: String },
    password: {
      type: String,
      required: false,
    },

    basicSalary: { type: Number, default: 0 },
  },
  { timestamps: true } // createdAt = registration date
);

// Auto Employee Code
employeeSchema.pre("save", async function (next) {
  if (!this.employeeCode) {
    const lastEmp = await mongoose.model("Employee").findOne({ companyId: this.companyId }).sort({ createdAt: -1 });
    let nextNumber = 1;
    if (lastEmp && lastEmp.employeeCode) nextNumber = parseInt(lastEmp.employeeCode.split("-")[1]) + 1;
    this.employeeCode = `EMP-${String(nextNumber).padStart(3, "0")}`;
  }
  next();
});

export default mongoose.model("Employee", employeeSchema);
