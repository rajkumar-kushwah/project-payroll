// controllers/addAttendanceController.js

import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import AttendanceAdd from "../models/AttendanceAdd.js";

/* ================================================================
   UTILS
================================================================ */
const toDateString = (d) => new Date(d).toISOString().split("T")[0];

/* ================================================================
   1️ ADD MASTER ATTENDANCE (ADMIN MANUAL FIX ENTRY)
================================================================ */
export const addAttendance = async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, remarks } = req.body;

    if (!mongoose.isValidObjectId(employeeId))
      return res.status(400).json({ message: "Invalid employee ID" });

    // Verify employee belongs to this company
    const emp = await Employee.findOne({
      _id: employeeId,
      companyId: req.user.companyId,
    });

    if (!emp)
      return res.status(404).json({ message: "Employee not found or unauthorized" });

    const recordDate = date ? toDateString(date) : toDateString(new Date());

    // Prevent duplicate entry
    const exists = await AttendanceAdd.findOne({
      employeeId,
      date: recordDate,
      companyId: req.user.companyId,
    });

    if (exists)
      return res.status(400).json({ message: "Entry already exists for this date" });

    // Convert check in/out to Date objects
    const checkInDt = checkIn ? new Date(`${recordDate}T${checkIn}`) : null;
    const checkOutDt = checkOut ? new Date(`${recordDate}T${checkOut}`) : null;

    const record = new AttendanceAdd({
      employeeId,
      companyId: req.user.companyId,
      date: recordDate,
      checkIn: checkInDt,
      checkOut: checkOutDt,
      remarks: remarks || "",
      registeredFromForm: true,
      createdBy: req.user._id,

      // DAILY ATTENDANCE WILL CALCULATE STATUS
      status: undefined,
    });

    await record.save();
    const populated = await record.populate(
      "employeeId",
      "name employeeCode department jobRole avatar"
    );

    res.status(201).json({
      success: true,
      message: "Master Attendance added successfully",
      data: populated,
    });
  } catch (err) {
    console.error("addAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================================================================
   2️ UPDATE MASTER ATTENDANCE
================================================================ */
export const updateAttendance = async (req, res) => {
  try {
    const { date, checkIn, checkOut, remarks } = req.body;
    const id = req.params.id;

    const rec = await AttendanceAdd.findOne({
      _id: id,
      companyId: req.user.companyId,
    });

    if (!rec)
      return res.status(404).json({ message: "Record not found or unauthorized" });

    if (date) rec.date = toDateString(date);
    if (remarks !== undefined) rec.remarks = remarks;

    if (checkIn)
      rec.checkIn = new Date(`${rec.date}T${checkIn}`);

    if (checkOut)
      rec.checkOut = new Date(`${rec.date}T${checkOut}`);

    // Daily system will re-calc status
    rec.status = undefined;

    await rec.save();
    const populated = await rec.populate(
      "employeeId",
      "name employeeCode department jobRole avatar"
    );

    res.json({
      success: true,
      message: "Master Attendance updated successfully",
      data: populated,
    });
  } catch (err) {
    console.error("updateAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================================================================
   3️ DELETE MASTER ATTENDANCE
================================================================ */
export const deleteAttendance = async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await AttendanceAdd.findOneAndDelete({
      _id: id,
      companyId: req.user.companyId,
    });

    if (!deleted)
      return res.status(404).json({ message: "Record not found or unauthorized" });

    res.json({
      success: true,
      message: "Master Attendance deleted successfully",
    });
  } catch (err) {
    console.error("deleteAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


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
      const ids = empList.map(e => e._id);
      if (!ids.length) return res.json({ success: true, count: 0, records: [] });
      query.employeeId = { $in: ids };
    }

    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate("employeeId", "name employeeCode department jobRole avatar")
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