import Employee from "../models/Employee.js";
import Payroll from "../models/Payroll.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import OfficeHoliday from "../models/OfficeHoliday.js";
import WorkSchedule from "../models/Worksechudule.js";
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


const calculatePayroll = async (employee, month) => {
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
  const weeklyOffs = schedule?.weeklyOff || ["Sunday"];

  const attendanceMap = {};
  attendances.forEach(a => {
    attendanceMap[normalizeDate(a.date).toDateString()] = a;
  });

  let present = 0,
      leave = 0,
      weekOff = 0,
      officeHoliday = 0,
      absent = 0,
      missing = 0,
      halfDay = 0;

  const daily = [];
  const cursor = new Date(start);

  while (cursor <= effectiveEnd) {
    const dateKey = normalizeDate(cursor).toDateString();
    const dayName = cursor.toLocaleDateString("en-US", { weekday: "long" });

    let status = "missing";

    const isHoliday = holidays.find(h =>
      cursor >= normalizeDate(h.startDate) &&
      cursor <= normalizeDate(h.endDate)
    );

    const leaveRecord = leaves.find(l =>
      cursor >= normalizeDate(l.startDate) &&
      cursor <= normalizeDate(l.endDate)
    );

    const attendance = attendanceMap[dateKey];

    if (isHoliday) {
      status = "office-holiday";
      officeHoliday++;
    }
    else if (leaveRecord) {
      status = "leave";  // ✅ leave only
      leave++;
    }
    else if (attendance) {
      status = attendance.status;
      if (attendance.status === "present") present++;
      else if (attendance.status === "half-day") halfDay += 0.5;
      else if (attendance.status === "absent") absent++;
    }
    else if (weeklyOffs.includes(dayName)) {
      status = "week-off";
      weekOff++;
    }
    else {
      missing++;
    }

    daily.push({
      date: dateKey,
      day: dayName,
      status,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  const totalWorked = present + halfDay + leave;

  return {
    summary: {
      present,
      halfDay,
      leave,           // ✅ leave only
      officeHoliday,
      weekOffCount: weekOff,
      missingDays: missing,
      overtimeHours: attendances.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
      totalWorking: totalWorked,
    },
    daily,
  };
};





/* ---------------------------------
   Get All Payrolls
---------------------------------- */
export const getPayrolls = async (req, res) => {
  const { month } = req.query;
  const companyId = req.user.companyId;

  const employees = await Employee.find({
    companyId,
    status: "active",
  });

  const payrolls = [];

  for (const emp of employees) {
    const { summary, daily } =
      await calculatePayrollForEmployee(emp, month);

    const payroll = await Payroll.findOneAndUpdate(
      {
        employeeId: emp._id,
        month,
      },
      {
        employeeId: emp._id,
        employeeCode: emp.employeeCode,
        companyId,
        name: emp.name,
        avatar: emp.avatar,
        month,
        ...summary,
        daily,
        autoSaved: true,
      },
      { upsert: true, new: true }
    );

    payrolls.push(payroll);
  }

  res.json({ success: true, data: payrolls });
};




/* ---------------------------------
   Export CSV
---------------------------------- */
export const exportPayrollCsv = async (req, res) => {
  const { month } = req.query;

  const payrolls = await Payroll.find({ month });

  const rows = [];

  payrolls.forEach(p => {
    p.daily.forEach(d => {
      rows.push({
        Employee: p.name,
        Month: month,
        Date: d.date,
        Day: d.day,
        Status: d.status,
      });
    });
  });

  const parser = new Parser();
  const csv = parser.parse(rows);

  res.header("Content-Type", "text/csv");
  res.attachment(`Payroll_${month}.csv`);
  res.send(csv);
};


/* ---------------------------------
   Export PDF
---------------------------------- */
export const exportPayrollPdf = async (req, res) => {
  try {
    const { employeeId, month } = req.query;
    const employee = await Employee.findById(employeeId);
    const { summary, payrollData } = await calculatePayroll(employee, month);

    const html = `
      <h2>${employee.name} - Payslip (${month})</h2>
      <p>Employee Code: ${employee.employeeCode}</p>
      <table border="1" width="100%" cellspacing="0" cellpadding="5">
        <tr>
          <th>Date</th><th>Day</th><th>Status</th>
          <th>In</th><th>Out</th><th>Hours</th><th>OT</th>
        </tr>
        ${payrollData.map(d => `
          <tr>
            <td>${d.Date}</td>
            <td>${d.Day}</td>
            <td>${d.Status}</td>
            <td>${d.CheckIn || "-"}</td>
            <td>${d.CheckOut || "-"}</td>
            <td>${d.TotalHours || "-"}</td>
            <td>${d.OvertimeHours || "-"}</td>
          </tr>
        `).join("")}
      </table>
      <p><b>Present:</b> ${summary.present}</p>
      <p><b>Paid Leaves:</b> ${summary.paidLeaves}</p>
      <p><b>Unpaid Leaves:</b> ${summary.unpaidLeaves}</p>
      <p><b>Holidays:</b> ${summary.officeHolidays}</p>
      <p><b>Weekly Offs:</b> ${summary.weeklyOffCount}</p>
      <p><b>Missing:</b> ${summary.missingDays}</p>
    `;

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({ format: "A4" });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Payslip_${month}.pdf`);
    res.send(pdf);
  } catch {
    res.status(500).send("PDF export error");
  }
};
