import { Types } from "mongoose";

export enum TrainingMode {
    ONLINE = "Online",
    OFFLINE = "Offline",
    HYBRID = "Hybrid",
}

export enum TrainingStatus {
    UPCOMING = "Upcoming",
    ONGOING = "Ongoing",
    COMPLETED = "Completed",
    CANCELLED = "Cancelled",
}

export enum EnrollmentStatus {
    REQUESTED = "Requested",
    APPROVED = "Approved",
    REJECTED = "Rejected",
    IN_PROGRESS = "In Progress",
    COMPLETED = "Completed",
}

export interface ITraining {
    title: string;
    description?: string;
    category?: string;
    trainer: string;
    mode: TrainingMode;
    venue?: string;
    startDate: Date;
    endDate: Date;
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
    durationHours?: number;
    capacity?: number;
    isMandatory: boolean;
    status: TrainingStatus;
    isActive: boolean;
    createdBy?: Types.ObjectId;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ITrainingEnrollment {
    training: Types.ObjectId;
    employee: Types.ObjectId;
    status: EnrollmentStatus;
    progress: number; // 0-100
    score?: number;
    completedAt?: Date;
    certificateUrl?: string;
    rejectionReason?: string;
    approvedBy?: Types.ObjectId;
    approvedAt?: Date;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
