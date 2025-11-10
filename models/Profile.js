import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  avatar: { type: String, default: "" },
  bio: { type: String, default: "" },
  gender: { type: String, enum: ["male", "female", "other"], default: "other" },
  dateOfBirth: { type: Date },

    // Company details (from registration)
  companyName: { type: String, trim: true },
  role: { type: String, trim: true, lowercase: true },

  address: {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    pinCode: { type: String, default: "" },
  },

  // Audit fields
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true} );

export default mongoose.model("Profile", profileSchema);
