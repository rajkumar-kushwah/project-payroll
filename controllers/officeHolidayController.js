// officeHolidayController.js

import mongoose from "mongoose";
import OfficeHoliday from "../models/OfficeHoliday.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";


// add office holiday
export const addOfficeHoliday = async (req, res) => {
  try {
    const { title, date, type, description } = req.body;

    const holiday = await OfficeHoliday.create({
      companyId: req.user.companyId,
      title,
      date,
      type,
      description,
      createdBy: req.user._id,
    });

    // 🔹 AUTO UPDATE ATTENDANCE
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
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


//get office holidays
export const getOfficeHolidays = async (req, res) => {
  try {
    const holidays = await OfficeHoliday.find({
      companyId: req.user.companyId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: holidays,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


// delete office leaves

export const deleteOfficeHoliday = async (req, res) => {
  try {
    const deleted = await OfficeHoliday.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    // 🔹 DELETE ATTENDANCE FOR THAT HOLIDAY
    await Attendance.deleteMany({ companyId: req.user.companyId, date: deleted.date, status: "holiday" });

    res.json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


// update oofice leaves

export const updateOfficeHoliday = async (req, res) => {
  try {
    const { title, date, type, description } = req.body;

    const holiday = await OfficeHoliday.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    // 🔹 DELETE OLD ATTENDANCE
    if (holiday.date) {
      await Attendance.deleteMany({ companyId: req.user.companyId, date: holiday.date, status: "holiday" });
    }

    holiday.title = title;
    holiday.date = date;
    holiday.type = type;
    holiday.description = description;

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

    res.json({
      success: true,
      message: "Holiday updated successfully",
      data: holiday,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};