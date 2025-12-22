// workScheduleController.js

import WorkSchedule from "../models/Worksechudule.js";
import Employee from "../models/Employee.js";
import Company from "../models/Company.js";

/* ======================================================
   1️⃣ ADD WORK SCHEDULE
====================================================== */
export const addWorkSchedule = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const {
      employeeId,
      shiftName,
      inTime,
      outTime,
      weeklyOff,
      shiftType,
      breakStart,
      breakEnd,
      gracePeriod,
    } = req.body;

    if (!employeeId || !inTime || !outTime) {
      return res.status(400).json({
        success: false,
        message: "Employee, In Time & Out Time required",
      });
    }

    // Employee check
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Duplicate schedule check
    const exists = await WorkSchedule.findOne({ employeeId });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Schedule already exists for this employee",
      });
    }

    const companyId = req.user.companyId;

    const schedule = await WorkSchedule.create({
      companyId,
      employeeId,
      employeeName: employee.name,
      employeeAvatar: employee.avatar || "",
      employeeCode: employee.employeeCode,
      shiftName,
      inTime,
      outTime,
      weeklyOff,
      shiftType,
      breakStart,
      breakEnd,
      gracePeriod,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Work schedule added successfully",
      data: schedule,
    });
  } catch (err) {
    console.error("addWorkSchedule Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   2️⃣ GET ALL WORK SCHEDULES
====================================================== */
export const getWorkSchedules = async (req, res) => {
  try {
    let query = { companyId: req.user.companyId };

    // ✅ Employee role → only own schedule
    if (req.user.role === "employee") {
      const employee = await Employee.findOne({
        companyId: req.user.companyId,
        _id: req.user.employeeId
      });
      if (!employee) {
        return res.json({ success: true, count: 0, data: [] });
      }
      query.employeeId = employee._id;
    }

    const schedules = await WorkSchedule.find(query)
      .populate("employeeId", "name avatar employeeCode")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (err) {
    console.error("getWorkSchedules Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   3️⃣ GET SINGLE WORK SCHEDULE
====================================================== */
export const getWorkScheduleById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      companyId: req.user.companyId,
    };

    // ✅ Employee role → only own schedule
    if (req.user.role === "employee") {
      query.employeeId = req.user.employeeId;
    }

    const schedule = await WorkSchedule.findOne(query).populate(
      "employeeId",
      "name avatar employeeCode"
    );

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found" });
    }

    res.json({ success: true, data: schedule });
  } catch (err) {
    console.error("getWorkScheduleById Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   4️⃣ UPDATE WORK SCHEDULE
====================================================== */
export const updateWorkSchedule = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const schedule = await WorkSchedule.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    ).populate("employeeId", "name avatar employeeCode");

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found" });
    }

    res.json({
      success: true,
      message: "Schedule updated successfully",
      data: schedule,
    });
  } catch (err) {
    console.error("updateWorkSchedule Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   5️⃣ DELETE WORK SCHEDULE
====================================================== */
export const deleteWorkSchedule = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const schedule = await WorkSchedule.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found" });
    }

    res.json({ success: true, message: "Schedule deleted successfully" });
  } catch (err) {
    console.error("deleteWorkSchedule Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
