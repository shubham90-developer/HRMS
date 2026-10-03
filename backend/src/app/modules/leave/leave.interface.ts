import { Types } from "mongoose";

export enum LeaveType {
  CASUAL = "Casual Leave",
  SICK = "Sick Leave",
  EARNED = "Earned Leave",
  PRIVILEGE = "Privilege Leave",
  OTHER = "Other Leave",
}

export enum LeaveSession {
  FULL_DAY = "Full Day",
  FIRST_HALF = "Half Day (First Half)",
  SECOND_HALF = "Half Day (Second Half)",
}

export enum LeaveStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface ILeave {
  employee: Types.ObjectId;

  leaveType: LeaveType;

  startDate: Date;
  endDate: Date;

  totalDays: number;

  session: LeaveSession;

  reason: string;

  attachment?: string;

  reportingManager?: Types.ObjectId;

  status: LeaveStatus;

  rejectionReason?: string;

  approvedBy?: Types.ObjectId;

  approvedAt?: Date;

  rejectedBy?: Types.ObjectId;

  rejectedAt?: Date;

  isDeleted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}