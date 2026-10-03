import { z } from "zod";

export const createEmployeeSchema = z.object({
    fullName: z
        .string()
        .min(2, "Full name must be at least 2 characters")
        .trim(),

    role: z
        .string()
        .min(2, "Role is required")
        .trim(),

    employmentStatus: z.enum([
        "Active",
        "Inactive",
        "On Leave",
        "Terminated",
    ]),

    shift: z
        .string()
        .min(1, "Shift is required")
        .trim(),

    department: z
        .string()
        .min(1, "Department is required")
        .trim(),

    gender: z.enum([
        "Male",
        "Female",
        "Other",
    ]),

    dob: z.coerce.date({
        error: "Valid date of birth is required",
    }),

    phoneNumber: z
        .string()
        .regex(
            /^[6-9]\d{9}$/,
            "Enter a valid 10-digit phone number"
        ),

    address: z
        .string()
        .min(5, "Address is required")
        .trim(),

    email: z
        .string()
        .email("Enter a valid email address")
        .trim()
        .toLowerCase(),

    salaryYearly: z
        .number()
        .nonnegative("Yearly salary cannot be negative"),

    joiningDate: z.coerce.date({
        error: "Valid joining date is required",
    }),

    emergencyContact: z.object({
        emergencyContactNumber: z
            .string()
            .regex(
                /^[6-9]\d{9}$/,
                "Enter a valid emergency contact number"
            ),

        phoneNumber: z
            .string()
            .regex(
                /^[6-9]\d{9}$/,
                "Enter a valid emergency contact phone number"
            ),
    }),
});

export const updateEmployeeSchema =
    createEmployeeSchema.partial();