// controllers/workScheduleController.js
import WorkSchedule from "../models/Worksechudel.js";
import mongoose from "mongoose";

// -------------------------------------------------------------------
// 1️ Add / Create Work Schedule
// -------------------------------------------------------------------
export const addWorkSchedule = async (req, res) => {
  try {
    const { employeeId, inTime, outTime, shiftName, weeklyOff, shiftType, breakStart, breakEnd } = req.body;

    const schedule = new WorkSchedule({
      employeeId,
      companyId: req.user.companyId,
      shiftName: shiftName || "Default Shift",
      inTime,
      outTime,
      weeklyOff: weeklyOff || ["Sunday"],
      shiftType: shiftType || "Full-day",
      breakStart,
      breakEnd,
      createdBy: req.user._id
    });

    await schedule.save();

    res.status(201).json({ success: true, message: "Work schedule added", data: schedule });
  } catch (err) {
    console.error("addWorkSchedule Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// 2️⃣ Get all schedules (for company or employee)
// -------------------------------------------------------------------
export const getWorkSchedules = async (req, res) => {
  try {
    const { employeeId } = req.query;

    const query = { companyId: req.user.companyId };
    if (employeeId && mongoose.isValidObjectId(employeeId)) query.employeeId = employeeId;

    const schedules = await WorkSchedule.find(query)
      .populate("employeeId", "name employeeCode department jobRole avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: schedules.length, data: schedules });
  } catch (err) {
    console.error("getWorkSchedules Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// 3️⃣ Get single schedule by ID
// -------------------------------------------------------------------
export const getWorkScheduleById = async (req, res) => {
  try {
    const schedule = await WorkSchedule.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    }).populate("employeeId", "name employeeCode department jobRole avatar");

    if (!schedule) return res.status(404).json({ success: false, message: "Schedule not found" });

    res.json({ success: true, data: schedule });
  } catch (err) {
    console.error("getWorkScheduleById Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// 4️⃣ Update Work Schedule
// -------------------------------------------------------------------
export const updateWorkSchedule = async (req, res) => {
  try {
    const updateData = { ...req.body };

    const schedule = await WorkSchedule.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      updateData,
      { new: true }
    );

    if (!schedule) return res.status(404).json({ success: false, message: "Schedule not found" });

    res.json({ success: true, message: "Schedule updated successfully", data: schedule });
  } catch (err) {
    console.error("updateWorkSchedule Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// 5️⃣ Delete Work Schedule
// -------------------------------------------------------------------
export const deleteWorkSchedule = async (req, res) => {
  try {
    const schedule = await WorkSchedule.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!schedule) return res.status(404).json({ success: false, message: "Schedule not found" });

    res.json({ success: true, message: "Schedule deleted successfully" });
  } catch (err) {
    console.error("deleteWorkSchedule Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};