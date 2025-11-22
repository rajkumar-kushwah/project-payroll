// controllers/attendanceController.js
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import Company from "../models/Company.js";
import mongoose from "mongoose";
import { hhmmToDate, minutesBetween, minutesToHoursDecimal } from "../utils/time.js";

/**
 * Configurable defaults (can be moved to Company settings)
 */
const DEFAULT_FIXED_IN = "10:00";
const DEFAULT_FIXED_OUT = "18:30";
const FULL_DAY_MINUTES = 8 * 60; // 8 hours (change if you want 8.5)
const HALF_DAY_MINUTES = 4 * 60; // 4 hours

// helper: yyyy-mm-dd
const toDateString = (d) => new Date(d).toISOString().split("T")[0];

/* ============================================================
   computeDerivedFields(record, emp, companyDefaults)
   - fills: totalMinutes, totalHours, lateMinutes, earlyLeaveMinutes, overtimeMinutes, status
   ============================================================ */
const computeDerivedFields = (record, emp = {}, companyDefaults = {}) => {
  const dateStr = new Date(record.date).toISOString().split("T")[0];

  const fixedIn = emp.fixedIn || companyDefaults.fixedIn || DEFAULT_FIXED_IN;
  const fixedOut = emp.fixedOut || companyDefaults.fixedOut || DEFAULT_FIXED_OUT;

  if (!record.checkIn || !record.checkOut) {
    record.totalMinutes = 0;
    record.totalHours = 0;
    record.lateMinutes = 0;
    record.earlyLeaveMinutes = 0;
    record.overtimeMinutes = 0;
    // status remains as-is or set to absent if no checkIn/checkOut
    if (!record.checkIn && !record.checkOut) record.status = "absent";
    return;
  }

  const checkInDt = new Date(record.checkIn);
  const checkOutDt = new Date(record.checkOut);

  // total minutes worked
  const totalMins = minutesBetween(checkInDt, checkOutDt);
  record.totalMinutes = totalMins;
  record.totalHours = minutesToHoursDecimal(totalMins);

  // fixed times as Date objects (for that date)
  const fixedInDt = hhmmToDate(dateStr, fixedIn);
  const fixedOutDt = hhmmToDate(dateStr, fixedOut);

  // late minutes (if checked in after fixedIn)
  record.lateMinutes = checkInDt > fixedInDt ? minutesBetween(fixedInDt, checkInDt) : 0;

  // early leave minutes (if checked out before fixedOut)
  record.earlyLeaveMinutes = checkOutDt < fixedOutDt ? minutesBetween(checkOutDt, fixedOutDt) : 0;

  // overtime minutes (if checked out after fixedOut)
  record.overtimeMinutes = checkOutDt > fixedOutDt ? minutesBetween(fixedOutDt, checkOutDt) : 0;

  // status based on total minutes thresholds
  if (totalMins < HALF_DAY_MINUTES) record.status = "absent";
  else if (totalMins >= HALF_DAY_MINUTES && totalMins < FULL_DAY_MINUTES) record.status = "half-day";
  else record.status = "present";
};

/* ============================================================
   1) Add Attendance (Manual by Admin/Owner) - company-secure
=============================================================== */
export const addAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, remarks } = req.body;

    if (!mongoose.isValidObjectId(employeeId))
      return res.status(400).json({ message: "Invalid employee ID" });

    // ensure employee belongs to same company
    const emp = await Employee.findOne({ _id: employeeId, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ message: "Employee not found or unauthorized" });

    const recordDate = date ? new Date(date).toISOString().split("T")[0] : toDateString(new Date());

    // ensure attendance for that company/date/employee doesn't already exist
    const exists = await Attendance.findOne({
      employeeId,
      date: recordDate,
      companyId: req.user.companyId,
    });
    if (exists) return res.status(400).json({ message: "Attendance already exists for this date" });

    // parse checkIn/checkOut - allow ISO or "HH:mm"
    const checkInDt = checkIn ? new Date(checkIn.includes("T") ? checkIn : `${recordDate}T${checkIn}`) : undefined;
    const checkOutDt = checkOut ? new Date(checkOut.includes("T") ? checkOut : `${recordDate}T${checkOut}`) : undefined;

    const record = new Attendance({
      employeeId,
      companyId: req.user.companyId,
      date: recordDate,
      checkIn: checkInDt,
      checkOut: checkOutDt,
      remarks: remarks || "",
      status: status || (checkInDt ? "present" : "absent"),
      createdBy: req.user._id,
    });

    // get company defaults if needed
    const company = await Company.findById(req.user.companyId).select("onboardingWorkflow fixedIn fixedOut");
    const companyDefaults = {
      fixedIn: (company && company.fixedIn) || undefined,
      fixedOut: (company && company.fixedOut) || undefined,
    };

    // compute derived fields if both times exist
    if (checkInDt && checkOutDt) {
      computeDerivedFields(record, emp, companyDefaults);
    }

    await record.save();
    const populated = await record.populate("employeeId", "name employeeCode department jobRole");
    res.status(201).json({ success: true, message: "Attendance added", data: populated });
  } catch (err) {
    console.error("addAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   2) Update Attendance (admin/owner) - company-secure
=============================================================== */
export const updateAttendance = async (req, res) => {
  try {
    const { date, status, checkIn, checkOut, remarks } = req.body;
    const id = req.params.id;

    const rec = await Attendance.findOne({ _id: id, companyId: req.user.companyId });
    if (!rec) return res.status(404).json({ message: "Attendance not found" });

    // apply updates
    if (date) rec.date = new Date(date).toISOString().split("T")[0];
    if (status) rec.status = status;
    if (remarks !== undefined) rec.remarks = remarks;

    // parse checkIn/checkOut if supplied (accept ISO or HH:mm)
    if (checkIn) rec.checkIn = new Date(checkIn.includes("T") ? checkIn : `${rec.date}T${checkIn}`);
    if (checkOut) rec.checkOut = new Date(checkOut.includes("T") ? checkOut : `${rec.date}T${checkOut}`);

    // fetch employee with company check
    const emp = await Employee.findOne({ _id: rec.employeeId, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ message: "Employee not found or unauthorized" });

    // fetch company defaults
    const company = await Company.findById(req.user.companyId).select("fixedIn fixedOut");

    if (rec.checkIn && rec.checkOut) {
      computeDerivedFields(rec, emp, company ? { fixedIn: company.fixedIn, fixedOut: company.fixedOut } : {});
    } else {
      rec.totalMinutes = 0;
      rec.totalHours = 0;
      rec.lateMinutes = 0;
      rec.earlyLeaveMinutes = 0;
      rec.overtimeMinutes = 0;
    }

    await rec.save();
    const populated = await rec.populate("employeeId", "name employeeCode department jobRole");
    res.json({ success: true, message: "Attendance updated", data: populated });
  } catch (err) {
    console.error("updateAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   3) Delete Attendance - company-secure
=============================================================== */
export const deleteAttendance = async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await Attendance.findOneAndDelete({
      _id: id,
      companyId: req.user.companyId,
    });

    if (!deleted) return res.status(404).json({ message: "Record not found or unauthorized" });

    res.json({ success: true, message: "Attendance deleted" });
  } catch (err) {
    console.error("deleteAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   4) Check-In (Employee / Admin impersonation) - company-secure
=============================================================== */
export const checkIn = async (req, res) => {
  try {
    const targetId =
      ["admin", "owner"].includes(req.user.role) && req.body.employeeId
        ? req.body.employeeId
        : req.user._id;

    if (!mongoose.isValidObjectId(targetId)) return res.status(400).json({ message: "Invalid employee ID" });

    const emp = await Employee.findOne({ _id: targetId, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ message: "Employee unauthorized" });

    const today = toDateString(new Date());

    const exists = await Attendance.findOne({
      employeeId: targetId,
      date: today,
      companyId: req.user.companyId,
    });
    if (exists) return res.status(400).json({ message: "Already checked in today" });

    const record = await Attendance.create({
      employeeId: targetId,
      companyId: req.user.companyId,
      checkIn: new Date(),
      date: today,
      status: "present",
      createdBy: req.user._id,
    });

    const populated = await record.populate("employeeId", "name employeeCode department jobRole");
    res.status(201).json({ success: true, message: "Checked in", data: populated });
  } catch (err) {
    console.error("checkIn Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   5) Check-Out (Employee / Admin) - company-secure
   Computes derived fields using employee/company settings
=============================================================== */
export const checkOut = async (req, res) => {
  try {
    const targetId =
      ["admin", "owner"].includes(req.user.role) && req.body.employeeId
        ? req.body.employeeId
        : req.user._id;

    if (!mongoose.isValidObjectId(targetId)) return res.status(400).json({ message: "Invalid employee ID" });

    const today = toDateString(new Date());

    const record = await Attendance.findOne({
      employeeId: targetId,
      date: today,
      companyId: req.user.companyId,
    });
    if (!record) return res.status(404).json({ message: "Check-in missing" });

    if (record.checkOut) return res.status(400).json({ message: "Already checked out" });

    record.checkOut = new Date();

    // fetch employee + company defaults (company-scoped)
    const emp = await Employee.findOne({ _id: targetId, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ message: "Employee unauthorized" });

    const company = await Company.findById(req.user.companyId).select("fixedIn fixedOut");

    computeDerivedFields(record, emp, company ? { fixedIn: company.fixedIn, fixedOut: company.fixedOut } : {});

    await record.save();
    const populated = await record.populate("employeeId", "name employeeCode department jobRole");
    res.json({ success: true, message: "Checked out", data: populated });
  } catch (err) {
    console.error("checkOut Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   6) Get Attendance (Filters / Pagination) - company-secure
=============================================================== */
export const getAttendance = async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate, page = 1, limit = 200 } = req.query;

    const query = { companyId: req.user.companyId };
    if (employeeId && mongoose.isValidObjectId(employeeId)) query.employeeId = employeeId;
    if (status) query.status = status;
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate("employeeId", "name employeeCode department jobRole fixedIn fixedOut")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(query),
    ]);

    res.json({ success: true, count: total, data: records });
  } catch (err) {
    console.error("getAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   7) Advanced Attendance Filter - company-secure
=============================================================== */
export const filterAttendance = async (req, res) => {
  try {
    const { employeeName, employeeCode, department, role, status, startDate, endDate, page = 1, limit = 200 } = req.query;

    const query = { companyId: req.user.companyId };
    if (status) query.status = status;
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };

    const employeeQuery = {};
    if (employeeName) employeeQuery.name = new RegExp(employeeName, "i");
    if (employeeCode) employeeQuery.employeeCode = new RegExp(employeeCode, "i");
    if (department) employeeQuery.department = department;
    if (role) employeeQuery.jobRole = role;

    if (Object.keys(employeeQuery).length > 0) {
      const empList = await Employee.find({ ...employeeQuery, companyId: req.user.companyId }).select("_id");
      const ids = empList.map((e) => e._id);
      if (!ids.length) return res.json({ success: true, count: 0, records: [] });
      query.employeeId = { $in: ids };
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate("employeeId", "name employeeCode department jobRole fixedIn fixedOut")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(query),
    ]);

    res.json({ success: true, count: total, records });
  } catch (err) {
    console.error("filterAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
