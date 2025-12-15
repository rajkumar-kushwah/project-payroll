import Employee from "../models/Employee.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

// -------------------------------------------------------------------
// GET ALL EMPLOYEES
// -------------------------------------------------------------------
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({
      companyId: req.user.companyId,
    }).sort({ createdAt: -1 });

    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// -------------------------------------------------------------------
// GET SINGLE EMPLOYEE
// -------------------------------------------------------------------
export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    // Employee role ke liye check
   if (req.user.role === "employee" && emp._id.toString() !== req.user.employeeId.toString()) {
  return res.status(403).json({ message: "Access denied" });
}



    if (!emp) return res.status(404).json({ message: "Employee not found" });
    res.json({ success: true, emp });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// -------------------------------------------------------------------
// ADD EMPLOYEE (Salary auto-generate nahi hoti)
// -------------------------------------------------------------------

// ------------------------------------------------
// ADD EMPLOYEE + CREATE LOGIN USER
// ------------------------------------------------
export const addEmployee = async (req, res) => {
  let employee;
  try {
    const { name, email, password, phone, dob, jobRole, department, designation, joinDate, status, basicSalary, notes } = req.body;

    if (!password) return res.status(400).json({ message: "Password required" });

    // Check duplicate employee/email
    const existsEmp = await Employee.findOne({ email: email.toLowerCase(), companyId: req.user.companyId });
    const existsUser = await User.findOne({ email: email.toLowerCase() });

    if (existsEmp || existsUser) return res.status(400).json({ message: "Employee/User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Avatar handling
    let avatar = "";
    if (req.file) avatar = req.file.path || req.file.filename || "";

    // Date handling
    const dateOfBirth = dob ? new Date(dob) : undefined;
    const joiningDate = joinDate ? new Date(joinDate) : new Date();

    // Create Employee first
    employee = await Employee.create({
      name,
      email,
      phone,
      dateOfBirth,
      jobRole,
      department,
      designation,
      joinDate: joiningDate,
      basicSalary: Number(basicSalary),
      status,
      notes,
      avatar,
      companyId: req.user.companyId,
      createdBy: req.user._id,
    });

    // Create login User
    try {
      await User.create({
        name,
        email,
        password: hashedPassword,
        role: "employee",
        companyId: req.user.companyId,
        employeeId: employee._id,
      });
    } catch (err) {
      // Rollback Employee if User creation fails
      await Employee.findByIdAndDelete(employee._id);
      throw err;
    }

    res.status(201).json({ success: true, message: "Employee created with login access", employee });
  } catch (err) {
    console.error("Add Employee Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



// -------------------------------------------------------------------
// UPDATE EMPLOYEE
// -------------------------------------------------------------------


// -------------------------------------------------------------------
// DELETE EMPLOYEE
// -------------------------------------------------------------------
export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

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

      if (mongoose.isValidObjectId(search)) {
        query.$or.push({ _id: new mongoose.Types.ObjectId(search) });
      }
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });

    res.json({ success: true, employees });
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

    // SORTING
    if (sort === "a-z") {
      employees = employees.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    } else if (sort === "salary-high") {
  employees = employees.sort((a, b) => b.basicSalary - a.basicSalary);
}
 else if (sort === "latest") {
      employees = employees.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    res.json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// export const createEmployeeProfile = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       phone,
//       jobRole,
//       department,
//       designation,
//       joinDate,
//       status,
//       notes,
//     } = req.body;

//     // Check if employee already exists
//     const exists = await Employee.findOne({
//       $or: [{ email: email?.toLowerCase() }, { phone }],
//       companyId: req.user.companyId,
//     });

//     if (exists)
//       return res.status(400).json({ message: "Employee already exists" });

//     // Avatar upload
//     let avatar = "";
//     if (req.file && req.file.path) {
//       avatar = req.file.path; // Cloudinary URL
//     }

//     const emp = await Employee.create({
//       name,
//       email,
//       phone,
//       jobRole,
//       department,
//       designation,
//       joinDate,
//       status,
//       notes,
//       avatar, // save avatar URL
//       companyId: req.user.companyId,
//       createdBy: req.user._id,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Employee created successfully",
//       emp,
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

export const updateEmployeeProfile = async (req, res) => {
  try {
    // Build update object safely
    const updateData = {};
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    });

    if (req.file && req.file.path) {
      updateData.avatar = req.file.path;
    }

    // Convert joinDate to Date type if present
    if (updateData.joinDate) {
      updateData.joinDate = new Date(updateData.joinDate);
    }

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


