import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";


// add Attendance
export const addAttendance = async (req, res) =>{
try {
    const { employeeId, date, status, checkIn, checkOut } = req.body;

    //check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) 
        return res.status(404).json({ message: "Employee not found"});

    const record = await Attendance.create({
        employeeId,
        date,
        status,
        checkIn,
        checkOut,
        createdBy: req.user._id,
    });

    res.status(201).json(record);
  
} catch (err) {
     console.error("Add attendance error:", err);
     res.status(500).json({ message: "Server error"});
}
};



// get all Attendance 
export const getAttendance = async (req, res) => {
    try {
        const records = await Attendance.find({createdBy: req.user._id})
        .populate("employeeId", "name employeeID")

        res.json(records);
    } catch (err) { 
        console.error("Get all attendance error:", err);
       return res.status(500).json({ message: "Server error"});
    }
};


// delete Attendance
export const deleteAttendance = async (req, res) => {
    try {
        const id = req.params.id;

        const deleted = await Attendance.findByIdAndDelete(id);

        if (!deleted)
            return res.status(404).json({message: "Attendance not found"});
        
        return res.json({ message: "Attendance deleted successfully"});
    } catch (err){
        console.error("Delete attendance error:", err);
        return res.status(500).json({ message: "Server error"});
    }
};


export const updateAttendance = async (req, res) => {
  try {
    const id = req.params.id;
    const { date, status, checkIn, checkOut } = req.body;

    const updated = await Attendance.findByIdAndUpdate(
      id,
      {
        date,
        status,
        checkIn,
        checkOut,
      },
      { new: true }
    ).populate("employeeId", "name employeeId");

    if (!updated)
      return res.status(404).json({ message: "Attendance Not Found" });

    return res.json({
      message: "Attendance updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update Attendance Error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};