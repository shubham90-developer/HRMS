import { Schema, model } from "mongoose";
import {
    IStatutory,
    ITaxSlab,
    StatutoryType,
    StatutoryCategory,
    FilingStatus,
} from "./statutory.interface";

const taxSlabSchema = new Schema<ITaxSlab>(
    {
        minSalary: { type: Number, required: true, min: 0 },
        maxSalary: { type: Number, min: 0 },
        amount: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const statutorySchema = new Schema<IStatutory>(
    {
        type: {
            type: String,
            enum: Object.values(StatutoryType),
            required: true,
            index: true,
        },

        category: {
            type: String,
            enum: Object.values(StatutoryCategory),
            default: StatutoryCategory.SETTING,
            index: true,
        },

        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },

        isApplicable: { type: Boolean, default: true },
        registrationNumber: { type: String, trim: true },
        wageCeiling: { type: Number, min: 0 },
        employeeContribution: { type: Number, min: 0, max: 100 },
        employerContribution: { type: Number, min: 0, max: 100 },
        taxSlabs: { type: [taxSlabSchema], default: undefined },
        state: { type: String, trim: true },

        periodLabel: { type: String, trim: true },
        dueDate: { type: Date, index: true },
        filingStatus: {
            type: String,
            enum: Object.values(FilingStatus),
        },
        filedOn: { type: Date },
        challanNumber: { type: String, trim: true },
        remarks: { type: String, trim: true },

        attachment: { type: String, trim: true },

        visibleToEmployees: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false, index: true },

        createdBy: { type: Schema.Types.ObjectId, ref: "Auth" },
        updatedBy: { type: Schema.Types.ObjectId, ref: "Auth" },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

/*
 * A pending filing whose due date has passed is reported as Overdue.
 */
statutorySchema.virtual("computedStatus").get(function () {
    if (this.category !== StatutoryCategory.FILING) {
        return undefined;
    }

    if (
        this.filingStatus === FilingStatus.PENDING &&
        this.dueDate &&
        this.dueDate.getTime() < Date.now()
    ) {
        return FilingStatus.OVERDUE;
    }

    return this.filingStatus;
});

statutorySchema.index({ type: 1, category: 1, isDeleted: 1 });

export const Statutory = model<IStatutory>("Statutory", statutorySchema);
