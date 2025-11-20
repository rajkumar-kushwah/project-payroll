import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import mongoose from "mongoose";

// ---------------------------------------------------
// 1️ Add Attendance
// ---------------------------------------------------
export const addAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, remarks } = req.body;

    // Validate employeeId
    if (!mongoose.isValidObjectId(employeeId))
      return res.status(400).json({ message: "Invalid employee ID" });

    // Check employee belongs to the same company as logged-in user
    const employee = await Employee.findOne({
      _id: employeeId,
      companyId: req.user.companyId,
    });

    if (!employee)
      return res.status(404).json({ message: "Employee not found or unauthorized" });

    // Prevent duplicate attendance for same date
    const existing = await Attendance.findOne({
      employeeId,
      date,
      createdBy: req.user._id,
    });

    if (existing)
      return res.status(400).json({ message: "Attendance already exists for this date" });

    // Create attendance record
    const record = await Attendance.create({
      employeeId,
      date,
      status,
      checkIn,
      checkOut,
      remarks,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: "Attendance added successfully", data: record });
  } catch (err) {
    console.error("Add Attendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------
// 2️ Get All Attendance
// ---------------------------------------------------
export const getAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ companyId: req.user.companyId })
      .populate("employeeId", "name employeeCode department jobRole")
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    console.error("Get Attendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------
// 3️ Delete Attendance
// ---------------------------------------------------
export const deleteAttendance = async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await Attendance.findOneAndDelete({
      _id: id,
      createdBy: req.user._id,
    });

    if (!deleted)
      return res.status(404).json({ message: "Attendance not found or unauthorized" });

    res.json({ message: "Attendance deleted successfully" });
  } catch (err) {
    console.error("Delete Attendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------
// 4️ Update Attendance
// ---------------------------------------------------
export const updateAttendance = async (req, res) => {
  try {
    const id = req.params.id;
    const { date, status, checkIn, checkOut, remarks } = req.body;

    const updated = await Attendance.findOneAndUpdate(
      { _id: id, createdBy: req.user._id }, // secure condition
      { date, status, checkIn, checkOut, remarks },
      { new: true }
    ).populate("employeeId", "name employeeCode department jobRole");

    if (!updated)
      return res.status(404).json({ message: "Attendance not found or unauthorized" });

    res.json({ message: "Attendance updated successfully", data: updated });
  } catch (err) {
    console.error("Update Attendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------
// 5️ Filter Attendance (Advanced)
// ---------------------------------------------------
export const filterAttendance = async (req, res) => {
  try {
    const { startDate, endDate, status, employeeId } = req.query;

    const query = { companyId: req.user.companyId };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (status) query.status = status;

    if (employeeId && mongoose.isValidObjectId(employeeId)) {
      query.employeeId = employeeId;
    }

    const records = await Attendance.find(query)
      .populate("employeeId", "name employeeCode department jobRole")
      .sort({ date: -1 });

    res.json({ success: true, count: records.length, records });
  } catch (err) {
    console.error("Filter Attendance Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
