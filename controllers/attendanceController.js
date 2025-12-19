// controllers/attendanceController.js

import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import Company from "../models/Company.js";
import WorkSchedule from "../models/Worksechudule.js"; // spelling corrected
import {
  hhmmToDate,
  minutesBetween,
  minutesToHoursDecimal,
} from "../utils/time.js";



const fullDayThreshold = 8 * 60; // 480 mins
const halfDayThreshold = 4 * 60;

const toDateString = (d) => new Date(d).toISOString().split("T")[0];



export const computeDerivedFields = (record, emp = {}, companyDefaults = {}) => {
  const dateStr = new Date(record.date).toISOString().split("T")[0];

  const fixedIn = emp.fixedIn || companyDefaults.fixedIn || "10:00";
  const fixedOut = emp.fixedOut || companyDefaults.fixedOut || "18:30";

  if (!record.checkIn || !record.checkOut) {
    record.totalMinutes = 0;
    record.totalHours = 0;
    record.missingMinutes = 0;
    record.missingHours = 0;
    record.status = "absent";
    record.lateMinutes = 0;
    record.earlyLeaveMinutes = 0;
    record.overtimeMinutes = 0;
    record.overtimeHours = 0;
    return;
  }

  const checkInDt = new Date(record.checkIn);
  const checkOutDt = new Date(record.checkOut);

  // India time adjust
  checkInDt.setMinutes(checkInDt.getMinutes() + 330);
  checkOutDt.setMinutes(checkOutDt.getMinutes() + 330);

  const totalMins = minutesBetween(checkInDt, checkOutDt);
  record.totalMinutes = totalMins;
  record.totalHours = minutesToHoursDecimal(totalMins);

  const fixedInDt = hhmmToDate(dateStr, fixedIn);
  const fixedOutDt = hhmmToDate(dateStr, fixedOut);

  record.lateMinutes = checkInDt > fixedInDt ? minutesBetween(fixedInDt, checkInDt) : 0;
  record.earlyLeaveMinutes = checkOutDt < fixedOutDt ? minutesBetween(checkOutDt, fixedOutDt) : 0;

  record.overtimeMinutes = checkOutDt > fixedOutDt ? minutesBetween(fixedOutDt, checkOutDt) : 0;
  record.overtimeHours = minutesToHoursDecimal(record.overtimeMinutes);

  const scheduleMinutes = minutesBetween(fixedInDt, fixedOutDt);
  const halfDayThreshold = 4 * 60; // 4 hours
  const minFullDayMinutes = 8 * 60; // 8 hours minimum for full day

  record.missingMinutes = totalMins < scheduleMinutes ? scheduleMinutes - totalMins : 0;
  record.missingHours = minutesToHoursDecimal(record.missingMinutes);

  if (totalMins >= minFullDayMinutes) record.status = "present";
  else if (totalMins >= halfDayThreshold) record.status = "half-day";
  else record.status = "absent";
};
/* =========================================================
   GET COMPANY/EMPLOYEE SCHEDULE
========================================================= */
export async function getSchedule(emp, companyId) {
  // safety
  if (!emp) {
    return { fixedIn: "10:00", fixedOut: "18:30" };
  }

  // 1️ Employee specific schedule
  if (emp.workScheduleId) {
    const schedule = await WorkSchedule.findOne({
      _id: emp.workScheduleId,
      companyId,
      status: "active",
    }).select("inTime outTime");

    if (schedule) {
      return {
        fixedIn: schedule.inTime || "10:00",
        fixedOut: schedule.outTime || "18:30",
      };
    }
  }

  // 2️ Company default schedule
  const company = await Company.findById(companyId)
    .select("fixedIn fixedOut");

  return {
    fixedIn: company?.fixedIn || "10:00",
    fixedOut: company?.fixedOut || "18:30",
  };
}

/* =========================================================
   CHECK-IN
========================================================= */
export const checkIn = async (req, res) => {
  try {
    let employeeId;

    // 👤 Employee → apna
    if (req.user.role === "employee") {
      const emp = await Employee.findOne({
        userId: req.user._id,
        companyId: req.user.companyId,
      });

      if (!emp) return res.status(404).json({ message: "Employee not found" });
      employeeId = emp._id;
    }

    // 🧑‍💼 Admin / Owner → kisi ka bhi
    if (["admin", "owner"].includes(req.user.role)) {
      if (!req.body.employeeId)
        return res.status(400).json({ message: "Employee ID required" });

      employeeId = req.body.employeeId;
    }

    const today = toDateString(new Date());

    // duplicate check
    const already = await Attendance.findOne({
      employeeId,
      date: today,
      companyId: req.user.companyId,
    });

    if (already)
      return res.status(400).json({ message: "Already checked in" });

    // employee fetch
    const emp = await Employee.findOne({
      _id: employeeId,
      companyId: req.user.companyId,
    });

    if (!emp) return res.status(404).json({ message: "Employee not found" });

    const record = await Attendance.create({
      employeeId: emp._id,
      employeeCode: emp.employeeCode,
      companyId: req.user.companyId,
      date: today,
      checkIn: new Date(),
      status: "present",
      name: emp.name,
      avatar: emp.avatar,
    });

    const populated = await record.populate(
      "employeeId",
      "name employeeCode department jobRole avatar"
    );

    res.json({ success: true, data: populated });
  } catch (err) {
    console.error("checkIn Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



/* =========================================================
   CHECK-OUT
========================================================= */
export const checkOut = async (req, res) => {
  try {
    let employeeId;

    if (req.user.role === "employee") {
      const emp = await Employee.findOne({
        userId: req.user._id,
        companyId: req.user.companyId,
      });

      if (!emp) return res.status(404).json({ message: "Employee not found" });
      employeeId = emp._id;
    }

    if (["admin", "owner"].includes(req.user.role)) {
      if (!req.body.employeeId)
        return res.status(400).json({ message: "Employee ID required" });
      employeeId = req.body.employeeId;
    }

    const today = toDateString(new Date());

    const record = await Attendance.findOne({
      employeeId,
      date: today,
      companyId: req.user.companyId,
    });

    if (!record) return res.status(404).json({ message: "Not checked in" });
    if (record.checkOut)
      return res.status(400).json({ message: "Already checked out" });

    record.checkOut = new Date();

    const emp = await Employee.findById(employeeId);
    const schedule = await getSchedule(emp, req.user.companyId);

    computeDerivedFields(record, emp, schedule);

    await record.save();

    const populated = await record.populate(
      "employeeId",
      "name employeeCode department jobRole avatar"
    );

    res.json({ success: true, data: populated });
  } catch (err) {
    console.error("checkOut Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================================================
   UPDATE ATTENDANCE
========================================================= */
export const updateAttendance = async (req, res) => {
  try {
    const rec = await Attendance.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!rec) return res.status(404).json({ message: "Attendance not found" });

    const { checkIn, checkOut, status } = req.body;

    // Update status
    if (status) rec.status = status;

    // Direct ISO time update (no string concatenation)
    rec.checkIn = checkIn || null;
    rec.checkOut = checkOut || null;

    // Fetch employee + schedule
    const emp = await Employee.findById(rec.employeeId);
    const schedule = await getSchedule(emp, req.user.companyId);

    // Recompute totals if both exist
    if (rec.checkIn && rec.checkOut) {
      computeDerivedFields(rec, emp, schedule);
    }

    await rec.save();

    const populated = await rec.populate(
      "employeeId",
      "name employeeCode department jobRole avatar"
    );

    return res.json({ success: true, data: populated });

  } catch (err) {
    console.error("updateAttendance Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



/* =========================================================
   DELETE ATTENDANCE
========================================================= */
export const deleteAttendance = async (req, res) => {
  try {
    const deleted = await Attendance.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!deleted) return res.status(404).json({ message: "Record not found" });

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("deleteAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   GET ATTENDANCE LIST
========================================================= */
export const getAttendance = async (req, res) => {
  try {
    const {
      employeeId,
      status,
      startDate,
      endDate,
      month,
      year,
      page = 1,
      limit = 20,
    } = req.query;

    let query = { companyId: req.user.companyId };

    //  EMPLOYEE → sirf apni attendance
    if (req.user.role === "employee") {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee) {
        return res.json({
          success: true,
          page: Number(page),
          totalPages: 0,
          total: 0,
          data: [],
        });
      }
      query.employeeId = employee._id;
    }

    //  HR / OWNER → filters allowed
    if (["hr", "owner"].includes(req.user.role)) {
      if (employeeId && mongoose.isValidObjectId(employeeId)) {
        query.employeeId = employeeId;
      }
      if (status) query.status = status;
    }

    // -------- DATE FILTER (IST SAFE) --------
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.date = { $gte: start, $lte: end };
    }

    // -------- MONTH FILTER --------
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      query.date = { $gte: start, $lte: end };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const data = await Attendance.find(query)
      .populate({
        path: "employeeId",
        select: "name employeeCode department jobRole avatar",
        populate: {
          path: "userId",
          select: "name email avatar",
        },
      })
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total,
      data,
    });
  } catch (err) {
    console.error("getAttendance Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



