import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import Company from "../models/Company.js";
import WorkSchedule from "../models/Worksechudule.js";
import Leave from "../models/Leave.js";
import { hhmmToDate, minutesBetween, minutesToHoursDecimal } from "../utils/time.js";

/* =========================================================
   HELPERS
========================================================= */
const toDateString = (d) => new Date(d).toISOString().split("T")[0];

const getEmployeeFromUser = async (user) => {
  if (!user.employeeId) return null;
  return await Employee.findOne({
    _id: user.employeeId,
    companyId: user.companyId,
  });
}

/* =========================================================
   AUTO CHECKOUT BY SCHEDULE
========================================================= */
export const autoCheckoutBySchedule = async () => {
  try {
    const now = new Date();
    const todayStr = toDateString(now);

    const records = await Attendance.find({
      date: todayStr,
      checkIn: { $ne: null },
      checkOut: null,
    });

    for (let record of records) {
      const emp = await Employee.findById(record.employeeId);
      if (!emp) continue;

      const leave = await Leave.findOne({
        employeeId: emp._id,
        date: record.date,
        status: "approved",
      });
      if (leave) continue;

      const schedule = await WorkSchedule.findOne({
        employeeId: emp._id,
        companyId: record.companyId,
        effectiveFrom: { $lte: record.date },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: record.date } }],
      });

      if (!schedule) continue;

      const dayName = new Date(record.date).toLocaleDateString("en-US", {
        weekday: "long",
      });
      if (schedule.weeklyOff?.includes(dayName)) continue;

      const scheduledOut = hhmmToDate(todayStr, schedule.outTime);
      const outWithGrace = new Date(
        scheduledOut.getTime() + (schedule.gracePeriod || 0) * 60000
      );

      if (now >= outWithGrace) {
        record.checkOut = outWithGrace;
        record.autoCheckout = true;
        await record.save();
      }
    }
  } catch (err) {
    console.error("AutoCheckout Error:", err);
  }
};

/* =========================================================
   DERIVED FIELDS
========================================================= */
export const computeDerivedFields = (record, emp = {}, schedule = {}) => {
  const fixedIn = schedule.fixedIn || "10:00";
  const fixedOut = schedule.fixedOut || "18:30";

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

  checkInDt.setMinutes(checkInDt.getMinutes() + 330);
  checkOutDt.setMinutes(checkOutDt.getMinutes() + 330);

  const totalMins = minutesBetween(checkInDt, checkOutDt);
  record.totalMinutes = totalMins;
  record.totalHours = minutesToHoursDecimal(totalMins);

  const dateStr = toDateString(record.date);
  const fixedInDt = hhmmToDate(dateStr, fixedIn);
  const fixedOutDt = hhmmToDate(dateStr, fixedOut);

  record.lateMinutes = checkInDt > fixedInDt ? minutesBetween(fixedInDt, checkInDt) : 0;
  record.earlyLeaveMinutes = checkOutDt < fixedOutDt ? minutesBetween(checkOutDt, fixedOutDt) : 0;
  record.overtimeMinutes = checkOutDt > fixedOutDt ? minutesBetween(fixedOutDt, checkOutDt) : 0;
  record.overtimeHours = minutesToHoursDecimal(record.overtimeMinutes);

  const minFullDay = 8 * 60;
  const halfDay = 4 * 60;

  if (totalMins >= minFullDay) record.status = "present";
  else if (totalMins >= halfDay) record.status = "half-day";
  else record.status = "absent";
};

/* =========================================================
   GET SCHEDULE
========================================================= */
export async function getSchedule(emp, companyId) {
  if (emp?.workScheduleId) {
    const sch = await WorkSchedule.findOne({
      _id: emp.workScheduleId,
      companyId,
      status: "active",
    }).select("inTime outTime");

    if (sch) return { fixedIn: sch.inTime || "10:00", fixedOut: sch.outTime || "18:30" };
  }

  const company = await Company.findById(companyId).select("fixedIn fixedOut");
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

    if (req.user.role === "employee") {
      const emp = await getEmployeeFromUser(req.user);
      if (!emp) return res.status(404).json({ message: "Employee not found" });
      employeeId = emp._id;
    } else if (["admin", "owner", "hr"].includes(req.user.role)) {
      if (!req.body.employeeId) return res.status(400).json({ message: "Employee ID required" });
      employeeId = req.body.employeeId;
    }

    const today = toDateString(new Date());

    const exists = await Attendance.findOne({ employeeId, date: today, companyId: req.user.companyId });
    if (exists) return res.status(400).json({ message: "Already checked in" });

    const emp = await Employee.findById(employeeId);

    const record = await Attendance.create({
      employeeId: emp._id,
      employeeCode: emp.employeeCode,
      companyId: req.user.companyId,
      name: emp.name,
      avatar: emp.avatar,
      date: today,
      checkIn: new Date(),
      status: "present",
    });

    res.json({ success: true, data: record });
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
      const emp = await getEmployeeFromUser(req.user);
      if (!emp) return res.status(404).json({ message: "Employee not found" });
      employeeId = emp._id;
    } else if (["admin", "owner", "hr"].includes(req.user.role)) {
      if (!req.body.employeeId) return res.status(400).json({ message: "Employee ID required" });
      employeeId = req.body.employeeId;
    }

    const today = toDateString(new Date());

    const record = await Attendance.findOne({ employeeId, date: today, companyId: req.user.companyId });
    if (!record) return res.status(404).json({ message: "Not checked in" });
    if (record.checkOut) return res.status(400).json({ message: "Already checked out" });

    record.checkOut = new Date();

    const emp = await Employee.findById(employeeId);
    const schedule = await getSchedule(emp, req.user.companyId);

    computeDerivedFields(record, emp, schedule);
    await record.save();

    res.json({ success: true, data: record });
  } catch (err) {
    console.error("checkOut Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   GET ATTENDANCE
========================================================= */
export const getAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = { companyId: req.user.companyId };

    if (req.user.role === "employee") {
      const emp = await getEmployeeFromUser(req.user);
      if (!emp) return res.json({ success: true, total: 0, totalPages: 0, data: [] });
      query.employeeId = emp._id; // ab guaranteed sahi employeeId
    }


    const data = await Attendance.find(query)
      .populate({ path: "employeeId", select: "name employeeCode avatar department jobRole" })
      .sort({ date: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Attendance.countDocuments(query);

    res.json({ success: true, total, totalPages: Math.ceil(total / limit), data });
  } catch (err) {
    console.error("getAttendance Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* =========================================================
   DELETE ATTENDANCE
========================================================= */
export const deleteAttendance = async (req, res) => {
  try {
    if (!["owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "You are not allowed to delete attendance" });
    }

    const record = await Attendance.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!record) return res.status(404).json({ message: "Attendance record not found" });

    res.json({ success: true, message: "Attendance deleted successfully", deletedId: record._id });
  } catch (err) {
    console.error("deleteAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   UPDATE ATTENDANCE
========================================================= */
export const updateAttendance = async (req, res) => {
  try {
    if (!["owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "You are not allowed to update attendance" });
    }

    const { checkIn, checkOut, status } = req.body;

    const record = await Attendance.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!record) return res.status(404).json({ message: "Attendance record not found" });

    if (checkIn !== undefined) record.checkIn = checkIn ? new Date(checkIn) : null;
    if (checkOut !== undefined) record.checkOut = checkOut ? new Date(checkOut) : null;
    if (status) record.status = status;

    const emp = await Employee.findOne({ _id: record.employeeId, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ message: "Employee not found for this attendance" });

    const schedule = await getSchedule(emp, req.user.companyId);
    if (record.checkIn && record.checkOut) computeDerivedFields(record, emp, schedule);

    await record.save();

    const populated = await record.populate({
      path: "employeeId",
      select: "name employeeCode department jobRole avatar",
    });

    res.json({ success: true, message: "Attendance updated successfully", data: populated });
  } catch (err) {
    console.error("updateAttendance Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
