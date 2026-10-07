import { z } from "zod";
import { TrainingMode, TrainingStatus } from "./training.interface";

const time = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format");

const fields = {
    title: z.string().min(3).max(150),
    description: z.string().max(2000).optional(),
    category: z.string().max(80).optional(),
    trainer: z.string().min(2).max(100),
    mode: z
        .enum([TrainingMode.ONLINE, TrainingMode.OFFLINE, TrainingMode.HYBRID])
        .optional(),
    venue: z.string().max(200).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    startTime: time.optional(),
    endTime: time.optional(),
    durationHours: z.number().min(0).optional(),
    capacity: z.number().int().min(1).optional(),
    isMandatory: z.boolean().optional(),
    status: z
        .enum([
            TrainingStatus.UPCOMING,
            TrainingStatus.ONGOING,
            TrainingStatus.COMPLETED,
            TrainingStatus.CANCELLED,
        ])
        .optional(),
    isActive: z.boolean().optional(),
};

export const createTrainingSchema = z
    .object(fields)
    .refine((d) => d.endDate >= d.startDate, {
        message: "End date must be greater than or equal to start date",
        path: ["endDate"],
    });

export const updateTrainingSchema = z.object(fields).partial();

export const rejectEnrollmentSchema = z.object({
    rejectionReason: z.string().min(3).max(250),
});

export const updateProgressSchema = z.object({
    progress: z.number().min(0).max(100),
    score: z.number().min(0).max(100).optional(),
    certificateUrl: z.string().optional(),
});
