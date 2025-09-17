import express from "express";
import Message from "../models/Message.js";
const router = express.Router();

// Get messages for user
router.get("/:userId", async (req, res) => {
  try {
    const messages = await Message.find({ receiverId: req.params.userId })
      .populate("senderId", "name email")
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
router.post("/", async (req, res) => {
  try {
    const message = new Message(req.body);
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark as read
router.put("/:id/read", async (req, res) => {
  try {
    const updated = await Message.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
