
import express from "express";
import {
  addOfficeHoliday,
  getOfficeHolidays,
  deleteOfficeHoliday,
} from "../controllers/officeHolidayController.js";
import { adminProtect, protect } from "../middleware/authMiddleware.js";


const router = express.Router();

router.use(protect);

router.post("/", adminProtect,  addOfficeHoliday);
router.get("/", getOfficeHolidays);
router.delete("/:id", adminProtect,  deleteOfficeHoliday);

export default router;
