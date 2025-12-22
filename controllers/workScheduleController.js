// controllers/workScheduleController.js

import mongoose from "mongoose";
import WorkSchedule from "../models/Worksechudule.js";
import Employee from "../models/Employee.js";

/* ======================================================
   1️⃣ ADD WORK SCHEDULE
====================================================== */
export const addWorkSchedule = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      employeeId,
      shiftName,
      inTime,
      outTime,
      weeklyOff = [],
      shiftType = "fixed",
      breakStart,
      breakEnd,
      gracePeriod = 0,
    } = req.body;

    if (!employeeId || !inTime || !outTime) {
      return res.status(400).json({
        message: "employeeId, inTime and outTime are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid employeeId" });
    }

    // ✅ Employee must belong to same company
    const employee = await Employee.findOne({
      _id: employeeId,
      companyId: req.user.companyId,
      isDeleted: false,
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // ✅ Only ONE active schedule per employee
    const exists = await WorkSchedule.findOne({
      employeeId,
      companyId: req.user.companyId,
    });

    if (exists) {
      return res.status(400).json({
        message: "Work schedule already exists for this employee",
      });
    }

    const schedule = await WorkSchedule.create({
      companyId: req.user.companyId,
      employeeId,
      employeeName: employee.name,
      employeeCode: employee.employeeCode,
      employeeAvatar: employee.avatar || "",
      shiftName,
      inTime,
      outTime,
      weeklyOff,
      shiftType,
      breakStart,
      breakEnd,
      gracePeriod,
      status: "active",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Work schedule added successfully",
      data: schedule,
    });
  } catch (err) {
    console.error("addWorkSchedule Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   2️⃣ GET WORK SCHEDULES
====================================================== */
export const getWorkSchedules = async (req, res) => {
  try {
    let query = {
      companyId: req.user.companyId,
    };

    // ✅ Employee → only own schedule
    if (req.user.role === "employee") {
      if (!req.user.employeeId) {
        return res.json({ success: true, count: 0, data: [] });
      }
      query.employeeId = req.user.employeeId;
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
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   3️⃣ GET SINGLE WORK SCHEDULE
====================================================== */
export const getWorkScheduleById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid schedule ID" });
    }

    const query = {
      _id: req.params.id,
      companyId: req.user.companyId,
    };

    if (req.user.role === "employee") {
      if (!req.user.employeeId) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      query.employeeId = req.user.employeeId;
    }

    const schedule = await WorkSchedule.findOne(query).populate(
      "employeeId",
      "name avatar employeeCode"
    );

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.json({ success: true, data: schedule });
  } catch (err) {
    console.error("getWorkScheduleById Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   4️⃣ UPDATE WORK SCHEDULE
====================================================== */
export const updateWorkSchedule = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid schedule ID" });
    }

    const allowedFields = [
      "shiftName",
      "inTime",
      "outTime",
      "weeklyOff",
      "shiftType",
      "breakStart",
      "breakEnd",
      "gracePeriod",
      "status",
    ];

    const updates = {};
    allowedFields.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const schedule = await WorkSchedule.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { $set: updates },
      { new: true }
    ).populate("employeeId", "name avatar employeeCode");

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.json({
      success: true,
      message: "Work schedule updated successfully",
      data: schedule,
    });
  } catch (err) {
    console.error("updateWorkSchedule Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   5️⃣ DELETE WORK SCHEDULE
====================================================== */
export const deleteWorkSchedule = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid schedule ID" });
    }

    const schedule = await WorkSchedule.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.json({
      success: true,
      message: "Work schedule deleted successfully",
    });
  } catch (err) {
    console.error("deleteWorkSchedule Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
