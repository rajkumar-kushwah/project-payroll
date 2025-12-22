// officeHolidayController.js

import mongoose from "mongoose";
import OfficeHoliday from "../models/OfficeHoliday.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";

// -------------------------------------------------------------------
// ADD OFFICE HOLIDAY
// -------------------------------------------------------------------
export const addOfficeHoliday = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    let { title, date, type, description } = req.body;

    type = type.toUpperCase();

    const holiday = await OfficeHoliday.create({
      companyId: req.user.companyId,
      title,
      date,
      type,
      isPaid: type === "PAID",
      description,
      createdBy: req.user._id,
    });

    // 🔹 AUTO CREATE ATTENDANCE FOR HOLIDAY
    const employees = await Employee.find({ companyId: req.user.companyId });
    const bulkOps = employees.map(emp => ({
      updateOne: {
        filter: { employeeId: emp._id, companyId: emp.companyId, date },
        update: {
          $set: {
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            companyId: emp.companyId,
            date,
            status: "holiday",
            checkIn: null,
            checkOut: null,
            totalHours: 0,
            overtimeHours: 0,
            missingHours: 0,
            logType: "system",
          }
        },
        upsert: true,
      }
    }));

    if (bulkOps.length) await Attendance.bulkWrite(bulkOps);

    res.status(201).json({
      success: true,
      message: "Holiday added successfully",
      data: holiday,
    });

  } catch (err) {
    console.error("Add Office Holiday Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------------------------------------------
// GET OFFICE HOLIDAYS
// -------------------------------------------------------------------
export const getOfficeHolidays = async (req, res) => {
  try {
    // ✅ Employee role: can only view
    let query = { companyId: req.user.companyId };

    const holidays = await OfficeHoliday.find(query).sort({ createdAt: -1 });

    res.json({ success: true, data: holidays });

  } catch (err) {
    console.error("Get Office Holidays Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------------------------------------------
// DELETE OFFICE HOLIDAY
// -------------------------------------------------------------------
export const deleteOfficeHoliday = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const deleted = await OfficeHoliday.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!deleted) return res.status(404).json({ message: "Holiday not found" });

    // 🔹 DELETE ATTENDANCE FOR THIS HOLIDAY
    await Attendance.deleteMany({
      companyId: req.user.companyId,
      date: deleted.date,
      status: "holiday"
    });

    res.json({ success: true, message: "Holiday deleted successfully" });

  } catch (err) {
    console.error("Delete Office Holiday Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------------------------------------------
// UPDATE OFFICE HOLIDAY
// -------------------------------------------------------------------
export const updateOfficeHoliday = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, date, type, description } = req.body;

    const holiday = await OfficeHoliday.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!holiday) return res.status(404).json({ message: "Holiday not found" });

    // 🔹 DELETE OLD ATTENDANCE
    if (holiday.date) {
      await Attendance.deleteMany({
        companyId: req.user.companyId,
        date: holiday.date,
        status: "holiday"
      });
    }

    // 🔹 UPDATE HOLIDAY
    holiday.title = title;
    holiday.date = date;
    holiday.type = type.toUpperCase();
    holiday.description = description;
    holiday.isPaid = type.toUpperCase() === "PAID";

    await holiday.save();

    // 🔹 CREATE NEW ATTENDANCE FOR UPDATED DATE
    const employees = await Employee.find({ companyId: req.user.companyId });
    const bulkOps = employees.map(emp => ({
      updateOne: {
        filter: { employeeId: emp._id, companyId: emp.companyId, date },
        update: {
          $set: {
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            companyId: emp.companyId,
            date,
            status: "holiday",
            checkIn: null,
            checkOut: null,
            totalHours: 0,
            overtimeHours: 0,
            missingHours: 0,
            logType: "system",
          }
        },
        upsert: true,
      }
    }));

    if (bulkOps.length) await Attendance.bulkWrite(bulkOps);

    res.json({ success: true, message: "Holiday updated successfully", data: holiday });

  } catch (err) {
    console.error("Update Office Holiday Error:", err);
    res.status(500).json({ message: err.message });
  }
};
