// controllers/workScheduleController.js
import WorkSchedule from "../models/Worksechudel.js";
import Company from "../models/Company.js"; // import Company
import Employee from "../models/Employee.js";
import mongoose from "mongoose";

export const addWorkSchedule = async (req, res) => {
  try {
    const { employeeId, inTime, outTime, shiftName, weeklyOff, shiftType, breakStart, breakEnd } = req.body;

    // Ensure employeeId exists
    if (!employeeId) return res.status(400).json({ success: false, message: "Employee is required" });

    // Fetch employee to get name & avatar
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(400).json({ success: false, message: "Employee not found" });

    const exists = await WorkSchedule.findOne({ employeeId });
if (exists) {
  return res.status(400).json({ success: false, message: "Schedule for this employee already exists" });
}

    // Get companyId from user or fallback by employee
    let companyId = req.user.companyId;
    if (!companyId) {
      const company = await Company.findOne({ employees: employeeId });
      if (!company) return res.status(400).json({ success: false, message: "Employee is not assigned to any company" });
      companyId = company._id;
    }

    // Create work schedule with name & avatar
    const schedule = new WorkSchedule({
      employeeId,
      employeeName: employee.name,
      employeeAvatar: employee.avatar || "/default-avatar.png",
      employeeCode: employee.employeeCode,
      companyId,
      shiftName: shiftName || "Default Shift",
      inTime,
      outTime,
      weeklyOff: weeklyOff || ["Sunday"],
      shiftType: shiftType || "Full-day",
      breakStart,
      breakEnd,
      effectiveFrom: new Date(),
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
// 2️ Get all schedules (for company or employee)
// -------------------------------------------------------------------
export const getWorkSchedules = async (req, res) => {
  try {
    let query = { companyId: req.user.companyId };

    // 👤 Employee → sirf apna schedule
    if (req.user.role === "employee") {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee) return res.json({ success: true, count: 0, data: [] });
      query.employeeId = employee._id;
    }

    const schedules = await WorkSchedule.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (err) {
    console.error("getWorkSchedules Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};


// -------------------------------------------------------------------
// 3️ Get single schedule by ID
// -------------------------------------------------------------------
export const getWorkScheduleById = async (req, res) => {
  try {
    let query = {
      _id: req.params.id,
      companyId: req.user.companyId,
    };

    // 👤 Employee safety check
    if (req.user.role === "employee") {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee) return res.status(403).json({ success: false, message: "Access denied" });
      query.employeeId = employee._id;
    }

    const schedule = await WorkSchedule.findOne(query);

    if (!schedule)
      return res.status(404).json({ success: false, message: "Schedule not found" });

    res.json({ success: true, data: schedule });
  } catch (err) {
    console.error("getWorkScheduleById Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};


// -------------------------------------------------------------------
// 4️ Update Work Schedule
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
// 5️ Delete Work Schedule
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