import { Schema, model } from "mongoose";
import {
    IMasterData,
    ISecurityPolicy,
    ILoginSession,
    IAuditLog,
    IRolePermission,
    MasterType,
    HolidayType,
} from "./securityMaster.interface";

const masterDataSchema = new Schema<IMasterData>(
    {
        type: {
            type: String,
            enum: Object.values(MasterType),
            required: true,
            index: true,
        },
        name: { type: String, required: true, trim: true },
        code: { type: String, trim: true, uppercase: true },
        description: { type: String, trim: true },

        departmentHead: { type: Schema.Types.ObjectId, ref: "Employee" },

        startTime: { type: String, trim: true },
        endTime: { type: String, trim: true },
        gracePeriodMinutes: { type: Number, min: 0 },
        breakDurationMinutes: { type: Number, min: 0 },
        workingHours: { type: Number, min: 0 },

        address: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, trim: true },
        pinCode: { type: String, trim: true },
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 },
        geofenceRadius: { type: Number, min: 0 },

        minSalary: { type: Number, min: 0 },
        maxSalary: { type: Number, min: 0 },

        date: { type: Date },
        holidayType: { type: String, enum: Object.values(HolidayType) },

        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "Auth" },
    },
    { timestamps: true }
);

masterDataSchema.index({ type: 1, code: 1, isDeleted: 1 });
masterDataSchema.index({ type: 1, date: 1 });

const securityPolicySchema = new Schema<ISecurityPolicy>(
    {
        key: { type: String, default: "default", unique: true },
        passwordMinLength: { type: Number, default: 8, min: 6, max: 64 },
        requireUppercase: { type: Boolean, default: true },
        requireLowercase: { type: Boolean, default: true },
        requireNumber: { type: Boolean, default: true },
        requireSpecialChar: { type: Boolean, default: true },
        passwordExpiryDays: { type: Number, default: 90, min: 0 },
        maxLoginAttempts: { type: Number, default: 5, min: 1 },
        twoFactorRequired: { type: Boolean, default: false },
        sessionTimeoutMinutes: { type: Number, default: 30, min: 5 },
        updatedBy: { type: Schema.Types.ObjectId, ref: "Auth" },
    },
    { timestamps: true }
);

const loginSessionSchema = new Schema<ILoginSession>(
    {
        account: {
            type: Schema.Types.ObjectId,
            ref: "Auth",
            required: true,
            index: true,
        },
        deviceName: { type: String, required: true, trim: true },
        platform: { type: String, trim: true },
        ipAddress: { type: String, trim: true },
        userAgent: { type: String, trim: true },
        lastActiveAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true, index: true },
        revokedAt: { type: Date },
        revokedBy: { type: Schema.Types.ObjectId, ref: "Auth" },
    },
    { timestamps: true }
);

const auditLogSchema = new Schema<IAuditLog>(
    {
        actor: { type: Schema.Types.ObjectId, ref: "Auth", index: true },
        actorName: { type: String, trim: true },
        actorRole: { type: String, trim: true },
        action: { type: String, required: true, index: true },
        module: { type: String, required: true, index: true },
        targetId: { type: String, trim: true },
        description: { type: String, trim: true },
        ipAddress: { type: String, trim: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

const rolePermissionSchema = new Schema<IRolePermission>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        permissions: { type: [String], default: [] },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "Auth" },
    },
    { timestamps: true }
);

export const MasterData = model<IMasterData>("MasterData", masterDataSchema);
export const SecurityPolicy = model<ISecurityPolicy>("SecurityPolicy", securityPolicySchema);
export const LoginSession = model<ILoginSession>("LoginSession", loginSessionSchema);
export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
export const RolePermission = model<IRolePermission>("RolePermission", rolePermissionSchema);
