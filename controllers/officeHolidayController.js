import mongoose from "mongoose";
import OfficeHoliday from "../models/OfficeHoliday.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";

/* ------------------------------------------------
   Helper: dates between start & end
------------------------------------------------ */
const getDatesBetween = (start, end) => {
  const dates = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};


/* ------------------------------------------------
   ADD OFFICE HOLIDAY (MULTI-DAY)
------------------------------------------------ */
export const addOfficeHoliday = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    let { title, startDate, endDate, type, description } = req.body;
    type = type.toUpperCase();

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: "startDate cannot be after endDate" });
    }

    const dates = getDatesBetween(startDate, endDate);

    const holiday = await OfficeHoliday.create({
      companyId: req.user.companyId,
      title,
      startDate,
      endDate,
      totalDays: dates.length, // 🔹 totalDays added
      type,
      isPaid: type === "PAID",
      description,
      createdBy: req.user._id,
    });

    // 🔹 AUTO CREATE ATTENDANCE FOR EACH HOLIDAY DATE
    const employees = await Employee.find({ companyId: req.user.companyId });

    const bulkOps = [];
    employees.forEach(emp => {
      dates.forEach(date => {
        bulkOps.push({
          updateOne: {
            filter: {
              employeeId: emp._id,
              companyId: emp.companyId,
              date,
            },
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
              },
            },
            upsert: true,
          },
        });
      });
    });

    if (bulkOps.length) await Attendance.bulkWrite(bulkOps);

    res.status(201).json({
      success: true,
      message: "Office holiday added successfully",
      data: holiday,
    });

  } catch (err) {
    console.error("Add Office Holiday Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ------------------------------------------------
   GET OFFICE HOLIDAYS
------------------------------------------------ */
export const getOfficeHolidays = async (req, res) => {
  try {
    const holidays = await OfficeHoliday.find({
      companyId: req.user.companyId,
    }).sort({ startDate: -1 });

    res.json({ success: true, data: holidays });

  } catch (err) {
    console.error("Get Office Holidays Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ------------------------------------------------
   DELETE OFFICE HOLIDAY (RANGE)
------------------------------------------------ */
export const deleteOfficeHoliday = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const holiday = await OfficeHoliday.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    // 🔹 DELETE ALL ATTENDANCE IN RANGE
    await Attendance.deleteMany({
      companyId: req.user.companyId,
      date: {
        $gte: holiday.startDate,
        $lte: holiday.endDate,
      },
      status: "holiday",
    });

    res.json({ success: true, message: "Holiday deleted successfully" });

  } catch (err) {
    console.error("Delete Office Holiday Error:", err);
    res.status(500).json({ message: err.message });
  }
};


/* ------------------------------------------------
   UPDATE OFFICE HOLIDAY (RANGE)
------------------------------------------------ */
export const updateOfficeHoliday = async (req, res) => {
  try {
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, startDate, endDate, type, description } = req.body;

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: "startDate cannot be after endDate" });
    }

    const holiday = await OfficeHoliday.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    // 🔹 DELETE OLD ATTENDANCE
    await Attendance.deleteMany({
      companyId: req.user.companyId,
      date: {
        $gte: holiday.startDate,
        $lte: holiday.endDate,
      },
      status: "holiday",
    });

    // 🔹 UPDATE HOLIDAY
    const dates = getDatesBetween(startDate, endDate);

    holiday.title = title;
    holiday.startDate = startDate;
    holiday.endDate = endDate;
    holiday.totalDays = dates.length; // 🔹 totalDays updated
    holiday.type = type.toUpperCase();
    holiday.isPaid = type.toUpperCase() === "PAID";
    holiday.description = description;

    await holiday.save();

    // 🔹 RE-CREATE ATTENDANCE
    const employees = await Employee.find({ companyId: req.user.companyId });

    const bulkOps = [];
    employees.forEach(emp => {
      dates.forEach(date => {
        bulkOps.push({
          updateOne: {
            filter: {
              employeeId: emp._id,
              companyId: emp.companyId,
              date,
            },
            update: {
              $set: {
                employeeId: emp._id,
                employeeCode: emp.employeeCode,
                companyId: emp.companyId,
                date,
                status: "holiday",
                logType: "system",
              },
            },
            upsert: true,
          },
        });
      });
    });

    if (bulkOps.length) await Attendance.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: "Holiday updated successfully",
      data: holiday,
    });

  } catch (err) {
    console.error("Update Office Holiday Error:", err);
    res.status(500).json({ message: err.message });
  }
};
