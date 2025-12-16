import Employee from "../models/Employee.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Company from "../models/Company.js";

// -------------------------------------------------------------------
// GET ALL EMPLOYEES
// -------------------------------------------------------------------
export const getEmployees = async (req, res) => {
  try {
    let employees;

    if (req.user.role === "employee") {
      // sirf apna data
      employees = await Employee.findOne({ userId: req.user._id })
        .populate("userId", "name email role phone avatar");
    } else if (["hr", "owner"].includes(req.user.role)) {
      // company ke sab employees
      employees = await Employee.find({ companyId: req.user.companyId })
        .populate("userId", "name email role phone avatar")
        .sort({ createdAt: -1 });
    }

    // leave, attendance, salary ka data
    let leaveData = [], attendanceData = [], salaryData = [];

    if (req.user.role === "employee" && employees) {
      leaveData = await Leave.find({ employeeId: employees._id });
      attendanceData = await Attendance.find({ employeeId: employees._id });
      salaryData = await Payroll.find({ employeeId: employees._id });
    } else if (["hr", "owner"].includes(req.user.role)) {
      // sab employees ke liye fetch karna ho to mapping kar sakte ho
      const employeeIds = employees.map(emp => emp._id);
      leaveData = await Leave.find({ employeeId: { $in: employeeIds } });
      attendanceData = await Attendance.find({ employeeId: { $in: employeeIds } });
      salaryData = await Payroll.find({ employeeId: { $in: employeeIds } });
    }

    // formatted employees
    const formattedEmployees = Array.isArray(employees)
      ? employees.map(emp => ({ ...emp._doc, user: emp.userId || {} }))
      : { ...employees._doc, user: employees.userId || {} };

    res.json({
      success: true,
      count: Array.isArray(employees) ? employees.length : 1,
      employees: formattedEmployees,
      leaveData,
      attendanceData,
      salaryData,
      profile: req.user.role === "employee" ? formattedEmployees : null,
    });
  } catch (err) {
    console.error("Get Employees Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// export const getEmployees = async (req, res) => {
//   try {
//     // 1️⃣ Find logged-in user's employee record
//     const employee = await Employee.findOne({ userId: req.user._id })
//       .populate({
//         path: "userId",
//         select: "name email role phone avatar",
//       });

//     if (!employee) return res.status(404).json({ message: "Employee record not found." });

//     // 2️⃣ Fetch related data for this employee only
//     const leaveData = await Leave.find({ employeeId: employee._id });
//     const attendanceData = await Attendance.find({ employeeId: employee._id });
//     const salaryData = await Payroll.find({ employeeId: employee._id });

//     res.json({
//       success: true,
//       profile: employee,
//       leaves: leaveData,
//       attendance: attendanceData,
//       salary: salaryData,
//     });
//   } catch (err) {
//     console.error("Get My Profile Data Error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };



// -------------------------------------------------------------------
// GET SINGLE EMPLOYEE
// -------------------------------------------------------------------
export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.json({ success: true, emp });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// ADD EMPLOYEE
// -------------------------------------------------------------------



export const addEmployee = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, email, password, phone, department, designation, jobRole, basicSalary, dob, notes } = req.body;

    if (!name || !email || !password) return res.status(400).json({ message: "Name, email, and password are required." });

    // Check duplicate email
    const existsUser = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (existsUser) return res.status(400).json({ message: "User with this email already exists." });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1️ Create User
    const user = await User.create([{
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "employee",
      companyId: req.user.companyId,
      avatar: req.file ? req.file.path : "",
      emailVerified: true,
    }], { session });

    // 2️ Create Employee
    const employee = await Employee.create([{
      userId: user[0]._id,
      companyId: req.user.companyId,
      createdBy: req.user._id,
      name,
      email: email.toLowerCase(),
      phone,
      department,
      designation,
      jobRole,
      basicSalary: Number(basicSalary) || 0,
      dateOfBirth: dob ? new Date(dob) : undefined,
      avatar: req.file ? req.file.path : "",
      notes
    }], { session });

    // 3️ Link back
    user[0].employeeId = employee[0]._id;
    await user[0].save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Employee registered successfully",
      employee,
      userLoginData: { email: user[0].email, password } // send securely
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Add Employee Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// -------------------------------------------------------------------
// UPDATE EMPLOYEE
// -------------------------------------------------------------------
export const updateEmployeeProfile = async (req, res) => {
  try {
    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    });

    if (req.file?.path) updateData.avatar = req.file.path;

    if (updateData.joinDate) updateData.joinDate = new Date(updateData.joinDate);
    if (updateData.dob) updateData.dateOfBirth = new Date(updateData.dob);

    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      updateData,
      { new: true }
    );

    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.json({ success: true, message: "Updated successfully", emp });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// DELETE EMPLOYEE
// -------------------------------------------------------------------
export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    res.json({ success: true, message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// SEARCH EMPLOYEES
// -------------------------------------------------------------------
export const searchEmployees = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { companyId: req.user.companyId };

    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { department: regex },
        { jobRole: regex },
        { employeeCode: regex },
        { status: regex },
      ];

      if (mongoose.isValidObjectId(search)) query.$or.push({ _id: new mongoose.Types.ObjectId(search) });
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: employees.length, employees });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// FILTER EMPLOYEES
// -------------------------------------------------------------------
export const filterEmployees = async (req, res) => {
  try {
    const { jobRole, department, minSalary, maxSalary, sort } = req.query;
    const query = { companyId: req.user.companyId };

    if (jobRole) query.jobRole = jobRole;
    if (department) query.department = department;

    if (minSalary || maxSalary) {
      query.basicSalary = {};
      if (minSalary) query.basicSalary.$gte = Number(minSalary);
      if (maxSalary) query.basicSalary.$lte = Number(maxSalary);
    }

    let employees = await Employee.find(query);

    // Sorting
    if (sort === "a-z") employees = employees.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "salary-high") employees = employees.sort((a, b) => b.basicSalary - a.basicSalary);
    else if (sort === "latest") employees = employees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: employees.length, employees });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


