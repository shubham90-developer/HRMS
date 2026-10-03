import { z } from "zod";
import {
  LeaveSession,
  LeaveType,
} from "./leave.interface";

export const createLeaveSchema = z.object({
  employee: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid employee ID"),

  leaveType: z.enum([
    LeaveType.CASUAL,
    LeaveType.SICK,
    LeaveType.EARNED,
    LeaveType.PRIVILEGE,
    LeaveType.OTHER,
  ]),

  startDate: z.coerce.date(),

  endDate: z.coerce.date(),

  session: z.enum([
    LeaveSession.FULL_DAY,
    LeaveSession.FIRST_HALF,
    LeaveSession.SECOND_HALF,
  ]),

  reason: z
    .string()
    .min(3, "Reason must contain at least 3 characters")
    .max(250, "Reason cannot exceed 250 characters"),

  attachment: z
    .string()
    .optional(),

  reportingManager: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid reporting manager ID")
    .optional(),
})
.refine(
  (data) => data.endDate >= data.startDate,
  {
    message: "End date must be greater than or equal to start date",
    path: ["endDate"],
  }
);

export const updateLeaveSchema = z.object({
  leaveType: z
    .enum([
      LeaveType.CASUAL,
      LeaveType.SICK,
      LeaveType.EARNED,
      LeaveType.PRIVILEGE,
      LeaveType.OTHER,
    ])
    .optional(),

  startDate: z.coerce.date().optional(),

  endDate: z.coerce.date().optional(),

  session: z
    .enum([
      LeaveSession.FULL_DAY,
      LeaveSession.FIRST_HALF,
      LeaveSession.SECOND_HALF,
    ])
    .optional(),

  reason: z
    .string()
    .min(3)
    .max(250)
    .optional(),

  attachment: z
    .string()
    .optional(),

  reportingManager: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid reporting manager ID")
    .optional(),
});

export const rejectLeaveSchema = z.object({
  rejectionReason: z
    .string()
    .min(3, "Rejection reason is required")
    .max(250),
});