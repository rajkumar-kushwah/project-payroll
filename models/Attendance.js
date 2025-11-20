import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD format validation
    },

    status: {
      type: String,
      enum: ["present", "absent", "halfday", "leave"],
      default: "present",
    },

    checkIn: {
      type: String, // Example: "09:30 AM"
      default: null,
    },

    checkOut: {
      type: String, // Example: "06:00 PM"
      default: null,
    },

    totalHours: {
      type: Number, // Total hours worked for the day
      default: 0,
    },

    remarks: {
      type: String, // Optional notes like "Worked from home"
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Owner/Admin who recorded attendance
    },
  },
  { timestamps: true }
);

// ---------------------------------------------------
// Prevent duplicate attendance record for same employee/date
// ---------------------------------------------------
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// ---------------------------------------------------
// Auto-calculate totalHours if checkIn & checkOut provided
// ---------------------------------------------------
AttendanceSchema.pre("save", function (next) {
  if (this.checkIn && this.checkOut) {
    const parseTime = (timeStr) => {
      const [hourMin, meridian] = timeStr.split(" ");
      let [hours, minutes] = hourMin.split(":").map(Number);
      if (meridian.toLowerCase() === "pm" && hours !== 12) hours += 12;
      if (meridian.toLowerCase() === "am" && hours === 12) hours = 0;
      return hours * 60 + minutes; // return total minutes
    };

    const minutesWorked = parseTime(this.checkOut) - parseTime(this.checkIn);
    this.totalHours = Math.max(0, minutesWorked / 60); // Convert to hours
  } else {
    this.totalHours = 0;
  }

  next();
});

export default mongoose.model("Attendance", AttendanceSchema);
