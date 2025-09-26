import Salary from "../models/Salary.js";

// Add Salary
export const addSalary = async (req, res) => {
  try {
    const salary = new Salary(req.body);
    await salary.save();
    res.status(201).json({ message: "Salary added successfully", salary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Salary by Employee
export const getSalaryByEmployee = async (req, res) => {
  try {
    const salaries = await Salary.find({ employeeId: req.params.employeeId });
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update/Edit Salary
export const updateSalary = async (req, res) => {
  try {
    const salary = await Salary.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "Salary updated successfully", salary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Salary
export const deleteSalary = async (req, res) => {
  try {
    await Salary.findByIdAndDelete(req.params.id);
    res.json({ message: "Salary deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark Salary as Paid
export const paySalary = async (req, res) => {
  try {
    const salary = await Salary.findByIdAndUpdate(req.params.id, {
      status: "Paid",
      paidOn: new Date(),
    }, { new: true });
    res.json({ message: "Salary marked as Paid", salary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Salary by ID
export const getSalaryById = async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) return res.status(404).json({ error: "Salary not found" });
    res.json(salary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// salaryRoutes.js
// router.get("/single/:id", async (req, res) => {
//   try {
//     const salary = await Salary.findById(req.params.id);
//     if (!salary) return res.status(404).json({ error: "Salary not found" });
//     res.json(salary);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

