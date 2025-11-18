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
        ref: "User",
      },
    ],

    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
    },

    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pinCode: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
