import { Schema, model } from "mongoose";
import {
    IAlert,
    AlertSeverity,
    AlertCategory,
    AlertStatus,
    AlertAudience,
} from "./alerts.interface";

const alertSchema = new Schema<IAlert>(
    {
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },

        severity: {
            type: String,
            enum: Object.values(AlertSeverity),
            default: AlertSeverity.INFO,
            index: true,
        },

        category: {
            type: String,
            enum: Object.values(AlertCategory),
            default: AlertCategory.SYSTEM,
            index: true,
        },

        status: {
            type: String,
            enum: Object.values(AlertStatus),
            default: AlertStatus.ACTIVE,
            index: true,
        },

        audience: {
            type: String,
            enum: Object.values(AlertAudience),
            default: AlertAudience.ADMIN,
        },

        targetEmployee: { type: Schema.Types.ObjectId, ref: "Employee" },

        documentName: { type: String, trim: true },
        expiryDate: { type: Date, index: true },

        acknowledgedBy: { type: Schema.Types.ObjectId, ref: "Auth" },
        acknowledgedAt: { type: Date },
        resolvedBy: { type: Schema.Types.ObjectId, ref: "Auth" },
        resolvedAt: { type: Date },
        resolutionNote: { type: String, trim: true },

        createdBy: { type: Schema.Types.ObjectId, ref: "Auth" },
        isDeleted: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

export const Alert = model<IAlert>("Alert", alertSchema);
