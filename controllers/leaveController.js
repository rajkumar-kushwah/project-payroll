// leaveController.js
import Employee from "../models/Employee.js";
import Leave from "../models/Leave.js";
import Attendance from "../models/Attendance.js";
import mongoose from "mongoose";


// export const applyLeave = async (req, res) => {
//   try {
//     const { date, type, reason } = req.body;
//     const userId = req.user._id;

//     // First, find the employee document
//     const employee = await Employee.findOne({ userId });
//     if (!employee) return res.status(404).json({ message: "Employee not found" });

    
//     // Then check if leave already applied for this employee on the same date
//     const alreadyApplied = await Leave.findOne({
//       employeeId: employee._id,
//       date,
//     });

//     if (alreadyApplied) {
//       return res.status(400).json({
//         message: "Leave already applied for this date",
//       });
//     }

//     // Create leave
//     const leave = await Leave.create({
//       employeeId: employee._id,
//       employeeCode: employee.employeeCode,
//       companyId: employee.companyId,
//       name: employee.name,      
//       avatar: employee.avatar,
//       date,
//       type,
//       reason,
//       createdBy: userId,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Leave applied successfully",
//       data: leave,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

export const applyLeave = async (req, res) => {
  try {
    const { date, type, reason } = req.body;
    const userId = req.user._id;

    // Find employee
    const employee = await Employee.findOne({ userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // 🔑 Normalize date (same day only)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // ❌ Block only SAME DATE
    const alreadyApplied = await Leave.findOne({
      employeeId: employee._id,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (alreadyApplied) {
      return res.status(400).json({
        message: "Leave already applied for this date",
      });
    }

    // ✅ Create leave (same month unlimited allowed)
    const leave = await Leave.create({
      employeeId: employee._id,
      employeeCode: employee.employeeCode,
      companyId: employee.companyId,
      name: employee.name,
      avatar: employee.avatar,
      date: startOfDay, // normalized
      type,
      reason,
      createdBy: userId,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Leave applied successfully",
      data: leave,
    });
  } catch (err) {
    console.error("Apply Leave Error:", err);
    res.status(500).json({ message: err.message });
  }
};

 

// export const updateLeaveStatus = async (req, res) => {
//   try {
//     const { status } = req.body;

//     if (!["approved", "rejected"].includes(status)) {
//       return res.status(400).json({ message: "Invalid status" });
//     }

//     if (!["admin", "owner", "hr"].includes(req.user.role)) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     const leave = await Leave.findById(req.params.id);
//     if (!leave) {
//       return res.status(404).json({ message: "Leave not found" });
//     }

//     leave.status = status;
//     leave.approvedBy = req.user._id;

//     await leave.save();

//     res.json({
//       success: true,
//       message: `Leave status updated to ${status}`,
//       data: leave,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };


export const updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    leave.status = status;
    leave.approvedBy = req.user._id;

    await leave.save();

    //  AUTO-CREATE / UPDATE ATTENDANCE (sirf approved leaves ke liye)
    if (status === "approved") {
      const emp = await Employee.findById(leave.employeeId);
      if (emp) {
        await Attendance.findOneAndUpdate(
          {
            employeeId: emp._id,
            companyId: leave.companyId,
            date: leave.date,
          },
          {
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            companyId: leave.companyId,
            date: leave.date,
            status: "leave",
            logType: "system",
            isPaid: true, // ya leave.isPaid agar schema me hai
            checkIn: null,
            checkOut: null,
            totalHours: 0,
            overtimeHours: 0,
            missingHours: 0,
            isLate: false,
            lateByMinutes: 0,
            isEarlyCheckout: false,
            earlyByMinutes: 0,
            isOvertime: false,
            name: emp.name,
            avatar: emp.avatar,
          },
          { upsert: true, new: true } // create if not exists
        );
      }
    }

    res.json({
      success: true,
      message: `Leave status updated to ${status}`,
      data: leave,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const leaves = await Leave.find({ employeeId: employee._id })
    .populate("employeeId", "name email employeeCode role phone avatar")
    .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// GET /api/leaves?status=pending|approved|rejected
export const getLeaves = async (req, res) => {
  try {
    const { status } = req.query;

    // sirf admin / owner / hr
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { companyId: req.user.companyId };
    if (status) query.status = status; 

    const leaves = await Leave.find(query)
      .populate("employeeId", "name email employeeCode role phone avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: leaves.length, data: leaves });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


// controllers/leaveController.js
export const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    if (
      req.user.role === "employee" &&
      leave.employeeId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Use deleteOne instead of remove
    await leave.deleteOne();

    res.json({ success: true, message: "Leave deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
