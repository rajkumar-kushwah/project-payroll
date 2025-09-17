// models/Candidate.js
import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    skills: { type: [String], default: [] },
    status: { type: String, enum: ["applied", "interview", "hired", "rejected"], default: "applied" },
  },
  { timestamps: true }
);

const Candidate = mongoose.model("Candidate", candidateSchema);
export default Candidate;
