import Salary from "../models/Salary.js";

// Add Salary
export const addSalary = async (req, res) => {
  try {
    const salary = new Salary(req.body);
    await salary.save();
    res.status(201).json(salary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Salary by Employee
export const getSalaryByEmployee = async (req, res) => {
  try {
    const salaries = await Salary.find({ EmployeeId: req.params.employeeId });
    // Agar koi salary nahi hai to bhi empty array return kare
    return res.json(salaries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Update Salary
export const updateSalary = async (req, res) => {
  try {
    const salary = await Salary.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!salary) return res.status(404).json({ message: "Salary not found" });
    res.json(salary);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Salary
export const deleteSalary = async (req, res) => {
  try {
    const salary = await Salary.findByIdAndDelete(req.params.id);
    if (!salary) return res.status(404).json({ message: "Salary not found" });
    res.json({ message: "Salary deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
