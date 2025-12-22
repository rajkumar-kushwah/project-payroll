// controllers/attendanceController.js

import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import Company from "../models/Company.js";
import WorkSchedule from "../models/Worksechudule.js";
import Leave from "../models/Leave.js";
import { hhmmToDate, minutesBetween, minutesToHoursDecimal } from "../utils/time.js";

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
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const attendances = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd },
      checkIn: { $ne: null },
      checkOut: null,
    });

    for (const record of attendances) {
      const emp = await Employee.findById(record.employeeId);
      if (!emp) continue;

      const leave = await Leave.findOne({
        employeeId: emp._id,
        companyId: record.companyId,
        date: { $gte: todayStart, $lte: todayEnd },
        status: "approved",
      });
      if (leave) continue;

      const schedule = await WorkSchedule.findOne({
        employeeId: emp._id,
        companyId: record.companyId,
        status: "active",
      });
      if (!schedule) continue;

      const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
      if (schedule.weeklyOff?.includes(dayName)) continue;

      const scheduledOut = hhmmToDate(now, schedule.outTime);
      const outWithGrace = new Date(
        scheduledOut.getTime() + (schedule.gracePeriod || 0) * 60000
      );

      if (now >= outWithGrace) {
        record.checkOut = outWithGrace;
        record.autoCheckout = true;
        await record.save();

        console.log(`Auto-checkout: ${emp.employeeCode} at ${outWithGrace.toLocaleTimeString()}`);
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
    record.status = "absent";
    return;
  }

  const checkIn = new Date(record.checkIn);
  const checkOut = new Date(record.checkOut);
  const totalMins = minutesBetween(checkIn, checkOut);

  record.totalMinutes = totalMins;
  record.totalHours = minutesToHoursDecimal(totalMins);

  const fixedIn = hhmmToDate(record.date, schedule.inTime);
  const fixedOut = hhmmToDate(record.date, schedule.outTime);

  record.lateMinutes = checkIn > fixedIn ? minutesBetween(fixedIn, checkIn) : 0;
  record.earlyLeaveMinutes = checkOut < fixedOut ? minutesBetween(checkOut, fixedOut) : 0;
  record.overtimeMinutes = checkOut > fixedOut ? minutesBetween(fixedOut, checkOut) : 0;

  if (totalMins >= 480) record.status = "present";
  else if (totalMins >= 240) record.status = "half-day";
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
