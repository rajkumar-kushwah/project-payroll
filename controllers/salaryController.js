import Salary from "../models/Salary.js";
import Employee from "../models/Employee.js";

// -------------------------------------------------------------
// SET SALARY (Only first time)
// -------------------------------------------------------------
export const setSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { basic, hra, allowances, deductions } = req.body;

    const exists = await Salary.findOne({
      employeeId,
      companyId: req.user.companyId,
    });

    if (exists) {
      return res.status(400).json({ message: "Salary already assigned!" });
    }

    const netSalary = basic + hra + allowances - deductions;

    const salary = await Salary.create({
      employeeId,
      companyId: req.user.companyId,
      basic,
      hra,
      allowances,
      deductions,
      netSalary,
      month: new Date().toISOString().slice(0, 7),
      status: "unpaid",
    });

    res.status(201).json({ success: true, salary });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// -------------------------------------------------------------
// UPDATE SALARY
// -------------------------------------------------------------
export const updateSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { basic, hra, allowances, deductions } = req.body;

    const netSalary = basic + hra + allowances - deductions;

    const salary = await Salary.findOneAndUpdate(
      { employeeId, companyId: req.user.companyId },
      { basic, hra, allowances, deductions, netSalary },
      { new: true }
    );

    if (!salary)
      return res.status(404).json({ message: "Salary not found!" });

    res.json({ success: true, salary });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// -------------------------------------------------------------
// GET SINGLE EMPLOYEE SALARY
// -------------------------------------------------------------
export const getSalary = async (req, res) => {
  try {
    const salary = await Salary.findOne({
      employeeId: req.params.employeeId,
      companyId: req.user.companyId,
    }).populate("employeeId");

    if (!salary)
      return res.status(404).json({ message: "Salary not set" });

    res.json({ success: true, salary });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// -------------------------------------------------------------
// GET ALL SALARIES (ADMIN)
// -------------------------------------------------------------
export const getAllSalary = async (req, res) => {
  try {
    const salaries = await Salary.find({
      companyId: req.user.companyId,
    }).populate("employeeId");

    res.json({ success: true, salaries });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// -------------------------------------------------------------
// FILTER SALARY (month, status, range)
// -------------------------------------------------------------
export const filterSalary = async (req, res) => {
  try {
    const { month, status, min, max } = req.query;

    const query = { companyId: req.user.companyId };

    if (month) query.month = month;
    if (status) query.status = status;
    if (min || max)
      query.netSalary = {
        ...(min && { $gte: Number(min) }),
        ...(max && { $lte: Number(max) }),
      };

    const salaries = await Salary.find(query).populate("employeeId");

    res.json({ success: true, salaries });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// -------------------------------------------------------------
// SEARCH SALARY BY NAME OR EMP ID
// -------------------------------------------------------------
export const searchSalary = async (req, res) => {
  try {
    const { q } = req.query;

    const employees = await Employee.find({
      companyId: req.user.companyId,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { employeeCode: { $regex: q, $options: "i" } }
      ]
    });

    const ids = employees.map((e) => e._id);

    const salaries = await Salary.find({
      employeeId: { $in: ids }
    }).populate("employeeId");

    res.json({ success: true, salaries });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
