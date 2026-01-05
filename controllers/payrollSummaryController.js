// src/controllers/payrollSummaryController.js

import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Payroll from "../models/Payroll.js";
import Attendance from "../models/Attendance.js";

// Utility: Calculate monthly attendance summary
const calculateMonthlySummary = async (employeeId, month) => {
  const [monthName, year] = month.split(" ");
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);

  const attendances = await Attendance.find({
    employee: employeeId,
    date: { $gte: monthStart, $lte: monthEnd },
  });

  let totalDays = 0;
  let present = 0;
  let absent = 0;
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let officeHolidays = 0;
  let overtimeHours = 0;

  const dateCursor = new Date(monthStart);
  while (dateCursor <= monthEnd) {
    totalDays += 1;

    const day = attendances.find(
      (a) => a.date.toDateString() === dateCursor.toDateString()
    );

    if (day) {
      switch (day.status) {
        case "Present":
          present += 1;
          overtimeHours += day.overtimeHours || 0;
          break;
        case "Leave":
          if (day.leaveType === "Paid Leave") paidLeaves += 1;
          else if (day.leaveType === "Unpaid Leave") unpaidLeaves += 1;
          break;
        case "Holiday":
          officeHolidays += 1;
          break;
        case "Absent":
          absent += 1;
          break;
      }
    } else {
      // No record → check if Sunday
      const dayOfWeek = dateCursor.getDay(); // 0 = Sunday
      if (dayOfWeek === 0) officeHolidays += 1;
      else absent += 1;
    }

    dateCursor.setDate(dateCursor.getDate() + 1);
  }

  return { totalDays, present, absent, paidLeaves, unpaidLeaves, officeHolidays, overtimeHours };
};

// 1️⃣ Generate or Update Payroll
export const savePayrollSummary = async (req, res) => {
  try {
    const { employeeId, month, notes } = req.body;

    // Employee info
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // Attendance-based summary
    const summaryData = await calculateMonthlySummary(employeeId, month);

    // Prepare Payroll data
    const data = {
      employee: employee._id,
      name: employee.name,
      avatar: employee.avatar,
      month,
      ...summaryData,
      notes: notes || "Monthly payroll summary auto-generated",
    };

    // Save or update in Payroll collection
    let payroll = await Payroll.findOne({ employee: employeeId, month });
    if (payroll) {
      payroll = await Payroll.findOneAndUpdate({ employee: employeeId, month }, data, { new: true });
    } else {
      payroll = new Payroll(data);
      await payroll.save();
    }

    return res.status(200).json(payroll);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

// 2️⃣ Fetch All Payroll Summaries for a Month (Payroll Page Table)
export const getPayrollSummaries = async (req, res) => {
  try {
    const { month } = req.query;
    const summaries = await Payroll.find({ month });
    return res.status(200).json(summaries);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

// 3️⃣ Fetch Single Payroll Summary for Payslip
export const getPayrollSummaryByEmployee = async (req, res) => {
  try {
    const { employeeId, month } = req.query;
    const payroll = await Payroll.findOne({ employee: employeeId, month });
    if (!payroll) return res.status(404).json({ message: "Payroll summary not found" });
    return res.status(200).json(payroll);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};
