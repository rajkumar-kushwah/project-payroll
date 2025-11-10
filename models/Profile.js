import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // profile 
  avatar: {type: String, default: ""},
  bio: {type: String, default: ""},
  gender: {type: String, enum: ["male", "female", "other"], default: "other"},
  dateofBirth: { type: Date, default: Date.now },


  address: {
    Stream: {type: String, default: ""},
    city: {type: String, default: ""},
    state: {type: String, default: ""},
    country: {type: String, default: ""},
    pinCode: {type: String, default: ""},
  },

    // Company details (from registration)
  companyName: { type: String, trim: true },
  role: { type: String, trim: true, lowercase: true },
  department: { type: String, trim: true, lowercase: true },
  designation: { type: String, trim: true, lowercase: true },
 


  // Audit fields
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true} );

export default mongoose.model("Profile", profileSchema);
