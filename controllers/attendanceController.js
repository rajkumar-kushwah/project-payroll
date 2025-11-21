import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import mongoose from "mongoose";

/* ============================================================
   1) Add Attendance (Manual by Admin/Owner)
=============================================================== */
export const addAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, remarks } = req.body;

    if (!mongoose.isValidObjectId(employeeId))
      return res.status(400).json({ message: "Invalid employee ID" });

    const emp = await Employee.findOne({
      _id: employeeId,
      companyId: req.user.companyId,
    });

    if (!emp)
      return res.status(404).json({ message: "Employee not found or unauthorized" });

    const exists = await Attendance.findOne({
      employeeId,
      date,
      companyId: req.user.companyId,
    });

    if (exists)
      return res.status(400).json({ message: "Attendance already exists for this date" });

    const record = await Attendance.create({
      employeeId,
      date,
      status,
      checkIn,
      checkOut,
      remarks,
      companyId: req.user.companyId,
      createdBy: req.user._id,
    });

    const populated = await record.populate(
      "employeeId",
      "name employeeCode department jobRole"
    );

    res.status(201).json({ success: true, message: "Attendance added", data: populated });
  } catch (err) {
    console.error("addAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   2) Update Attendance
=============================================================== */
export const updateAttendance = async (req, res) => {
  try {
    const { date, status, checkIn, checkOut, remarks } = req.body;
    const id = req.params.id;

    const updated = await Attendance.findOneAndUpdate(
      { _id: id, companyId: req.user.companyId },
      { date, status, checkIn, checkOut, remarks },
      { new: true }
    ).populate("employeeId", "name employeeCode department jobRole");

    if (!updated)
      return res.status(404).json({ message: "Attendance not found" });

    res.json({ success: true, message: "Attendance updated", data: updated });
  } catch (err) {
    console.error("updateAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   3) Delete Attendance
=============================================================== */
export const deleteAttendance = async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await Attendance.findOneAndDelete({
      _id: id,
      companyId: req.user.companyId,
    });

    if (!deleted)
      return res.status(404).json({ message: "Record not found or unauthorized" });

    res.json({ success: true, message: "Attendance deleted" });
  } catch (err) {
    console.error("deleteAttendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   4) Check-In (Employee / Admin)
=============================================================== */
export const checkIn = async (req, res) => {
  try {
    const targetId =
      ["admin", "owner"].includes(req.user.role) && req.body.employeeId
        ? req.body.employeeId
        : req.user._id;

    if (!mongoose.isValidObjectId(targetId))
      return res.status(400).json({ message: "Invalid employee ID" });

    const emp = await Employee.findOne({
      _id: targetId,
      companyId: req.user.companyId,
    });

    if (!emp)
      return res.status(404).json({ message: "Employee unauthorized" });

    const today = new Date().toISOString().split("T")[0];

    const exists = await Attendance.findOne({
      employeeId: targetId,
      date: today,
      companyId: req.user.companyId,
    });

    if (exists)
      return res.status(400).json({ message: "Already checked in today" });

    const record = await Attendance.create({
      employeeId: targetId,
      companyId: req.user.companyId,
      checkIn: new Date(),
      date: today,
      status: "present",
      createdBy: req.user._id,
    });

    const populated = await record.populate(
      "employeeId",
      "name employeeCode department jobRole"
    );

    res.status(201).json({ success: true, message: "Checked in", data: populated });
  } catch (err) {
    console.error("checkIn Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   5) Check-Out (Employee / Admin)
=============================================================== */
export const checkOut = async (req, res) => {
  try {
    const targetId =
      ["admin", "owner"].includes(req.user.role) && req.body.employeeId
        ? req.body.employeeId
        : req.user._id;

    if (!mongoose.isValidObjectId(targetId))
      return res.status(400).json({ message: "Invalid employee ID" });

    const today = new Date().toISOString().split("T")[0];

    const record = await Attendance.findOne({
      employeeId: targetId,
      date: today,
      companyId: req.user.companyId,
    });

    if (!record)
      return res.status(404).json({ message: "Check-in missing" });

    if (record.checkOut)
      return res.status(400).json({ message: "Already checked out" });

    const checkInTime = new Date(record.checkIn);
    const checkOutTime = new Date();
    const hours = (checkOutTime - checkInTime) / (1000 * 60 * 60);

    record.checkOut = checkOutTime;
    record.totalHours = Number(hours.toFixed(2));

    await record.save();

    const populated = await record.populate(
      "employeeId",
      "name employeeCode department jobRole"
    );

    res.json({ success: true, message: "Checked out", data: populated });
  } catch (err) {
    console.error("checkOut Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   6) Get Attendance (Filters / Pagination)
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
        .populate("employeeId", "name employeeCode department jobRole")
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
   7) Advanced Attendance Filter
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
        .populate("employeeId", "name employeeCode department jobRole")
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
