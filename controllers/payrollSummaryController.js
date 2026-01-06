import Employee from "../models/Employee.js";
import Payroll from "../models/Payroll.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import OfficeHoliday from "../models/OfficeHoliday.js";
import WorkSchedule from "../models/Worksechudule.js";
import { Parser } from "json2csv";
import puppeteer from "puppeteer";

/* ---------------------------------
   Month Range
---------------------------------- */
const getMonthRange = (month) => {
  const [monthName, year] = month.split(" ");
  const monthIndex = new Date(`${monthName} 1`).getMonth();

  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59);

  return { start, end };
};

/* ---------------------------------
    Core Payroll Calculation
---------------------------------- */
const calculatePayroll = async (employee, month) => {
  const { start, end } = getMonthRange(month);
  const today = normalizeDate(new Date());
  const effectiveEnd = normalizeDate(end > today ? today : end);

  /* ---------- DATA ---------- */
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

  /* ---------- MAPS ---------- */
  const attendanceMap = {};
  attendances.forEach(a => {
    attendanceMap[normalizeDate(a.date).toDateString()] = a;
  });

  const holidaySet = new Set();
  holidays.forEach(h => {
    let d = normalizeDate(h.startDate);
    const hEnd = normalizeDate(h.endDate);

    while (d <= hEnd && d <= effectiveEnd) {
      holidaySet.add(d.toDateString());
      d.setDate(d.getDate() + 1);
    }
  });

  /* ---------- COUNTERS ---------- */
  let present = 0;
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let officeHolidays = 0;
  let weeklyOffCount = 0;
  let missingDays = 0;
  let overtimeHours = 0;

  const payrollData = [];
  const cursor = normalizeDate(start);

  /* ---------- DAY BY DAY LOOP ---------- */
  while (cursor <= effectiveEnd) {
    const dateStr = cursor.toDateString();
    const dayName = cursor.toLocaleString("en-US", { weekday: "long" });

    const attendance = attendanceMap[dateStr];
    const isHoliday = holidaySet.has(dateStr);

    const leave = leaves.find(l => {
      const ls = normalizeDate(l.startDate);
      const le = normalizeDate(l.endDate);
      return cursor >= ls && cursor <= le;
    });

    let status = "missing";
    let checkIn = "";
    let checkOut = "";
    let totalHours = 0;
    let dayOT = 0;

    /* ---- PRIORITY LOGIC ---- */

    // 1️⃣ Office Holiday
    if (isHoliday) {
      status = "office holiday";
      officeHolidays++;
    }

    // 2️⃣ Leave
    else if (leave) {
      if (leave.type?.toLowerCase() === "paid") {
        status = "paid leave";
        paidLeaves++;
      } else {
        status = "unpaid leave";
        unpaidLeaves++;
      }
    }

    // 3️⃣ Weekly Off
    else if (weeklyOffs.includes(dayName) && !attendance) {
      status = "weekly off";
      weeklyOffCount++;
    }

    // 4️⃣ Attendance
    else if (attendance) {
      status = attendance.status;
      checkIn = attendance.checkIn || "";
      checkOut = attendance.checkOut || "";
      totalHours = attendance.totalHours || 0;
      dayOT = attendance.overtimeHours || 0;

      if (status === "present") present++;
      if (status === "half-day") present += 0.5;

      overtimeHours += dayOT;
    }

    // 5️⃣ Missing
    else {
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
      OvertimeHours: dayOT,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  /* ---------- FINAL TOTAL ---------- */
  const totalWorking =
    present + paidLeaves + officeHolidays + weeklyOffCount;

  return {
    summary: {
      totalWorking,
      present,
      paidLeaves,
      unpaidLeaves,
      officeHolidays,
      weeklyOffCount,
      missingDays,
      overtimeHours,
    },
    payrollData,
  };
};


const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};



/* ---------------------------------
   Generate Payroll
---------------------------------- */
export const generatePayroll = async (req, res) => {
  try {
    const { employeeId, month, notes } = req.body;
    const employee = await Employee.findById(employeeId);

    const { summary } = await calculatePayroll(employee, month);

    const payroll = await Payroll.findOneAndUpdate(
      { employeeId, month },
      {
        employeeId,
        employeeCode: employee.employeeCode,
        companyId: employee.companyId,
        name: employee.name,
        avatar: employee.avatar,
        month,
        ...summary,
        notes: notes || "Auto generated",
      },
      { upsert: true, new: true }
    );

    res.json(payroll);
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
   Employee Payroll Detail
---------------------------------- */
export const getEmployeePayroll = async (req, res) => {
  const { employeeId, month } = req.query;
  const employee = await Employee.findById(employeeId);

  const data = await calculatePayroll(employee, month);
  res.json(data);
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
