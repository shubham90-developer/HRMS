import { z } from "zod";
import {
    AlertSeverity,
    AlertCategory,
    AlertAudience,
} from "./alerts.interface";

const objectId = (label: string) =>
    z.string().regex(/^[0-9a-fA-F]{24}$/, `Invalid ${label}`);

const baseFields = {
    title: z.string().min(2).max(150),
    message: z.string().min(2).max(1000),
    severity: z
        .enum([
            AlertSeverity.INFO,
            AlertSeverity.WARNING,
            AlertSeverity.CRITICAL,
        ])
        .optional(),
    category: z
        .enum([
            AlertCategory.SYSTEM,
            AlertCategory.PAYROLL,
            AlertCategory.SECURITY,
            AlertCategory.DOCUMENT_EXPIRY,
            AlertCategory.COMPLIANCE,
            AlertCategory.ATTENDANCE,
            AlertCategory.OTHER,
        ])
        .optional(),
    audience: z
        .enum([
            AlertAudience.ALL,
            AlertAudience.ADMIN,
            AlertAudience.EMPLOYEE,
        ])
        .optional(),
    targetEmployee: objectId("employee ID").optional(),
    documentName: z.string().max(150).optional(),
    expiryDate: z.coerce.date().optional(),
};

export const createAlertSchema = z.object(baseFields);

export const updateAlertSchema = z.object(baseFields).partial();

export const resolveAlertSchema = z.object({
    resolutionNote: z.string().max(500).optional(),
});
