import Employee from "../models/Employee.js";
import Payroll from "../models/Payroll.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import OfficeHoliday from "../models/OfficeHoliday.js";
import WorkSchedule from "../models/Worksechudule.js";
import { Parser } from "json2csv";
import puppeteer from "puppeteer";

/* ---------------------------------
   Helper: Month Start / End
---------------------------------- */
const getMonthRange = (month) => {
  const [monthName, year] = month.split(" ");
  const monthIndex = new Date(`${monthName} 1`).getMonth();
  if (isNaN(monthIndex)) throw new Error("Invalid month");

  const start = new Date(Number(year), monthIndex, 1);
  const end = new Date(Number(year), monthIndex + 1, 0, 23, 59, 59);

  return { start, end };
};

/* ---------------------------------
   1️ Calculate Payroll (Core Logic)
---------------------------------- */
export const calculatePayroll = async (employee, month) => {
  const { start, end } = getMonthRange(month);

  //  NEW: running month ke liye aaj tak ka end
  const today = new Date();
  const effectiveEnd =
    end > today
      ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      : end;

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
    date: { $gte: start, $lte: effectiveEnd },
  });

  const schedule = await WorkSchedule.findOne({ employeeId: employee._id });
  const weeklyOffs = schedule?.weeklyOff || ["Sunday"];

  /* ---- Maps ---- */
  const attendanceMap = {};
  attendances.forEach(a => {
    attendanceMap[new Date(a.date).toDateString()] = a;
  });

  const holidaySet = new Set(
    holidays.map(h => new Date(h.date).toDateString())
  );

  /* ---- Counters ---- */
  let totalDays = 0;          // calendar days (poora month)
  let present = 0;
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let officeHolidays = 0;
  let weeklyOffCount = 0;
  let missingDays = 0;
  let overtimeHours = 0;

  const payrollData = [];

  /*  totalDays = poora month */
  const totalCursor = new Date(start);
  while (totalCursor <= end) {
    totalDays++;
    totalCursor.setDate(totalCursor.getDate() + 1);
  }

  /*  Attendance loop = sirf effectiveEnd (aaj tak) */
  const cursor = new Date(start);
  while (cursor <= effectiveEnd) {
    const dateStr = cursor.toDateString();
    const dayName = cursor.toLocaleString("en-US", { weekday: "long" });

    const attendance = attendanceMap[dateStr];
    const isHoliday = holidaySet.has(dateStr);
    const leave = leaves.find(
      l => cursor >= new Date(l.startDate) && cursor <= new Date(l.endDate)
    );

    let status = "missing";
    let checkIn = "";
    let checkOut = "";
    let totalHours = 0;
    let dayOvertime = 0;

    if (isHoliday) {
      status = "holiday";
      officeHolidays++;
    } 
    else if (leave) {
      status = leave.type === "paid" ? "paid leave" : "unpaid leave";
      leave.type === "paid" ? paidLeaves++ : unpaidLeaves++;
    } 
    else if (weeklyOffs.includes(dayName) && !attendance) {
      status = "weekly off";
      weeklyOffCount++;
    } 
    else if (attendance) {
      status = attendance.status;
      checkIn = attendance.checkIn || "";
      checkOut = attendance.checkOut || "";
      totalHours = attendance.totalHours || 0;
      dayOvertime = attendance.overtimeHours || 0;

      if (status === "present") present++;
      if (status === "half-day") present += 0.5;

      overtimeHours += dayOvertime;
    } 
    else {
      //  Ab missing sirf PAST days ke liye hoga
      missingDays++;
    }

    payrollData.push({
      EmployeeCode: employee.employeeCode,
      Name: employee.name,
      Date: dateStr,
      Day: dayName,
      Status: status,
      CheckIn: checkIn,
      CheckOut: checkOut,
      TotalHours: totalHours,
      OvertimeHours: dayOvertime,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    summary: {
      totalDays,        // poora month (31)
      present,          // actual attendance
      paidLeaves,
      unpaidLeaves,
      officeHolidays,
      weeklyOffCount,
      missingDays,      //  future days include nahi honge
      overtimeHours,
    },
    payrollData,
  };
};


/* ---------------------------------
   2️ Generate / Save Payroll
---------------------------------- */
export const generatePayroll = async (req, res) => {
  try {
    const { employeeId, month, notes } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const { summary } = await calculatePayroll(employee, month);

    const payload = {
      employeeId: employee._id,
      employeeCode: employee.employeeCode,
      companyId: employee.companyId,
      name: employee.name,
      avatar: employee.avatar,
      month,
      ...summary,
      notes: notes || "Auto generated payroll",
    };

    const payroll = await Payroll.findOneAndUpdate(
      { employeeId, month },
      payload,
      { upsert: true, new: true }
    );

    res.status(200).json(payroll);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------------------------------
   3️ Get Payroll Table (ALL EMP)
---------------------------------- */
export const getPayrolls = async (req, res) => {
  try {
    const { month, department } = req.query;

    const employees = department
      ? await Employee.find({ department })
      : await Employee.find({});

    const payrolls = await Promise.all(
      employees.map(async emp => {
        let payroll = await Payroll.findOne({ employeeId: emp._id, month });

        if (!payroll) {
          const { summary } = await calculatePayroll(emp, month);
          payroll = {
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            name: emp.name,
            avatar: emp.avatar,
            month,
            ...summary,
            notes: "Auto calculated",
          };
        }

        return payroll;
      })
    );

    res.json(payrolls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------------------------------
   4️ Single Employee Payroll
---------------------------------- */
export const getEmployeePayroll = async (req, res) => {
  try {
    const { employeeId, month } = req.query;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const data = await calculatePayroll(employee, month);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------------------------------
   5️ Export CSV (Single Employee)
---------------------------------- */
export const exportPayrollCsv = async (req, res) => {
  try {
    const { employeeId, month } = req.query;
    const employee = await Employee.findById(employeeId);

    const { payrollData } = await calculatePayroll(employee, month);
    const parser = new Parser();
    const csv = parser.parse(payrollData);

    res.header("Content-Type", "text/csv");
    res.attachment(`Payroll_${employee.name}_${month}.csv`);
    res.send(csv);
  } catch {
    res.status(500).send("CSV export error");
  }
};

/* ---------------------------------
   6️ Export PDF (Payslip)
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
            <td>${d.TotalHours}</td>
            <td>${d.OvertimeHours}</td>
          </tr>
        `).join("")}
      </table>
      <p><b>Present:</b> ${summary.present}</p>
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
