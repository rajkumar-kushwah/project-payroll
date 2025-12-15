import Leave from "../models/Leave";


// ADD LEAVE

export const addLeave = async (req, res) => {
    try {
        const { employeeId, date, type, reason } = req.body;

        const leave = await Leave.create({
            employeeId,
            companyId: req.user.companyId,
            date,
            type,
            reason,
            createdBy: req.user._id,
        });

        res.json({ success: true, message: "Leave added successfully", leave });
    } catch (err) {
        console.error("Add Leave Error:", err);
        res.status(500).json({ message: "server error", error: err.message });
    }
};


// GET LEAVES BY MONTH

export const getLeavesByMonth = async (req, res) => {
    try {
        const { year, month } = req.params;

        const leaves = await Leave.find({
            companyId: req.user.companyId,
            date: {
                $gte: new Date(year, month - 1, 1),
                $lte: new Date(year, month, 0, 23, 59, 59, 999),
            },
        }).populate("employeeId", "name email phone avatar");

        res.json({ success: true, leaves });
    } catch (err) {
        console.error("Get Leaves Error:", err);
        res.status(500).json({ message: "server error", error: err.message });
    }
};

// DELETE LEAVE

export const deleteLeave = async (req, res) => {
    try {
        const leave = await Leave.findByIdAndDelete(req.params._id);

        if (!leave) {
            return res.status(404).json({ message: "Leave not found" });
        }

        res.json({ success: true, message: "Leave deleted successfully" });
    } catch (err) {
        console.error("Delete Leave Error:", err);
        res.status(500).json({ message: "server error", error: err.message });
    }
};

export const updateLeave = async (req, res) => {
    try {
        const {employeeId, date, type, reason} = req.body;

        const leave = await Leave.findByIdAndUpdate(req.params._id, {
            employeeId,
            companyId: req.user.companyId,
            date,
            type,
            reason,
        },
        {new: true} 
      )

        if (!leave) {
            return res.status(404).json({ message: "Leave not found" });
        }

        res.json({ success: true, message: "Leave updated successfully" });
    } catch (err) {
        console.error("Update Leave Error:", err);
        res.status(500).json({ message: "server error", error: err.message });
    }
}

// Backend
export const getAllEmployees = async (req, res) => {
  const employees = await Employee.find({ companyId: req.user.companyId });
  res.json({ success: true, employees });
};
