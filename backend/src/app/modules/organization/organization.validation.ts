import { z } from "zod";

export const organizationSchema = z.object({
    organizationName: z
        .string()
        .min(2, "Organization name is required"),

    organizationCode: z
        .string()
        .min(2, "Organization code is required")
        .max(20),

    registrationNumber: z
        .string()
        .optional(),

    industry: z
        .string()
        .min(1, "Industry is required"),

    organizationType: z
        .string()
        .min(1, "Organization type is required"),

    address: z.object({
        addressLine1: z
            .string()
            .min(1, "Address Line 1 is required"),

        addressLine2: z
            .string()
            .optional(),

        country: z
            .string()
            .min(1, "Country is required"),

        state: z
            .string()
            .min(1, "State is required"),

        city: z
            .string()
            .min(1, "City is required"),

        pinCode: z
            .string()
            .min(4, "Invalid PIN code"),
    }),

    contact: z.object({
        email: z
            .string()
            .email("Invalid email address"),

        phoneNumber: z
            .string()
            .min(7, "Invalid phone number"),

        alternativePhoneNumber: z
            .string()
            .optional(),

        website: z
            .string()
            .optional(),

        gstNumber: z
            .string()
            .optional(),

        panNumber: z
            .string()
            .optional(),
    }),

    configuration: z.object({
        financialYearStartMonth: z
            .string()
            .min(1),

        payrollCycle: z
            .string()
            .min(1),

        workingDays: z
            .array(z.string())
            .min(1),

        weeklyOff: z
            .array(z.string())
            .min(1),

        defaultShift: z
            .string()
            .min(1),

        leavePolicy: z
            .string()
            .min(1),

        attendancePolicy: z
            .string()
            .min(1),
    }),
});