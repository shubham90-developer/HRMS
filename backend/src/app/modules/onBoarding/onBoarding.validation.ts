import { z } from "zod";

export const createOnboardingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(150, "Title cannot exceed 150 characters"),

  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description cannot exceed 500 characters"),

  status: z
    .enum(["Active", "Inactive"])
    .optional()
    .default("Active"),
});