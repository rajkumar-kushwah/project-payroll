import express from "express";
import {
  
  getAttendance,
  filterAttendance,
  checkIn,
  checkOut,
} from "../controllers/attendanceController.js";
 import {addAttendance, updateAttendance, deleteAttendance,} from "../controllers/addAttanadace.js";

import {
  protect,
  adminProtect,
  ownerProtect,
} from "../middleware/authMiddleware.js";

import upload from "../middleware/upload.js";

const router = express.Router();

/* ===========================
   LOGIN REQUIRED FOR ALL
=========================== */
router.use(protect);


// // Routes with avatar upload
// router.post("/profile", upload.single("avatar"), createAttendanceProfile);
// router.put("/profile/:id", upload.single("avatar"), updateAttandanceProfile);

/* ===========================
   ADMIN/OWNER SIDE
=========================== */
router.post("/check-in", adminProtect, checkIn);   // Admin/Owner mark attendance
router.post("/check-out", adminProtect, checkOut); // Admin/Owner mark attendance
router.get("/", adminProtect, getAttendance);
router.get("/filter", adminProtect, filterAttendance);
router.post("/add", adminProtect, addAttendance);
router.put("/:id", adminProtect, updateAttendance);
router.delete("/:id", adminProtect, deleteAttendance);


/* ===========================
   OWNER ONLY
   (Optional Advance Feature)
=========================== */
// router.delete("/delete-all", ownerProtect, deleteAllAttendance);

export default router;
