import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import Company from "../models/Company.js";
import WorkSchedule from "../models/Worksechudel.js"; // spelling corrected
import {
  hhmmToDate,
  minutesBetween,
  minutesToHoursDecimal,
} from "../utils/time.js";

const FULL_DAY_MINUTES = 8 * 60;
const HALF_DAY_MINUTES = 4 * 60;

const toDateString = (d) => new Date(d).toISOString().split("T")[0];

/* =========================================================
   COMPUTE DERIVED FIELDS
========================================================= */
export const computeDerivedFields = (record, emp = {}, companyDefaults = {}) => {
  const dateStr = toDateString(record.date);

  const fixedIn = emp.fixedIn || companyDefaults.fixedIn || "10:00";
  const fixedOut = emp.fixedOut || companyDefaults.fixedOut || "18:30";

  if (!record.checkIn || !record.checkOut) {
    record.totalMinutes = 0;
    record.totalHours = 0;
    record.missingMinutes = FULL_DAY_MINUTES;
    record.missingHours = FULL_DAY_MINUTES / 60;
    record.status = "absent";
    return;
  }

  const checkInDt = new Date(record.checkIn);
  const checkOutDt = new Date(record.checkOut);

  const totalMins = minutesBetween(checkInDt, checkOutDt);
  record.totalMinutes = totalMins;
  record.totalHours = minutesToHoursDecimal(totalMins);

  const fixedInDt = hhmmToDate(dateStr, fixedIn);
  const fixedOutDt = hhmmToDate(dateStr, fixedOut);

  record.lateMinutes = checkInDt > fixedInDt ? minutesBetween(fixedInDt, checkInDt) : 0;
  record.earlyLeaveMinutes =
    checkOutDt < fixedOutDt ? minutesBetween(checkOutDt, fixedOutDt) : 0;

  record.overtimeMinutes =
    checkOutDt > fixedOutDt ? minutesBetween(fixedOutDt, checkOutDt) : 0;

  record.overtimeHours = minutesToHoursDecimal(record.overtimeMinutes);
  record.missingMinutes = totalMins < FULL_DAY_MINUTES ? FULL_DAY_MINUTES - totalMins : 0;
  record.missingHours = minutesToHoursDecimal(record.missingMinutes);

  if (totalMins >= FULL_DAY_MINUTES) record.status = "present";
  else if (totalMins >= HALF_DAY_MINUTES) record.status = "half-day";
  else record.status = "absent";
};

/* =========================================================
   GET COMPANY/EMPLOYEE SCHEDULE
========================================================= */
async function getSchedule(emp, companyId) {
  if (emp.workScheduleId) {
    const s = await WorkSchedule.findOne({
      _id: emp.workScheduleId,
      companyId,
      status: "active",
    });
    if (s) return { fixedIn: s.inTime || "10:00", fixedOut: s.outTime || "18:30" };
  }
  const company = await Company.findById(companyId).select("fixedIn fixedOut");
  return { fixedIn: company?.fixedIn || "10:00", fixedOut: company?.fixedOut || "18:30" };
}

/* =========================================================
   CHECK-IN
========================================================= */
export const checkIn = async (req, res) => {
  try {
    const targetId =
      ["admin", "owner"].includes(req.user.role) && req.body.employeeId
        ? req.body.employeeId
        : req.user._id;

    const today = toDateString(new Date());

    // check duplicate
    const already = await Attendance.findOne({
      employeeId: targetId,
      date: today,
      companyId: req.user.companyId,
    });

    if (already) return res.status(400).json({ message: "Already checked in" });

    // 🔥 FIX: Fetch employee for code
    const emp = await Employee.findById(targetId).select("employeeCode");
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    // create attendance
    const record = await Attendance.create({
      employeeId: targetId,
      employeeCode: emp.employeeCode,   // 👍 REQUIRED FIELD FIXED
      companyId: req.user.companyId,
      date: today,
      checkIn: new Date(),
      status: "present",
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
    const targetId =
      ["admin", "owner"].includes(req.user.role) && req.body.employeeId
        ? req.body.employeeId
        : req.user._id;

    const today = toDateString(new Date());

    const record = await Attendance.findOne({
      employeeId: targetId,
      date: today,
      companyId: req.user.companyId,
    });

    if (!record) return res.status(404).json({ message: "Not checked in" });
    if (record.checkOut)
      return res.status(400).json({ message: "Already checked out" });

    record.checkOut = new Date();

    const emp = await Employee.findById(targetId);
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

    const { date, checkIn, checkOut, remarks } = req.body;

    if (date) rec.date = toDateString(date);
    if (remarks !== undefined) rec.remarks = remarks;
    if (checkIn) rec.checkIn = new Date(`${rec.date}T${checkIn}`);
    if (checkOut) rec.checkOut = new Date(`${rec.date}T${checkOut}`);

    const emp = await Employee.findById(rec.employeeId);
    const schedule = await getSchedule(emp, req.user.companyId);

    if (rec.checkIn && rec.checkOut) computeDerivedFields(rec, emp, schedule);

    await rec.save();

    const populated = await rec.populate(
      "employeeId",
      "name employeeCode department jobRole avatar"
    );

    res.json({ success: true, data: populated });
  } catch (err) {
    console.error("updateAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
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
    const { employeeId, status, startDate, endDate, month, year, page = 1, limit = 20 } =
      req.query;

    const query = { companyId: req.user.companyId };

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };

    if (month && year) {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const end = `${year}-${String(month).padStart(2, "0")}-31`;
      query.date = { $gte: start, $lte: end };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const data = await Attendance.find(query)
      .populate("employeeId", "name employeeCode department jobRole avatar")
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

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
    res.status(500).json({ message: "Server error" });
  }
};
