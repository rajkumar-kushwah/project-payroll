import mongoose from "mongoose";

const blacklistSchema = new mongoose.Schema({
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // token 1 दिन बाद अपने आप delete हो जाएगा
});

export default mongoose.model("Blacklist", blacklistSchema);
