import Employee from "../models/Employee.js";
import Payroll from "../models/Payroll.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import OfficeHoliday from "../models/OfficeHoliday.js";
import WorkSchedule from "../models/WorkSchedule.js";
import { Parser } from "json2csv";
import puppeteer from "puppeteer";

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



/* ---------------------------------
   Export Payroll PDF
---------------------------------- */
export const exportPayrollPdf = async (req, res) => {
  try {
    const { month, employeeId } = req.query;

    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Filter attendance records by month if provided
    let filter = { employeeId };
    if (month) {
      const [monthStr, yearStr] = month.split(" ");
      const monthIndex = new Date(`${monthStr} 1, ${yearStr}`).getMonth();
      const year = parseInt(yearStr);

      filter.date = {
        $gte: new Date(year, monthIndex, 1),
        $lte: new Date(year, monthIndex + 1, 0),
      };
    }

    const records = await Attendance.find(filter).sort({ date: 1 });
    if (!records.length) {
      return res.status(404).json({ message: "No attendance data found for this employee" });
    }

    // Build HTML
    let html = `
      <h2>${employee.name} - Payslip (${month || "All Days"})</h2>
      <p>Employee Code: ${employee.employeeCode}</p>
      <table border="1" cellspacing="0" cellpadding="5" style="width:100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Check-In</th>
            <th>Check-Out</th>
            <th>Total Hours</th>
            <th>Overtime Hours</th>
          </tr>
        </thead>
        <tbody>
    `;

    let totalWorking = 0;
    let totalOvertime = 0;

    records.forEach(r => {
      html += `
        <tr>
          <td>${r.date.toISOString().split("T")[0]}</td>
          <td>${r.status}</td>
          <td>${r.status === "present" && r.checkIn ? r.checkIn.toISOString().split("T")[1].slice(0,5) : "-"}</td>
          <td>${r.status === "present" && r.checkOut ? r.checkOut.toISOString().split("T")[1].slice(0,5) : "-"}</td>
          <td>${r.status === "present" ? r.totalHours || 0 : "-"}</td>
          <td>${r.status === "present" ? r.overtimeHours || 0 : "-"}</td>
        </tr>
      `;
      if (r.status === "present") {
        totalWorking += r.totalHours || 0;
        totalOvertime += r.overtimeHours || 0;
      }
    });

    // Summary row
    html += `
        <tr style="font-weight:bold;">
          <td colspan="4">TOTAL WORKING</td>
          <td>${totalWorking.toFixed(2)}</td>
          <td>${totalOvertime.toFixed(2)}</td>
        </tr>
      </tbody>
      </table>
    `;

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Payslip_${employee.name}_${month || "AllDays"}.pdf`
    );
    res.send(pdf);

  } catch (err) {
    console.error("PDF export error:", err);
    res.status(500).json({ message: "Server error exporting payroll PDF" });
  }
};
