import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],

  status: { type: String, enum: ["active", "inactive", "pending"], default: "pending" },

  address: {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    pinCode: { type: String, default: "" },
  },

}, { timestamps: true });

export default mongoose.model("Company", companySchema);
