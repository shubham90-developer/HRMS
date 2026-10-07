import { Schema, model } from "mongoose";
import {
    ITraining,
    ITrainingEnrollment,
    TrainingMode,
    TrainingStatus,
    EnrollmentStatus,
} from "./training.interface";

const trainingSchema = new Schema<ITraining>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        category: { type: String, trim: true, index: true },
        trainer: { type: String, required: true, trim: true },

        mode: {
            type: String,
            enum: Object.values(TrainingMode),
            default: TrainingMode.ONLINE,
        },

        venue: { type: String, trim: true },
        startDate: { type: Date, required: true, index: true },
        endDate: { type: Date, required: true },
        startTime: { type: String, trim: true },
        endTime: { type: String, trim: true },
        durationHours: { type: Number, min: 0 },
        capacity: { type: Number, min: 1 },
        isMandatory: { type: Boolean, default: false },

        status: {
            type: String,
            enum: Object.values(TrainingStatus),
            default: TrainingStatus.UPCOMING,
            index: true,
        },

        isActive: { type: Boolean, default: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "Auth" },
        isDeleted: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

const enrollmentSchema = new Schema<ITrainingEnrollment>(
    {
        training: {
            type: Schema.Types.ObjectId,
            ref: "Training",
            required: true,
            index: true,
        },

        employee: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: Object.values(EnrollmentStatus),
            default: EnrollmentStatus.REQUESTED,
            index: true,
        },

        progress: { type: Number, default: 0, min: 0, max: 100 },
        score: { type: Number, min: 0, max: 100 },
        completedAt: { type: Date },
        certificateUrl: { type: String, trim: true },
        rejectionReason: { type: String, trim: true },
        approvedBy: { type: Schema.Types.ObjectId, ref: "Auth" },
        approvedAt: { type: Date },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

enrollmentSchema.index({ training: 1, employee: 1 });

export const Training = model<ITraining>("Training", trainingSchema);

export const TrainingEnrollment = model<ITrainingEnrollment>(
    "TrainingEnrollment",
    enrollmentSchema
);
