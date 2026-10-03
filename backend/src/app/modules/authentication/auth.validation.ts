import { z } from "zod";

export const adminLoginSchema = z.object({
    email: z.string().email("Valid email is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const employeeLoginSchema = z.object({
    employeeId: z.string().min(1, "Employee ID is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});