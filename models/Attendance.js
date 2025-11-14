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
            required:true,
        },
        status: {
            type: String,
            enum: ["present", "absent", "halfday", "leave"],
            default: "present",
        },
        checkIn: {
            type: String,
            default: null,
        },
        checkOut: {
            type: String,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {timestamps: true}
);

export default mongoose.model("Attendance", AttendanceSchema);