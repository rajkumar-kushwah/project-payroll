import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";


// --------------------------------------
// 1) Add Attendance
// --------------------------------------
export const addAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut } = req.body;

    // Check employee belongs to logged-in user
    const employee = await Employee.findOne({
      _id: employeeId,
      createdBy: req.user._id,
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
      return res.status(400).json({ message: "Attendance already added for this date" });

    // Create attendance record
    const record = await Attendance.create({
      employeeId,
      date,
      status,
      checkIn,
      checkOut,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Attendance added successfully",
      data: record,
    });

  } catch (err) {
    console.error("Add attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// --------------------------------------
// 2) Get all Attendance
// --------------------------------------
export const getAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({
      createdBy: req.user._id
    })
      .populate("employeeId", "name employeeID department jobRole")
      .sort({ date: -1 });

    res.json(records);

  } catch (err) {
    console.error("Get all attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// --------------------------------------
// 3) Delete Attendance
// --------------------------------------
export const deleteAttendance = async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await Attendance.findOneAndDelete({
      _id: id,
      createdBy: req.user._id,
    });

    if (!deleted)
      return res.status(404).json({ message: "Attendance not found or unauthorized" });

    return res.json({ message: "Attendance deleted successfully" });

  } catch (err) {
    console.error("Delete attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// --------------------------------------
// 4) Update Attendance
// --------------------------------------
export const updateAttendance = async (req, res) => {
  try {
    const id = req.params.id;
    const { date, status, checkIn, checkOut } = req.body;

    const updated = await Attendance.findOneAndUpdate(
      { _id: id, createdBy: req.user._id },   // secure condition
      { date, status, checkIn, checkOut },
      { new: true }
    ).populate("employeeId", "name employeeID department jobRole");

    if (!updated)
      return res.status(404).json({ message: "Attendance not found or unauthorized" });

    return res.json({
      message: "Attendance updated successfully",
      data: updated,
    });

  } catch (err) {
    console.error("Update Attendance Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
