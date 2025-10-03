import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import employeeRoutes from "./routes/employees.js";
import salaryRoutes from "./routes/salary.js";



dotenv.config();

const app = express();
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "https://frontend-payroll-six.vercel.app",
  "https://www.frontend-payroll-six.vercel.app"
];

app.use(cors({
  origin: function(origin, callback) {
    console.log("Frontend Origin:", origin); // debug
    if (!origin) return callback(null, true); // Postman
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS origin not allowed"), false);
  },
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true
}));


app.get("/", (req, res) => {
  res.send("Backend is live and running!");
});

// Ping route (UptimeRobot isko call karega)
app.get("/ping", (req, res) => {
  res.send("pong");
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/salary", salaryRoutes);


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection failed:', err));


// Local server (sirf local ke liye)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

