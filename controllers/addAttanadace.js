import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import AttendanceAdd from "../models/AttendanceAdd.js"; 

export const addAttendanceForm = async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, remarks } = req.body;

    if (!mongoose.isValidObjectId(employeeId))
      return res.status(400).json({ message: "Invalid employee ID" });

    const emp = await Employee.findOne({ _id: employeeId, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ message: "Employee not found or unauthorized" });

    const recordDate = date ? new Date(date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

    const exists = await AttendanceAdd.findOne({
      employeeId,
      date: recordDate,
      companyId: req.user.companyId,
    });
    if (exists) return res.status(400).json({ message: "AttendanceAdd already exists for this date" });

    const checkInDt = checkIn ? new Date(checkIn.includes("T") ? checkIn : `${recordDate}T${checkIn}`) : undefined;
    const checkOutDt = checkOut ? new Date(checkOut.includes("T") ? checkOut : `${recordDate}T${checkOut}`) : undefined;

    // ⚡ Add record without setting status
    const record = new AttendanceAdd({
      employeeId,
      companyId: req.user.companyId,
      date: recordDate,
      checkIn: checkInDt || null,
      checkOut: checkOutDt || null,
      remarks: remarks || "",
      registeredFromForm: true, // important flag
      createdBy: req.user._id,
      status: undefined, // status calculated later
    });

    await record.save();
    const populated = await record.populate("employeeId", "name employeeCode department jobRole avatar");

    res.status(201).json({ success: true, message: "AttendanceAdd added (status will calculate daily)", data: populated });
  } catch (err) {
    console.error("addAttendanceForm Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
