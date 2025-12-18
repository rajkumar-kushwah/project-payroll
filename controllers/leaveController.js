import Leave from "../models/Leave.js";
import mongoose from "mongoose";

export const applyLeave = async (req, res) => {
  try {
    const { date, type, reason } = req.body;

    //   same date leave already applied?
    const alreadyApplied = await Leave.findOne({
      employeeId: req.user._id,
      date,
    });

    if (alreadyApplied) {
      return res.status(400).json({
        message: "Leave already applied for this date",
      });
    }

    //  create leave
    const leave = await Leave.create({
      employeeId: req.user._id,
    employeeCode: req.user.employeeCode,
      companyId: req.user.companyId,
      date,
      type,
      reason,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Leave applied successfully",
      data: leave,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


// export const getPendingLeaves = async (req,res) => {
//     try{
//      // sirf admin/ owner/hr
//       if (!["admin", "owner", "hr"].includes(req.user.role)) {
//         return res.status(403).json({message: "Access denied"});
//       }

//     const leaves = await Leave.find({
//         companyId: req.user.companyId,
//         status: "pending",

//     })       
//       .populate("employeeId", "name email role phone avatar")
//       .sort({ createdAt: -1});

//       res.json({
//         success:true,
//         count: leaves.length,
//         data: leaves,
//       })
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({message: err.message});
//     }
// }

export const updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    leave.status = status;
    leave.approvedBy = req.user._id;

    await leave.save();

    res.json({
      success: true,
      message: `Leave status updated to ${status}`,
      data: leave,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({
      employeeId: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/leaves?status=pending|approved|rejected
export const getLeaves = async (req, res) => {
  try {
    const { status } = req.query;

    // sirf admin / owner / hr
    if (!["admin", "owner", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { companyId: req.user.companyId };
    if (status) query.status = status; 

    const leaves = await Leave.find(query)
      .populate("employeeId", "name email employeeCode role phone avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: leaves.length, data: leaves });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


// controllers/leaveController.js
export const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    if (
      req.user.role === "employee" &&
      leave.employeeId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Use deleteOne instead of remove
    await leave.deleteOne();

    res.json({ success: true, message: "Leave deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
