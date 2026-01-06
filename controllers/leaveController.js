// controllers/leaveController.js
import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Leave from "../models/Leave.js";
import Attendance from "../models/Attendance.js";
import WorkSchedule from "../models/Worksechudule.js";

// -------------------------------------------------------------------
// APPLY LEAVE (START DATE - END DATE)
// -------------------------------------------------------------------
export const applyLeave = async (req, res) => {
  try {
    const { startDate, endDate, type, reason, employeeId: bodyEmployeeId } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start > end) {
      return res.status(400).json({ message: "Start date cannot be after end date" });
    }

    let employee;

    // Employee role
    if (req.user.role === "employee") {
      employee = await Employee.findOne({
        employeeId: req.user._id,
        companyId: req.user.companyId,
        status: "active",
      });
    } 
    // Admin / HR / Owner
    else {
      if (!bodyEmployeeId)
        return res.status(400).json({ message: "Employee ID missing" });

      employee = await Employee.findOne({
        _id: bodyEmployeeId,
        companyId: req.user.companyId,
        status: "active",
      });
    }

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Fetch active work schedule
    const schedule = await WorkSchedule.findOne({
      employeeId: employee._id,
      companyId: employee.companyId,
      effectiveFrom: { $lte: start },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: end } }],
    });

    // ----- CHECK EACH DAY -----
    let totalDays = 0;
    let current = new Date(start);

    while (current <= end) {
      const dayName = current.toLocaleDateString("en-US", { weekday: "long" });

      // Weekly off check
      if (schedule?.weeklyOff?.includes(dayName)) {
        return res.status(400).json({
          message: `Cannot apply leave on ${dayName} (${current.toDateString()})`,
        });
      }

      // Overlapping leave check
      const existingLeave = await Leave.findOne({
        employeeId: employee._id,
        startDate: { $lte: current },
        endDate: { $gte: current },
      });

      if (existingLeave) {
        return res.status(400).json({
          message: `Leave already exists on ${current.toDateString()}`,
        });
      }

      totalDays++;
      current.setDate(current.getDate() + 1);
    }

    // Create leave
    const leave = await Leave.create({
      employeeId: employee._id,
      employeeCode: employee.employeeCode,
      companyId: employee.companyId,
      name: employee.name,
      avatar: employee.avatar,
      startDate: start,
      endDate: end,
      totalDays,
      type: type || "personal",
      reason,
      status: "pending",
      createdBy: req.user.id,
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

// -------------------------------------------------------------------
// UPDATE LEAVE STATUS
// -------------------------------------------------------------------
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
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    leave.status = status;
    leave.approvedBy = req.user.id;
    await leave.save();

    // Auto-create attendance for approved leave
    if (status === "approved") {
      const emp = await Employee.findById(leave.employeeId);
      if (emp) {
        let current = new Date(leave.startDate);

        while (current <= leave.endDate) {
          await Attendance.findOneAndUpdate(
            {
              employeeId: emp._id,
              companyId: leave.companyId,
              date: current,
            },
            {
              employeeId: emp._id,
              employeeCode: emp.employeeCode,
              companyId: leave.companyId,
              date: current,
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
            { upsert: true }
          );

          current.setDate(current.getDate() + 1);
        }
      }
    }

    res.json({
      success: true,
      message: `Leave status updated to ${status}`,
      data: leave,
    });
  } catch (err) {
    console.error("Update Leave Status Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------------------------------------------
// GET MY LEAVES
// -------------------------------------------------------------------
export const getMyLeaves = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      employeeId: req.user._id,
      companyId: req.user.companyId,
      status: "active",
    });

    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const leaves = await Leave.find({ employeeId: employee._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (err) {
    console.error("Get My Leaves Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------------------------------------------
// GET ALL LEAVES
// -------------------------------------------------------------------
export const getLeaves = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status } = req.query;
    const query = { companyId: req.user.companyId };
    if (status) query.status = status;

    const leaves = await Leave.find(query).sort({ createdAt: -1 });

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

    if (req.user.role === "employee") {
      const employee = await Employee.findOne({
        employeeId: req.user._id,
        companyId: req.user.companyId,
      });

      if (!employee || leave.employeeId.toString() !== employee._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    await leave.deleteOne();
    res.json({ success: true, message: "Leave deleted successfully" });
  } catch (err) {
    console.error("Delete Leave Error:", err);
    res.status(500).json({ message: err.message });
  }
};
