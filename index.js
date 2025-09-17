import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import employeeRoutes from "./routes/employees.js";
import candidateRoutes from "./routes/candidates.js";
import dashboardRoutes from "./routes/dashboard.js";
import notification from "./routes/notification.js";
import message from "./routes/message.js";
import payrollRoutes from "./routes/payroll.js";

dotenv.config();

const app = express();
app.use(express.json());

// Only allow requests from your frontend
app.use(cors({
  origin: "http://localhost:5173", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.get("/", (req, res) => {
  res.send("Backend is live and running!");
});

// API routes
app.use("/api/payrolls", payrollRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notification);
app.use("/api/messages", message);
app.use("/api/auth", authRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection failed:', err));


// Local server (sirf local ke liye)
  const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

