import Employee from "../models/Employee.js";
import Payroll from "../models/Payroll.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import OfficeHoliday from "../models/OfficeHoliday.js";
import WorkSchedule from "../models/WorkSchedule.js";
import { Parser } from "json2csv";
import puppeteer from "puppeteer";
import PDFDocument from "pdfkit";
import {
  
  formatDateYYYYMMDD,
  formatTimeIST,
} from "../utils/time.js";
/* ---------------------------------
   Helpers
---------------------------------- */
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const getMonthRange = (month) => {
  const [monthName, year] = month.split(" ");
  const monthMap = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3,
    May: 4, Jun: 5, Jul: 6, Aug: 7,
    Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  const monthIndex = monthMap[monthName];
  if (monthIndex === undefined) throw new Error("Invalid month format");
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return { start, end };
};

/* ---------------------------------
   Payroll Calculation
---------------------------------- */
export const calculatePayroll = async (employee, month) => {
  const { start, end } = getMonthRange(month);
  const today = normalizeDate(new Date());
  const effectiveEnd = normalizeDate(end > today ? today : end);

  const attendances = await Attendance.find({
    employeeId: employee._id,
    date: { $gte: start, $lte: effectiveEnd },
  });

  const leaves = await Leave.find({
    employeeId: employee._id,
    status: "approved",
    startDate: { $lte: effectiveEnd },
    endDate: { $gte: start },
  });

  const holidays = await OfficeHoliday.find({
    companyId: employee.companyId,
    startDate: { $lte: effectiveEnd },
    endDate: { $gte: start },
  });

  const schedule = await WorkSchedule.findOne({ employeeId: employee._id });
  const weeklyOffs = Array.isArray(schedule?.weeklyOff) && schedule.weeklyOff.length
    ? schedule.weeklyOff.map(d => String(d).toLowerCase())
    : ["sunday"];

  const attendanceMap = {};
  attendances.forEach(a => {
    attendanceMap[normalizeDate(a.date).toDateString()] = a;
  });

  let present = 0,
      halfDay = 0,
      leaveCount = 0,
      officeHolidays = 0,
      weeklyOff = 0,
      missingDays = 0,
      overtimeHours = 0;

  const daily = [];
  const cursor = new Date(start);

  while (cursor <= effectiveEnd) {
    const dateKey = normalizeDate(cursor).toDateString();
    const dayName = cursor.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    let status = "missing";
    const attendance = attendanceMap[dateKey];

    const isHoliday = holidays.some(h =>
      normalizeDate(h.startDate) <= normalizeDate(cursor) &&
      normalizeDate(h.endDate) >= normalizeDate(cursor)
    );

    const leaveRecord = leaves.find(l =>
      normalizeDate(l.startDate) <= normalizeDate(cursor) &&
      normalizeDate(l.endDate) >= normalizeDate(cursor)
    );

    if (isHoliday) {
      status = "office-holiday";
      officeHolidays++;
    } else if (leaveRecord) {
      status = "leave";
      leaveCount++;
    } else if (weeklyOffs.includes(dayName)) {
      status = "week-off";
      weeklyOff++;
    } else if (attendance) {
      status = attendance.status;
      if (attendance.status === "present") present++;
      else if (attendance.status === "half-day") halfDay += 0.5;
      overtimeHours += attendance.overtimeHours || 0;
    } else {
      missingDays++;
    }

    daily.push({
      date: dateKey,
      day: dayName,
      status,
      checkIn: attendance?.checkIn || null,
      checkOut: attendance?.checkOut || null,
      totalHours: attendance?.totalHours || 0,
      overtimeHours: attendance?.overtimeHours || 0
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    summary: {
      employeeId: employee._id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      avatar: employee.avatar,
      present,
      halfDay,
      leave: leaveCount,
      officeHolidays,
      weeklyOff,   // <-- matches DB field
      missingDays,
      overtimeHours,
      totalWorking: present + halfDay + leaveCount
    },
    daily
  };
};



/* ---------------------------------
   Get All Payrolls
---------------------------------- */
export const getPayrolls = async (req, res) => {
  const { month } = req.query;
  const companyId = req.user.companyId;
  const employees = await Employee.find({ companyId, status: "active" });

  const payrolls = [];
  for (const emp of employees) {
    const { summary, daily } = await calculatePayroll(emp, month);

    const payroll = await Payroll.findOneAndUpdate(
      { employeeId: emp._id, month },
      { ...summary, month, daily, companyId },
      { upsert: true, new: true }
    );

    payrolls.push(payroll);
  }

  res.json({ success: true, data: payrolls });
};

/* ---------------------------------
   Export Payroll CSV
---------------------------------- */
export const exportPayrollCsv = async (req, res) => {
  try {
    const { month, employeeId } = req.query;

    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required" });
    }

    const payroll = await Payroll.findOne({ month, employeeId });

    if (!payroll) {
      return res.status(404).json({ message: "Payroll data not found for this employee" });
    }

    const rows = [];

    // Ensure payroll.daily exists
    if (Array.isArray(payroll.daily)) {
      payroll.daily.forEach(d => {
        rows.push({
          Employee: payroll.name,
          EmployeeCode: payroll.employeeCode,
          Month: month,
          Date: d.date,
          Day: d.day,
          Status: d.status,
          OvertimeHours: d.overtimeHours || 0,
        });
      });
    }

    // Summary row
    rows.push({
      Employee: payroll.name,
      EmployeeCode: payroll.employeeCode,
      Month: month,
      Date: "SUMMARY",
      Day: "",
      Status: "",
      Present: payroll.present || 0,
      Leave: payroll.leave || 0,
      OfficeHolidays: payroll.officeHolidays || 0,
      WeeklyOff: payroll.weeklyOff || 0,
      MissingDays: payroll.missingDays || 0,
      TotalWorking: payroll.totalWorking || 0,
      OvertimeHours: payroll.overtimeHours || 0,
    });

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment(`Payroll_${payroll.name}_${month}.csv`);
    res.send(csv);

  } catch (err) {
    console.error("CSV export error:", err);
    res.status(500).json({ message: "Server error exporting payroll CSV" });
  }
};





// export const exportPayrollPdf = async (req, res) => {
//   try {
//     const { employeeId, month } = req.query;
//     if (!employeeId || !month) {
//       return res.status(400).json({ message: "employeeId & month required" });
//     }

//     const employee = await Employee.findById(employeeId);
//     if (!employee) {
//       return res.status(404).json({ message: "Employee not found" });
//     }

//     const { start, end } = getMonthRange(month);

//     const attendances = await Attendance.find({
//       employeeId,
//       date: { $gte: start, $lte: end },
//     });

//     const leaves = await Leave.find({
//       employeeId,
//       status: "approved",
//       startDate: { $lte: end },
//       endDate: { $gte: start },
//     });

//     const holidays = await OfficeHoliday.find({
//       companyId: employee.companyId,
//       startDate: { $lte: end },
//       endDate: { $gte: start },
//     });

//     const schedule = await WorkSchedule.findOne({ employeeId });
//     const weeklyOffs =
//       schedule?.weeklyOff?.map(d => d.toLowerCase()) || ["sunday"];

//     /* ---------- Attendance Map (DATE SAFE) ---------- */
//     const attendanceMap = {};
//     attendances.forEach(a => {
//       attendanceMap[normalizeDate(a.date).toDateString()] = a;
//     });

//     /* ---------- Build Rows ---------- */
//     const rows = [];
//     const cursor = new Date(start);

//     while (cursor <= end) {
//       const current = normalizeDate(cursor);
//       const key = current.toDateString();

//       const day = current.toLocaleDateString("en-IN", { weekday: "long" });
//       const dayLower = day.toLowerCase();

//       const attendance = attendanceMap[key];

//       const leave = leaves.find(l =>
//         normalizeDate(l.startDate) <= current &&
//         normalizeDate(l.endDate) >= current
//       );

//       const holiday = holidays.find(h =>
//         normalizeDate(h.startDate) <= current &&
//         normalizeDate(h.endDate) >= current
//       );

//       let row = null;

//       if (attendance) {
//         row = {
//           date: formatDateYYYYMMDD(current),
//           day,
//           status: attendance.status,
//           in: formatTimeIST(attendance.checkIn),
//           out: formatTimeIST(attendance.checkOut),
//           hrs: attendance.totalHours || 0,
//           ot: attendance.overtimeHours || 0,
//         };
//       } else if (leave) {
//         row = {
//           date: formatDateYYYYMMDD(current),
//           day,
//           status: "leave",
//           in: "-",
//           out: "-",
//           hrs: 0,
//           ot: 0,
//         };
//       } else if (holiday) {
//         row = {
//           date: formatDateYYYYMMDD(current),
//           day,
//           status: "office-holiday",
//           in: "-",
//           out: "-",
//           hrs: 0,
//           ot: 0,
//         };
//       } else if (weeklyOffs.includes(dayLower)) {
//         row = {
//           date: formatDateYYYYMMDD(current),
//           day,
//           status: "weekly-off",
//           in: "-",
//           out: "-",
//           hrs: 0,
//           ot: 0,
//         };
//       }

//       if (row) rows.push(row);
//       cursor.setDate(cursor.getDate() + 1);
//     }

//     /* ---------- PDF ---------- */
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=Payslip_${employee.name}_${month}.pdf`
//     );

//     const doc = new PDFDocument({ margin: 40, size: "A4" });
//     doc.pipe(res);

//     doc.fontSize(18).text("Payslip", { align: "center" });
//     doc.moveDown();
//     doc.fontSize(12).text(`Employee: ${employee.name}`);
//     doc.text(`Employee Code: ${employee.employeeCode}`);
//     doc.text(`Month: ${month}`);
//     doc.moveDown(2);

//     /* ---------- Table Header ---------- */
//     doc.fontSize(11);
//     doc.text("Date", 40);
//     doc.text("Day", 105);
//     doc.text("Status", 170);
//     doc.text("In", 265);
//     doc.text("Out", 325);
//     doc.text("Hrs", 395);
//     doc.text("OT", 435);

//     doc.moveDown();
//     doc.moveTo(40, doc.y).lineTo(520, doc.y).stroke();

//     /* ---------- Rows ---------- */
//     rows.forEach(r => {
//       doc.moveDown(0.7);
//       doc.text(r.date, 40);
//       doc.text(r.day, 105);
//       doc.text(r.status, 170);
//       doc.text(r.in, 265);
//       doc.text(r.out, 325);
//       doc.text(String(r.hrs), 395);
//       doc.text(String(r.ot), 435);
//     });

//     doc.end();

//   } catch (err) {
//     console.error("PDF ERROR:", err);
//     if (!res.headersSent) {
//       res.status(500).json({ message: "PDF generation failed" });
//     }
//   }
// };


export const exportPayrollPdf = async (req, res) => {
  try {
    const { employeeId, month } = req.query;
    if (!employeeId || !month)
      return res.status(400).json({ message: "employeeId & month required" });

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const { start, end } = getMonthRange(month);

    const attendances = await Attendance.find({
      employeeId,
      date: { $gte: start, $lte: end },
    });

    const leaves = await Leave.find({
      employeeId,
      status: "approved",
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    const holidays = await OfficeHoliday.find({
      companyId: employee.companyId,
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    const schedule = await WorkSchedule.findOne({ employeeId });
    const weeklyOffs = schedule?.weeklyOff?.map(d => d.toLowerCase()) || ["sunday"];

    // Map attendances by date for fast lookup
    const attendanceMap = {};
    attendances.forEach(a => {
      attendanceMap[normalizeDate(a.date).toDateString()] = a;
    });

    // Build table rows
    const rows = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      const current = normalizeDate(cursor);
      const day = current.toLocaleDateString("en-IN", { weekday: "long" });
      const dayLower = day.toLowerCase();
      const key = current.toDateString();

      const attendance = attendanceMap[key];
      const leave = leaves.find(l => normalizeDate(l.startDate) <= current && normalizeDate(l.endDate) >= current);
      const holiday = holidays.find(h => normalizeDate(h.startDate) <= current && normalizeDate(h.endDate) >= current);

      let row = {
        date: formatDateYYYYMMDD(current),
        day,
        status: "absent",
        in: "-",
        out: "-",
        hrs: 0,
        ot: 0
      };

      if (attendance) {
        row.status = attendance.status || "present";
        row.in = formatTimeIST(attendance.checkIn) || "-";
        row.out = formatTimeIST(attendance.checkOut) || "-";
        row.hrs = attendance.totalHours || 0;
        row.ot = attendance.overtimeHours || 0;
      } else if (leave) {
        row.status = "leave";
      } else if (holiday) {
        row.status = "office-holiday";
      } else if (weeklyOffs.includes(dayLower)) {
        row.status = "weekly-off";
      }

      rows.push(row);
      cursor.setDate(cursor.getDate() + 1);
    }

    // ---------- Generate PDF ----------
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Payslip_${employee.name}_${month}.pdf`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    doc.fontSize(18).text("Payslip", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Employee: ${employee.name}`);
    doc.text(`Employee Code: ${employee.employeeCode}`);
    doc.text(`Month: ${month}`);
    doc.moveDown(1.5);

    // Table headers
    const startX = 40;
    const columnPositions = {
      date: 40,
      day: 110,
      status: 180,
      in: 260,
      out: 320,
      hrs: 390,
      ot: 440
    };

    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("Date", columnPositions.date);
    doc.text("Day", columnPositions.day);
    doc.text("Status", columnPositions.status);
    doc.text("In", columnPositions.in);
    doc.text("Out", columnPositions.out);
    doc.text("Hrs", columnPositions.hrs);
    doc.text("OT", columnPositions.ot);

    doc.moveDown(0.5);
    const tableTop = doc.y;
    doc.moveTo(startX, tableTop).lineTo(520, tableTop).stroke();
    doc.font("Helvetica");

    // Table rows
    rows.forEach(r => {
      doc.moveDown(0.6);
      doc.text(r.date, columnPositions.date);
      doc.text(r.day, columnPositions.day);
      doc.text(r.status, columnPositions.status);
      doc.text(r.in, columnPositions.in);
      doc.text(r.out, columnPositions.out);
      doc.text(String(r.hrs), columnPositions.hrs);
      doc.text(String(r.ot), columnPositions.ot);
    });

    doc.end();

  } catch (err) {
    console.error("PDF ERROR:", err);
    if (!res.headersSent) res.status(500).json({ message: "PDF generation failed" });
  }
};