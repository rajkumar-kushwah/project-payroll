
import mongoose from "mongoose";

const officeHolidaySchema = new mongoose.Schema({
    
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },

        date: {
            type: Date,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum:["NATIONAL", "FESTIVAL", "COMPANY"],
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

    
},{timestamps: true} )

officeHolidaySchema.index({companyId: 1, date: 1}, {unique:true});

export default mongoose.model("OfficeHoliday", officeHolidaySchema);