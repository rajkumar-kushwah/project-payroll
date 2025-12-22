// leaveController.js
import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Leave from "../models/Leave.js";
import Attendance from "../models/Attendance.js";
import WorkSchedule from "../models/Worksechudule.js";

// -------------------------------------------------------------------
// APPLY LEAVE
// -------------------------------------------------------------------
export const applyLeave = async (req, res) => {
  try {
    const { date, type, reason } = req.body;

    // 1️⃣ Find employee by company + user
    const employee = await Employee.findOne({ companyId: req.user.companyId, _id: req.body.employeeId || req.user.employeeId });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // 2️⃣ Parse date safely (UTC)
    const [year, month, day] = date.split("-").map(Number);
    const leaveDate = new Date(Date.UTC(year, month - 1, day));

    // 3️⃣ Fetch active schedule
    const schedule = await WorkSchedule.findOne({
      employeeId: employee._id,
      companyId: employee.companyId,
      effectiveFrom: { $lte: leaveDate },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: leaveDate } }],
    });

    // 4️⃣ Weekly off check
    const dayName = leaveDate.toLocaleDateString("en-US", { weekday: "long" });
    if (schedule?.weeklyOff?.includes(dayName)) {
      return res.status(400).json({ message: `Cannot apply leave on ${dayName}. It is already a weekly off.` });
    }

    // 5️⃣ Duplicate leave check
    const alreadyApplied = await Leave.findOne({ employeeId: employee._id, date: leaveDate });
    if (alreadyApplied) return res.status(400).json({ message: "Leave already applied for this date" });

    // 6️⃣ Create leave
    const leave = await Leave.create({
      employeeId: employee._id,
      employeeCode: employee.employeeCode,
      companyId: employee.companyId,
      name: employee.name,
      avatar: employee.avatar,
      date: leaveDate,
      type,
      reason,
      createdBy: req.user._id,
      status: "pending",
    });

    res.status(201).json({ success: true, message: "Leave applied successfully", data: leave });

  } catch (err) {
    console.error("Apply Leave Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------------------------------------------
// UPDATE LEAVE STATUS (APPROVE / REJECT)
// -------------------------------------------------------------------
export const updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    if (!["admin", "owner", "hr"].includes(req.user.role)) return res.status(403).json({ message: "Access denied" });

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    leave.status = status;
    leave.approvedBy = req.user._id;
    await leave.save();

    //  ✅ AUTO CREATE / UPDATE ATTENDANCE for approved leave
    if (status === "approved") {
      const emp = await Employee.findById(leave.employeeId);
      if (emp) {
        await Attendance.findOneAndUpdate(
          { employeeId: emp._id, companyId: leave.companyId, date: leave.date },
          {
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            companyId: leave.companyId,
            date: leave.date,
            status: "leave",
            logType: "system",
            isPaid: true,
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
          { upsert: true, new: true }
        );
      }
    }

    res.json({ success: true, message: `Leave status updated to ${status}`, data: leave });

  } catch (err) {
    console.error("Update Leave Status Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------------------------------------------
// GET MY LEAVES (EMPLOYEE)
// -------------------------------------------------------------------
export const getMyLeaves = async (req, res) => {
  try {
    const employee = await Employee.findOne({ companyId: req.user.companyId, _id: req.body.employeeId || req.user.employeeId });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const leaves = await Leave.find({ employeeId: employee._id })
      .populate("employeeId", "name email employeeCode role phone avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });

  } catch (err) {
    console.error("Get My Leaves Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------------------------------------------
// GET ALL LEAVES (ADMIN / HR / OWNER)
// -------------------------------------------------------------------
export const getLeaves = async (req, res) => {
  try {
    const { status } = req.query;

    if (!["admin", "owner", "hr"].includes(req.user.role)) return res.status(403).json({ message: "Access denied" });

    const query = { companyId: req.user.companyId };
    if (status) query.status = status;

    const leaves = await Leave.find(query)
      .populate("employeeId", "name email employeeCode role phone avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: leaves.length, data: leaves });

  } catch (err) {
    console.error("Get Leaves Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------------------------------------------
// DELETE LEAVE
// -------------------------------------------------------------------
export const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    // Only employee (self) or HR / Owner can delete
    if (req.user.role === "employee" && leave.employeeId.toString() !== (req.body.employeeId || req.user.employeeId).toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    await leave.deleteOne();

    res.json({ success: true, message: "Leave deleted successfully" });

  } catch (err) {
    console.error("Delete Leave Error:", err);
    res.status(500).json({ message: err.message });
  }
};
