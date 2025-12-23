import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    employeeCode: { type: String, required: true },

    name: { type: String, required: true },
    avatar: { type: String },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number },

    type: {
      type: String,
      enum: ["casual", "sick", "paid", "unpaid"],
      required: true,
    },
    reason: String,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);


export default mongoose.model("Leave", leaveSchema);
