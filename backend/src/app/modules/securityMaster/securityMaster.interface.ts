import { Types } from "mongoose";

/* ------------------------------ Master data ------------------------------ */

export enum MasterType {
    DEPARTMENT = "department",
    DESIGNATION = "designation",
    SHIFT = "shift",
    BRANCH_LOCATION = "branch-location",
    COST_CENTER = "cost-center",
    GRADE_BAND = "grade-band",
    EMPLOYMENT_TYPE = "employment-type",
    HOLIDAY = "holiday",
}

export enum HolidayType {
    NATIONAL = "National",
    FESTIVAL = "Festival",
    OPTIONAL = "Optional",
    COMPANY = "Company",
}

export interface IMasterData {
    type: MasterType;
    name: string;
    code?: string;
    description?: string;

    // department
    departmentHead?: Types.ObjectId;

    // shift
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
    gracePeriodMinutes?: number;
    breakDurationMinutes?: number;
    workingHours?: number;

    // branch-location
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pinCode?: string;
    latitude?: number;
    longitude?: number;
    geofenceRadius?: number; // metres

    // grade-band
    minSalary?: number;
    maxSalary?: number;

    // holiday
    date?: Date;
    holidayType?: HolidayType;

    isActive: boolean;
    isDeleted: boolean;
    createdBy?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

/* ------------------------------ Security ------------------------------ */

export interface ISecurityPolicy {
    key: string; // always "default" - single document
    passwordMinLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecialChar: boolean;
    passwordExpiryDays: number;
    maxLoginAttempts: number;
    twoFactorRequired: boolean;
    sessionTimeoutMinutes: number;
    updatedBy?: Types.ObjectId;
    updatedAt?: Date;
}

export interface ILoginSession {
    account: Types.ObjectId;
    deviceName: string;
    platform?: string;
    ipAddress?: string;
    userAgent?: string;
    lastActiveAt: Date;
    isActive: boolean;
    revokedAt?: Date;
    revokedBy?: Types.ObjectId;
    createdAt?: Date;
}

export interface IAuditLog {
    actor?: Types.ObjectId;
    actorName?: string;
    actorRole?: string;
    action: string; // CREATE | UPDATE | DELETE | REVOKE | ...
    module: string;
    targetId?: string;
    description?: string;
    ipAddress?: string;
    createdAt?: Date;
}

/* ------------------------------ Roles & permissions ------------------------------ */

export interface IRolePermission {
    name: string;
    description?: string;
    permissions: string[]; // e.g. "employee.read", "leave.approve"
    isActive: boolean;
    isDeleted: boolean;
    createdBy?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}
