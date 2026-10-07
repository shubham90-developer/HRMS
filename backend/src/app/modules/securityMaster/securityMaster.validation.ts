import { z } from "zod";
import { MasterType, HolidayType } from "./securityMaster.interface";

const time = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format");

const objectId = (label: string) =>
    z.string().regex(/^[0-9a-fA-F]{24}$/, `Invalid ${label}`);

const masterFields = {
    name: z.string().min(2).max(120),
    code: z.string().min(1).max(30).optional(),
    description: z.string().max(500).optional(),

    departmentHead: objectId("department head ID").optional(),

    startTime: time.optional(),
    endTime: time.optional(),
    gracePeriodMinutes: z.number().min(0).optional(),
    breakDurationMinutes: z.number().min(0).optional(),
    workingHours: z.number().min(0).max(24).optional(),

    address: z.string().max(250).optional(),
    city: z.string().max(80).optional(),
    state: z.string().max(80).optional(),
    country: z.string().max(80).optional(),
    pinCode: z.string().max(12).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    geofenceRadius: z.number().min(0).optional(),

    minSalary: z.number().min(0).optional(),
    maxSalary: z.number().min(0).optional(),

    date: z.coerce.date().optional(),
    holidayType: z
        .enum([
            HolidayType.NATIONAL,
            HolidayType.FESTIVAL,
            HolidayType.OPTIONAL,
            HolidayType.COMPANY,
        ])
        .optional(),

    isActive: z.boolean().optional(),
};

/*
 * Create: the required fields depend on the master type.
 */
export const createMasterSchema = (type: MasterType) =>
    z.object(masterFields).superRefine((d, ctx) => {
        const need = (field: keyof typeof d, label = String(field)) => {
            if (d[field] === undefined || d[field] === "") {
                ctx.addIssue({
                    code: "custom",
                    path: [field as string],
                    message: `${label} is required for ${type}`,
                });
            }
        };

        if (type === MasterType.SHIFT) {
            need("startTime");
            need("endTime");
        } else if (type === MasterType.HOLIDAY) {
            need("date");
        } else {
            need("code");
        }

        if (
            d.minSalary !== undefined &&
            d.maxSalary !== undefined &&
            d.maxSalary < d.minSalary
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["maxSalary"],
                message: "maxSalary must be greater than or equal to minSalary",
            });
        }
    });

export const updateMasterSchema = z.object(masterFields).partial();

export const securityPolicySchema = z.object({
    passwordMinLength: z.number().int().min(6).max(64),
    requireUppercase: z.boolean(),
    requireLowercase: z.boolean(),
    requireNumber: z.boolean(),
    requireSpecialChar: z.boolean(),
    passwordExpiryDays: z.number().int().min(0),
    maxLoginAttempts: z.number().int().min(1),
    twoFactorRequired: z.boolean(),
    sessionTimeoutMinutes: z.number().int().min(5),
});

export const updateSecurityPolicySchema = securityPolicySchema.partial();

export const registerSessionSchema = z.object({
    deviceName: z.string().min(2).max(100),
    platform: z.string().max(50).optional(),
});

export const createRoleSchema = z.object({
    name: z.string().min(2).max(80),
    description: z.string().max(250).optional(),
    permissions: z.array(z.string().min(1).max(80)).default([]),
    isActive: z.boolean().optional(),
});

export const updateRoleSchema = z.object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(250).optional(),
    permissions: z.array(z.string().min(1).max(80)).optional(),
    isActive: z.boolean().optional(),
});
