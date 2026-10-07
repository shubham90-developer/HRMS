import { Types } from "mongoose";

export enum AlertSeverity {
    INFO = "Info",
    WARNING = "Warning",
    CRITICAL = "Critical",
}

export enum AlertCategory {
    SYSTEM = "System",
    PAYROLL = "Payroll",
    SECURITY = "Security",
    DOCUMENT_EXPIRY = "Document Expiry",
    COMPLIANCE = "Compliance",
    ATTENDANCE = "Attendance",
    OTHER = "Other",
}

export enum AlertStatus {
    ACTIVE = "Active",
    ACKNOWLEDGED = "Acknowledged",
    RESOLVED = "Resolved",
}

export enum AlertAudience {
    ALL = "all",
    ADMIN = "admin",
    EMPLOYEE = "employee",
}

export interface IAlert {
    title: string;
    message: string;
    severity: AlertSeverity;
    category: AlertCategory;
    status: AlertStatus;

    // Who should see it
    audience: AlertAudience;
    targetEmployee?: Types.ObjectId;

    // Document expiry alerts
    documentName?: string;
    expiryDate?: Date;

    acknowledgedBy?: Types.ObjectId;
    acknowledgedAt?: Date;
    resolvedBy?: Types.ObjectId;
    resolvedAt?: Date;
    resolutionNote?: string;

    createdBy?: Types.ObjectId;
    isDeleted: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}
