import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    employees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],

    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
    },

    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "" },
      pinCode: { type: String, default: "" },
    },

    // Optional onboarding configuration
    onboardingWorkflow: {
      autoAssignTasks: { type: Boolean, default: true },
      autoDocs: { type: Boolean, default: true },
      autoSalarySetup: { type: Boolean, default: true },
      customSteps: { type: Array, default: [] },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
