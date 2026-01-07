import Employee from "../models/Employee.js";
import Payroll from "../models/Payroll.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import OfficeHoliday from "../models/OfficeHoliday.js";
import WorkSchedule from "../models/WorkSchedule.js";
import { Parser } from "json2csv";
import puppeteer from "puppeteer";
import pdf from "html-pdf";

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


// export const exportPayrollPdf = async (req, res) => {
//   try {
//     const { month, employeeId } = req.query;
//     const payroll = await Payroll.findOne({ month, employeeId });

//     if (!payroll) return res.status(404).json({ message: "Payroll not found" });

//     const dailyArray = Array.isArray(payroll.daily) ? payroll.daily : [];

//     const html = `
//       <h2>${payroll.name} - Payslip (${month})</h2>
//       <p>Employee Code: ${payroll.employeeCode}</p>
//       <table border="1" cellspacing="0" cellpadding="5" style="width:100%; font-size:12px; border-collapse:collapse;">
//         <thead>
//           <tr>
//             <th>Date</th>
//             <th>Day</th>
//             <th>Status</th>
//             <th>Check-In</th>
//             <th>Check-Out</th>
//             <th>Total Hours</th>
//             <th>Overtime</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${dailyArray.map(d => `
//             <tr>
//               <td>${d.date}</td>
//               <td>${d.day}</td>
//               <td>${d.status}</td>
//               <td>${d.checkIn || "-"}</td>
//               <td>${d.checkOut || "-"}</td>
//               <td>${d.totalHours || 0}</td>
//               <td>${d.overtimeHours || 0}</td>
//             </tr>
//           `).join("")}
//           <tr style="font-weight:bold;">
//             <td colspan="2">SUMMARY</td>
//             <td>${payroll.present} Present, ${payroll.leave} Leave, ${payroll.officeHolidays} Holidays, ${payroll.weeklyOff} Weekly Off, ${payroll.missingDays} Missing</td>
//             <td></td>
//             <td></td>
//             <td>${payroll.totalWorking}</td>
//             <td>${payroll.overtimeHours}</td>
//           </tr>
//         </tbody>
//       </table>
//     `;

//     const fileName = `Payslip_${payroll.name.replace(/\s+/g,'_')}_${month}.pdf`;

//     pdf.create(html).toBuffer((err, buffer) => {
//       if (err) {
//         console.error("PDF creation error:", err);
//         return res.status(500).json({ message: "Error creating PDF" });
//       }
//       res.setHeader("Content-Type", "application/pdf");
//       res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
//       res.send(buffer);
//     });

//   } catch (err) {
//     console.error("PDF export error:", err);
//     res.status(500).json({ message: "Server error exporting payroll PDF" });
//   }
// };



export const exportPayrollPdf = async (req, res) => {
  try {
    const { month, employeeId } = req.query;
    if (!employeeId) return res.status(400).json({ message: "employeeId is required" });

    // Fetch payroll + related data
    const payroll = await Payroll.findOne({ month, employeeId });
    if (!payroll) return res.status(404).json({ message: "Payroll not found" });

    const { start, end } = getMonthRange(month);
    const employeeIdObj = payroll.employeeId;

    const attendances = await Attendance.find({
      employeeId: employeeIdObj,
      date: { $gte: start, $lte: end }
    });

    const leaves = await Leave.find({
      employeeId: employeeIdObj,
      status: "approved",
      startDate: { $lte: end },
      endDate: { $gte: start }
    });

    const holidays = await OfficeHoliday.find({
      companyId: payroll.companyId,
      startDate: { $lte: end },
      endDate: { $gte: start }
    });

    const schedule = await WorkSchedule.findOne({ employeeId: employeeIdObj });
    const weeklyOffs = schedule?.weeklyOff?.map(d => d.toLowerCase()) || ["sunday"];

    // Build daily data
    const dailyRows = [];
    let present=0, leaveCount=0, officeHolidays=0, weeklyOff=0, missingDays=0, overtimeHours=0, halfDay=0;

    const cursor = new Date(start);
    while(cursor <= end){
      const dateKey = normalizeDate(cursor).toDateString();
      const dayName = cursor.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
      let status="missing";
      let checkIn=null, checkOut=null, totalHours=0, overtime=0;

      // Attendance
      const att = attendances.find(a => normalizeDate(a.date).toDateString() === dateKey);

      // Leave
      const leaveRecord = leaves.find(l => normalizeDate(l.startDate) <= normalizeDate(cursor) && normalizeDate(l.endDate) >= normalizeDate(cursor));

      // Holiday
      const isHoliday = holidays.some(h => normalizeDate(h.startDate) <= normalizeDate(cursor) && normalizeDate(h.endDate) >= normalizeDate(cursor));

      if(isHoliday){
        status="office-holiday";
        officeHolidays++;
      }
      else if(leaveRecord){
        status="leave";
        leaveCount++;
      }
      else if(weeklyOffs.includes(dayName)){
        status="week-off";
        weeklyOff++;
      }
      else if(att){
        status=att.status;
        if(att.status==="present") present++;
        else if(att.status==="half-day") halfDay+=0.5;
        totalHours = att.totalHours || 0;
        overtime = att.overtimeHours || 0;
        overtimeHours += overtime;
        checkIn = att.checkIn || null;
        checkOut = att.checkOut || null;
      }
      else{
        missingDays++;
      }

      dailyRows.push({ date: dateKey, day: dayName, status, checkIn, checkOut, totalHours, overtime });
      cursor.setDate(cursor.getDate()+1);
    }

    // Build HTML table
    let html = `
      <h2>${payroll.name} - Payslip (${month})</h2>
      <p>Employee Code: ${payroll.employeeCode}</p>
      <table border="1" cellspacing="0" cellpadding="5" style="width:100%; font-size:12px; border-collapse: collapse;">
        <thead>
          <tr>
            <th>Date</th>
            <th>Day</th>
            <th>Status</th>
            <th>Check-In</th>
            <th>Check-Out</th>
            <th>Total Hours</th>
            <th>Overtime</th>
          </tr>
        </thead>
        <tbody>
          ${dailyRows.map(d => `
            <tr>
              <td>${d.date}</td>
              <td>${d.day}</td>
              <td>${d.status}</td>
              <td>${d.checkIn || "-"}</td>
              <td>${d.checkOut || "-"}</td>
              <td>${d.totalHours}</td>
              <td>${d.overtime}</td>
            </tr>
          `).join('')}
          <tr style="font-weight:bold;">
            <td>SUMMARY</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>${present+halfDay+leaveCount}</td>
            <td>${overtimeHours}</td>
          </tr>
          <tr style="font-weight:bold;">
            <td colspan="7">
              ${present} Present, ${halfDay} Half-Day, ${leaveCount} Leave, ${officeHolidays} Holidays, ${weeklyOff} Weekly Off, ${missingDays} Missing
            </td>
          </tr>
        </tbody>
      </table>
    `;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({ headless: true, args:["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Payslip_${payroll.name}_${month}.pdf`);
    res.send(pdfBuffer);

  } catch(err){
    console.error("PDF export error:", err);
    res.status(500).json({ message: "Server error exporting payroll PDF" });
  }
};
