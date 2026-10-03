import { Schema, model } from "mongoose";
import {
  ILeave,
  LeaveSession,
  LeaveStatus,
  LeaveType,
} from "./leave.interface";

const leaveSchema = new Schema<ILeave>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    leaveType: {
      type: String,
      enum: Object.values(LeaveType),
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
    },

    session: {
      type: String,
      enum: Object.values(LeaveSession),
      default: LeaveSession.FULL_DAY,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    attachment: {
      type: String,
      trim: true,
    },

    reportingManager: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },

    status: {
      type: String,
      enum: Object.values(LeaveStatus),
      default: LeaveStatus.PENDING,
      index: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },

    approvedAt: {
      type: Date,
    },

    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },

    rejectedAt: {
      type: Date,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

leaveSchema.index({
  employee: 1,
  startDate: 1,
  endDate: 1,
});

export const Leave = model<ILeave>("Leave", leaveSchema);