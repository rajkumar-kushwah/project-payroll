import mongoose from "mongoose";

const officeHolidaySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    //  OPTIONAL: agar kisi specific employee ke liye holiday ho
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    //  NEW: multi-day holiday support
    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },
    totalDays: { type: Number },
    title: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["NATIONAL", "FESTIVAL", "COMPANY", "PAID", "UNPAID", "paid", "unpaid"],
      required: true,
    },

    isPaid: {
      type: Boolean,
      default: true,
    },

    description: {
      type: String,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

//  Company + date range unique
officeHolidaySchema.index(
  { companyId: 1, startDate: 1, endDate: 1 },
  { unique: true }
);

export default mongoose.model("OfficeHoliday", officeHolidaySchema);
