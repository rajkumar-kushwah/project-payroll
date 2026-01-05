import Employee from "../models/Employee.js";
import Payroll from "../models/Payroll.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import OfficeHoliday from "../models/OfficeHoliday.js";
import WorkSchedule from "../models/Worksechudule.js";

// ---------------------------------------------
// Utility: Get Month Start & End
// ---------------------------------------------
const getMonthRange = (month) => {
  const [monthName, year] = month.split(" ");
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { start, end };
};

// ---------------------------------------------
// Utility: Calculate Payroll Summary
// ---------------------------------------------
const calculatePayroll = async (employee, month) => {
  const { start, end } = getMonthRange(month);

  const attendances = await Attendance.find({
    employeeId: employee._id,
    date: { $gte: start, $lte: end },
  });

  const leaves = await Leave.find({
    employeeId: employee._id,
    status: "approved",
    startDate: { $lte: end },
    endDate: { $gte: start },
  });

  const holidays = await OfficeHoliday.find({
    companyId: employee.companyId,
    date: { $gte: start, $lte: end },
  });

  const schedule = await WorkSchedule.findOne({ employeeId: employee._id });
  const weeklyOffs = schedule?.weeklyOffs || ["Sunday"];

  let totalDays = 0;
  let present = 0;
  let absent = 0;
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let officeHolidays = 0;
  let weeklyOffCount = 0;
  let overtimeHours = 0;

  const cursor = new Date(start);

  while (cursor <= end) {
    totalDays++;
    const dateStr = cursor.toDateString();
    const dayName = cursor.toLocaleString("en-US", { weekday: "long" });

    const isHoliday = holidays.some(
      (h) => new Date(h.date).toDateString() === dateStr
    );

    const leave = leaves.find(
      (l) =>
        cursor >= new Date(l.startDate) &&
        cursor <= new Date(l.endDate)
    );

    const attendance = attendances.find(
      (a) => new Date(a.date).toDateString() === dateStr
    );

    if (isHoliday) {
      officeHolidays++; // count company holiday
    } else if (leave) {
      leave.type === "paid" ? paidLeaves++ : unpaidLeaves++;
    } else if (attendance) {
      switch (attendance.status) {
        case "present":
          present++;
          overtimeHours += attendance.overtimeHours || 0;
          break;
        case "half-day":
          present += 0.5;
          overtimeHours += attendance.overtimeHours || 0;
          break;
        case "leave":
          paidLeaves++; // treat attendance "leave" as paid
          break;
        case "absent":
          absent++;
          break;
        default:
          absent++;
      }
    } else if (weeklyOffs.includes(dayName)) {
      weeklyOffCount++;
    } else {
      absent++;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    totalDays,
    present,
    absent,
    paidLeaves,
    unpaidLeaves,
    officeHolidays,
    weeklyOffCount,
    overtimeHours,
  };
};

// ---------------------------------------------
// 1️ Generate / Update Payroll
// ---------------------------------------------
export const generatePayroll = async (req, res) => {
  try {
    const { employeeId, month, notes } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const summary = await calculatePayroll(employee, month);

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

    let payroll = await Payroll.findOne({ employeeId, month });
    if (payroll) {
      payroll = await Payroll.findOneAndUpdate(
        { employeeId, month },
        payload,
        { new: true }
      );
    } else {
      payroll = await Payroll.create(payload);
    }

    res.status(200).json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------
// 2️ Payroll List (FILTERS)
// ---------------------------------------------
export const getPayrolls = async (req, res) => {
  try {
    const { month, employeeId, department } = req.query;

    let filter = {};
    if (month) filter.month = month;
    if (employeeId) filter.employeeId = employeeId;

    let payrolls = await Payroll.find(filter);

    if (department) {
      const employees = await Employee.find({ department }).select("_id");
      const ids = employees.map((e) => e._id.toString());
      payrolls = payrolls.filter((p) => ids.includes(p.employeeId.toString()));
    }

    res.status(200).json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------
// 3️ Single Employee Payslip
// ---------------------------------------------
export const getEmployeePayroll = async (req, res) => {
  try {
    const { employeeId, month } = req.query;

    const payroll = await Payroll.findOne({ employeeId, month });
    if (!payroll)
      return res.status(404).json({ message: "Payroll not found" });

    res.status(200).json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
