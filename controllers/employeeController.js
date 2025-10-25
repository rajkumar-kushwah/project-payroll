import Employee from "../models/Employee.js";

// Get all employees
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    res.json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add new employee
export const addEmployee = async (req, res) => {
  try {
    const emp = await Employee.create(req.body);
    
     // 2️ Automatically create initial salary record
    await Salary.create({
      EmployeeId: emp._id,
      month: new Date().toISOString().slice(0, 7), // Current month in yyyy-mm
      baseSalary: emp.salary || 0,
      bonus: 0,
      deductions: 0,
      leaves: 0,
      netPay: emp.salary || 0,
    });

    res.status(201).json({
      message: "Employee added successfully",
      data: emp,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    res.json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findByIdAndDelete(req.params.id);
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



//  Search Employees API
export const searchEmployees = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };

      query = {
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { position: searchRegex },
          { department: searchRegex },
          { address: searchRegex },
          { phone: searchRegex },
          { salary: searchRegex },
          { joiningDate: searchRegex },
          { role: searchRegex },
          { status: searchRegex },
          // _id is ObjectId, so handle safely
          ...(mongoose.isValidObjectId(search)
            ? [{ _id: new mongoose.Types.ObjectId(search) }]
            : []),
        ],
      };
    }

    const employees = await Employee.find(query)
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(employees);
  } catch (err) {
    console.error(" Error in searchEmployees:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
