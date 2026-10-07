import { z } from "zod";
import {
    StatutoryType,
    StatutoryCategory,
    FilingStatus,
} from "./statutory.interface";

/*
 * Requests may arrive as multipart/form-data (when an attachment is sent),
 * so booleans and arrays can come in as strings.
 */
const boolish = z.preprocess(
    (v) => (v === "true" ? true : v === "false" ? false : v),
    z.boolean()
);

const jsonish = <T extends z.ZodType>(schema: T) =>
    z.preprocess((v) => {
        if (typeof v === "string") {
            try {
                return JSON.parse(v);
            } catch {
                return v;
            }
        }
        return v;
    }, schema);

const taxSlabSchema = z.object({
    minSalary: z.number().min(0),
    maxSalary: z.number().min(0).optional(),
    amount: z.number().min(0),
});

const fields = {
    type: z.enum([
        StatutoryType.PF,
        StatutoryType.ESI,
        StatutoryType.PT,
        StatutoryType.LWF,
    ]),
    category: z
        .enum([StatutoryCategory.SETTING, StatutoryCategory.FILING])
        .optional(),
    title: z.string().min(2).max(150),
    description: z.string().max(1000).optional(),

    isApplicable: boolish.optional(),
    registrationNumber: z.string().max(50).optional(),
    wageCeiling: z.coerce.number().min(0).optional(),
    employeeContribution: z.coerce.number().min(0).max(100).optional(),
    employerContribution: z.coerce.number().min(0).max(100).optional(),
    taxSlabs: jsonish(z.array(taxSlabSchema)).optional(),
    state: z.string().max(80).optional(),

    periodLabel: z.string().max(50).optional(),
    dueDate: z.coerce.date().optional(),
    filingStatus: z
        .enum([
            FilingStatus.PENDING,
            FilingStatus.FILED,
            FilingStatus.OVERDUE,
        ])
        .optional(),
    filedOn: z.coerce.date().optional(),
    challanNumber: z.string().max(80).optional(),
    remarks: z.string().max(500).optional(),

    attachment: z.string().optional(),
    visibleToEmployees: boolish.optional(),
    isActive: boolish.optional(),
};

export const createStatutorySchema = z.object(fields).refine(
    (d) => d.category !== StatutoryCategory.FILING || !!d.dueDate,
    { message: "dueDate is required for filings", path: ["dueDate"] }
);

export const updateStatutorySchema = z.object(fields).partial();

export const updateFilingSchema = z.object({
    filingStatus: z.enum([
        FilingStatus.PENDING,
        FilingStatus.FILED,
        FilingStatus.OVERDUE,
    ]),
    filedOn: z.coerce.date().optional(),
    challanNumber: z.string().max(80).optional(),
    remarks: z.string().max(500).optional(),
});
