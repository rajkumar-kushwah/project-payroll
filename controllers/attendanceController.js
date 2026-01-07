// controllers/attendanceController.js

import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import Company from "../models/Company.js";
import WorkSchedule from "../models/WorkSchedule.js";
import Leave from "../models/Leave.js";
import { hhmmToDate, minutesBetween, minutesToHoursDecimal } from "../utils/time.js";
import OfficeHoliday from "../models/OfficeHoliday.js";



/* ======================================================
   SYNC OFFICE LEAVES INTO ATTENDANCE
====================================================== */


export const syncOfficeLeaves = async (companyId) => {
  try {
    // 1️ Sabhi active employees
    const employees = await Employee.find({ companyId, status: "active" });

    // 2️ Sabhi Office Leaves for this company
    const leaves = await OfficeHoliday.find({ companyId });

    for (const leave of leaves) {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);

      for (const emp of employees) {
        // 🔹 Remove old attendance entries for this period for this employee
        await Attendance.deleteMany({
          employeeId: emp._id,
          companyId,
          date: { $gte: leaveStart, $lte: leaveEnd },
        });

        // 🔹 Create new leave attendance for each day
        for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
          await Attendance.create({
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            name: emp.name,
            avatar: emp.avatar,
            companyId: companyId,
            date: new Date(d),
            checkIn: null,
            checkOut: null,
            totalMinutes: 0,
            totalHours: 0,
            status: "office leave",
            logType: "system",
          });
        }
      }
    }

    console.log("Office leaves synced into Attendance successfully!");
  } catch (err) {
    console.error("SyncOfficeLeaves Error:", err);
  }
};

/* ======================================================
   HELPERS
====================================================== */
const toDateString = (d) => new Date(d).toISOString().split("T")[0];

const getEmployeeFromToken = async (req) => {
  return await Employee.findOne({
    employeeId: req.user._id, // Correct mapping
    companyId: req.user.companyId,
    status: "active",
  });
};

/* ======================================================
   AUTO CHECKOUT BY WORK SCHEDULE
====================================================== */
export const autoCheckoutBySchedule = async () => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD format

    // 🔹 Attendances with checkIn but no checkOut
    const attendances = await Attendance.find({
      date: todayStr,
      checkIn: { $ne: null },
      checkOut: null,
    });

    console.log("Attendances to process:", attendances.length);

    for (const record of attendances) {
      const emp = await Employee.findById(record.employeeId);
      if (!emp) continue;

      // 🔹 Skip if employee has approved leave
      const leave = await Leave.findOne({
        employeeId: emp._id,
        companyId: record.companyId,
        startDate: { $lte: new Date(todayStr) },
        endDate: { $gte: new Date(todayStr) },
        status: "approved",
      });
      if (leave) continue;

      // 🔹 Get active work schedule
      const schedule = await WorkSchedule.findOne({
        employeeId: emp._id,
        companyId: record.companyId,
        status: "active",
      });
      if (!schedule) continue;

      // 🔹 Skip if weekly off
      const dayName = new Date(todayStr).toLocaleDateString("en-US", { weekday: "long" });
      if (schedule.weeklyOff?.includes(dayName)) continue;

      // 🔹 Scheduled out and grace
      const scheduledOut = hhmmToDate(todayStr, schedule.outTime); 
      const outWithGrace = new Date(scheduledOut.getTime() + (schedule.gracePeriod || 0) * 60000);

      // 🔹 Only auto-checkout if time passed and checkout missing
      if (now >= outWithGrace) {
        // ✅ Use current time, not fixed outTime
        record.checkOut = now;
        record.autoCheckout = true;

        // Recalculate totalHours, status, etc.
        const { computeDerivedFields } = require("./attendanceController"); // ya apne import hisaab se
        computeDerivedFields(record, schedule);

        await record.save();
        console.log(`Auto-checkout: ${emp.employeeCode} at ${now.toLocaleTimeString()}`);
      } else {
        console.log(`Not yet time for auto-checkout: ${emp.employeeCode}`);
      }
    }
  } catch (err) {
    console.error("AutoCheckout Error:", err);
  }
};


/* ======================================================
   DERIVED FIELDS CALCULATION
====================================================== */
export const computeDerivedFields = (record, schedule) => {
  if (!record.checkIn || !record.checkOut) {
    record.totalMinutes = 0;
    record.totalHours = 0;
    record.lateMinutes = 0;
    record.earlyLeaveMinutes = 0;
    record.overtimeMinutes = 0;
    record.status = "absent";
    return;
  }

  const checkIn = new Date(record.checkIn);
  const checkOut = new Date(record.checkOut);

  const fixedIn = hhmmToDate(record.date, schedule.inTime);
  const fixedOut = hhmmToDate(record.date, schedule.outTime);

  // 1️⃣ Total worked minutes
  const totalMins = minutesBetween(checkIn, checkOut);
  record.totalMinutes = totalMins;
  record.totalHours = minutesToHoursDecimal(totalMins);

  // 2️⃣ Late / early leave
  record.lateMinutes = checkIn > fixedIn ? minutesBetween(fixedIn, checkIn) : 0;
  record.earlyLeaveMinutes = checkOut < fixedOut ? minutesBetween(checkOut, fixedOut) : 0;

  // 3️⃣ Overtime = jitna kaam schedule ke baad kiya
  record.overtimeMinutes = checkOut > fixedOut ? minutesBetween(fixedOut, checkOut) : 0;

  // 4️⃣ Status
  if (totalMins >= 480) record.status = "present"; // 8 hours
  else if (totalMins >= 240) record.status = "half-day"; // 4 hours
  else record.status = "absent";
};


/* ======================================================
   GET WORK SCHEDULE
====================================================== */
export const getSchedule = async (emp, companyId) => {
  const ws = await WorkSchedule.findOne({
    employeeId: emp._id,
    companyId,
    status: "active",
  });

  if (ws) return ws;

  const company = await Company.findById(companyId);
  return {
    inTime: company?.fixedIn || "10:00",
    outTime: company?.fixedOut || "18:30",
  };
};

/* ======================================================
   CHECK-IN
====================================================== */
export const checkIn = async (req, res) => {
  try {
    let emp;

    if (req.user.role === "employee") {
      emp = await getEmployeeFromToken(req);
      if (!emp) return res.status(404).json({ message: "Employee not found" });
    }

    if (["admin", "owner", "hr"].includes(req.user.role)) {
      if (!req.body.employeeId)
        return res.status(400).json({ message: "employeeId required" });
      emp = await Employee.findById(req.body.employeeId);
    }

    const today = toDateString(new Date());

    const exists = await Attendance.findOne({
      employeeId: emp._id,
      companyId: req.user.companyId,
      date: today,
    });
    if (exists)
      return res.status(400).json({ message: "Already checked in" });

    const record = await Attendance.create({
      employeeId: emp._id,
      employeeCode: emp.employeeCode,
      name: emp.name,
      avatar: emp.avatar,
      companyId: req.user.companyId,
      date: today,
      checkIn: new Date(),
      status: "present",
    });

    res.json({ success: true, data: record });
  } catch (err) {
    console.error("CheckIn Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   CHECK-OUT
====================================================== */
export const checkOut = async (req, res) => {
  try {
    let emp;

    if (req.user.role === "employee") {
      emp = await getEmployeeFromToken(req);
      if (!emp) return res.status(404).json({ message: "Employee not found" });
    }

    if (["admin", "owner", "hr"].includes(req.user.role)) {
      if (!req.body.employeeId)
        return res.status(400).json({ message: "employeeId required" });
      emp = await Employee.findById(req.body.employeeId);
    }

    const today = toDateString(new Date());

    const record = await Attendance.findOne({
      employeeId: emp._id,
      companyId: req.user.companyId,
      date: today,
    });

    if (!record)
      return res.status(404).json({ message: "Check-in not found" });

    if (record.checkOut)
      return res.status(400).json({ message: "Already checked out" });

    record.checkOut = new Date();

    const schedule = await getSchedule(emp, req.user.companyId);
    computeDerivedFields(record, schedule);

    await record.save();
    res.json({ success: true, data: record });
  } catch (err) {
    console.error("CheckOut Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   UPDATE ATTENDANCE (HR / OWNER)
====================================================== */
export const updateAttendance = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const record = await Attendance.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });
    if (!record)
      return res.status(404).json({ message: "Attendance not found" });

    if (req.body.checkIn) record.checkIn = new Date(req.body.checkIn);
    if (req.body.checkOut) record.checkOut = new Date(req.body.checkOut);
    if (req.body.status) record.status = req.body.status;

    const emp = await Employee.findById(record.employeeId);
    const schedule = await getSchedule(emp, req.user.companyId);

    if (record.checkIn && record.checkOut) {
      computeDerivedFields(record, schedule);
    }

    await record.save();
    res.json({ success: true, data: record });
  } catch (err) {
    console.error("UpdateAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   DELETE ATTENDANCE
====================================================== */
export const deleteAttendance = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const deleted = await Attendance.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!deleted)
      return res.status(404).json({ message: "Attendance not found" });

    res.json({ success: true, message: "Attendance deleted" });
  } catch (err) {
    console.error("DeleteAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET ATTENDANCE LIST
====================================================== */
export const getAttendance = async (req, res) => {
  try {
    let query = { companyId: req.user.companyId };

    if (req.user.role === "employee") {
      const emp = await getEmployeeFromToken(req);
      if (!emp) return res.json({ success: true, data: [] });
      query.employeeId = emp._id;
    }

    if (["admin", "owner", "hr"].includes(req.user.role)) {
      if (req.query.employeeId) query.employeeId = req.query.employeeId;
      if (req.query.status) query.status = req.query.status;
    }

    const data = await Attendance.find(query)
      .populate("employeeId", "name employeeCode department avatar")
      .sort({ date: -1 });

    res.json({ success: true, data });
  } catch (err) {
    console.error("GetAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
