import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import employeeRoutes from "./routes/employees.js";
import salaryRoutes from "./routes/salary.js";
import path from "path";
import fs from "fs";


const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}


dotenv.config();

const app = express();
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "https://frontend-payroll-six.vercel.app"
];


app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // Postman ya server-to-server request ke liye
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // cookies ya auth headers allow karne ke liye
}));

app.get("/", (req, res) => {
  res.send("Backend is live and running!");
});

app.use(express.urlencoded({ extended: true }));

// Ping route (UptimeRobot isko call karega)
app.get("/ping", (req, res) => {
  res.send("pong");
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection failed:', err));


// Local server (sirf local ke liye)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

