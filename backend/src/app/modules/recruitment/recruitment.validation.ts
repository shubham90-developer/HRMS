import { z } from "zod";
import {
  CandidateSource,
  CandidateStage,
  EmploymentType,
  InterviewMode,
  InterviewResult,
  InterviewStatus,
  JobStatus,
  WorkMode,
} from "./recruitment.interface";

const objectId = (label: string) =>
  z.string().regex(/^[0-9a-fA-F]{24}$/, `Invalid ${label}`);

/*
 * Lists can arrive as a real array (JSON body), a JSON string, a comma
 * separated string or repeated form fields (multipart/form-data).
 * Duplicates (case-insensitive) are removed.
 */
const listField = (max: number, itemMax: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }

      let items: unknown = value;

      if (typeof value === "string") {
        const trimmed = value.trim();

        if (trimmed.startsWith("[")) {
          try {
            items = JSON.parse(trimmed);
          } catch {
            items = trimmed;
          }
        } else {
          items = trimmed.split(",");
        }
      }

      if (!Array.isArray(items)) {
        return items;
      }

      const seen = new Set<string>();

      return items
        .map((item) =>
          typeof item === "string" ? item.trim() : item
        )
        .filter((item) => {
          // non-strings are kept so the array schema can reject them
          if (typeof item !== "string") {
            return true;
          }

          if (item === "") {
            return false;
          }

          const key = item.toLowerCase();

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);

          return true;
        });
    },
    z.array(z.string().min(1).max(itemMax)).max(max).optional()
  );

const jobStatusEnum = z.enum([
  JobStatus.OPEN,
  JobStatus.ON_HOLD,
  JobStatus.CLOSED,
]);

const workModeEnum = z.enum([
  WorkMode.ONSITE,
  WorkMode.REMOTE,
  WorkMode.HYBRID,
]);

const employmentTypeEnum = z.enum([
  EmploymentType.FULL_TIME,
  EmploymentType.PART_TIME,
  EmploymentType.CONTRACT,
  EmploymentType.INTERNSHIP,
]);

const stageEnum = z.enum([
  CandidateStage.APPLIED,
  CandidateStage.SCREENING,
  CandidateStage.INTERVIEW,
  CandidateStage.OFFER,
  CandidateStage.HIRED,
  CandidateStage.REJECTED,
]);

const sourceEnum = z.enum([
  CandidateSource.LINKEDIN,
  CandidateSource.NAUKRI,
  CandidateSource.INDEED,
  CandidateSource.REFERRAL,
  CandidateSource.COMPANY_WEBSITE,
  CandidateSource.CAMPUS,
  CandidateSource.OTHER,
]);

const interviewModeEnum = z.enum([
  InterviewMode.ONLINE,
  InterviewMode.IN_PERSON,
  InterviewMode.PHONE,
]);

const interviewStatusEnum = z.enum([
  InterviewStatus.SCHEDULED,
  InterviewStatus.COMPLETED,
  InterviewStatus.CANCELLED,
]);

const interviewResultEnum = z.enum([
  InterviewResult.SELECTED,
  InterviewResult.REJECTED,
  InterviewResult.ON_HOLD,
]);

const phoneField = z
  .string()
  .trim()
  .regex(
    /^[0-9+\-\s()]{7,20}$/,
    "Phone number must be 7-20 characters (digits, +, -, spaces)"
  );

/* ------------------------------ Job openings ----------------------------- */

const titleField = z
  .string()
  .trim()
  .min(2, "Job title must contain at least 2 characters")
  .max(120, "Job title cannot exceed 120 characters");

const departmentField = z
  .string()
  .trim()
  .min(2, "Department is required")
  .max(100);

export const createJobSchema = z
  .object({
    title: titleField,

    department: departmentField,

    location: z.string().trim().max(120).optional(),

    workMode: workModeEnum.default(WorkMode.ONSITE),

    employmentType: employmentTypeEnum.default(
      EmploymentType.FULL_TIME
    ),

    experienceMin: z.coerce.number().min(0).max(60).default(0),

    experienceMax: z.coerce.number().min(0).max(60).optional(),

    skills: listField(30, 50),

    description: z.string().trim().max(3000).optional(),

    vacancies: z.coerce.number().int().min(1).max(1000).default(1),

    closingDate: z.coerce.date().optional(),

    status: jobStatusEnum.default(JobStatus.OPEN),
  })
  .refine(
    (data) =>
      data.experienceMax === undefined ||
      data.experienceMax >= data.experienceMin,
    {
      message:
        "Maximum experience must be greater than or equal to minimum experience",
      path: ["experienceMax"],
    }
  );

/* No defaults - a PATCH only changes what was sent. */
export const updateJobSchema = z
  .object({
    title: titleField.optional(),

    department: departmentField.optional(),

    location: z.string().trim().max(120).optional(),

    workMode: workModeEnum.optional(),

    employmentType: employmentTypeEnum.optional(),

    experienceMin: z.coerce.number().min(0).max(60).optional(),

    experienceMax: z.coerce.number().min(0).max(60).optional(),

    skills: listField(30, 50),

    description: z.string().trim().max(3000).optional(),

    vacancies: z.coerce.number().int().min(1).max(1000).optional(),

    // null clears the closing date
    closingDate: z.coerce.date().nullable().optional(),

    status: jobStatusEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });

export const updateJobStatusSchema = z.object({
  status: jobStatusEnum,
});

/* ------------------------------- Candidates ------------------------------ */

export const createCandidateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must contain at least 2 characters")
    .max(100),

  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email address")),

  phone: phoneField,

  experienceYears: z.coerce.number().min(0).max(60).default(0),

  currentCompany: z.string().trim().max(120).optional(),

  skills: listField(30, 50),

  source: sourceEnum.default(CandidateSource.OTHER),

  notes: z.string().trim().max(1000).optional(),

  appliedAt: z.coerce.date().optional(),
});

export const updateCandidateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Invalid email address"))
      .optional(),

    phone: phoneField.optional(),

    experienceYears: z.coerce.number().min(0).max(60).optional(),

    currentCompany: z.string().trim().max(120).optional(),

    skills: listField(30, 50),

    source: sourceEnum.optional(),

    notes: z.string().trim().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field (or a new resume file) is required to update",
  });

export const updateCandidateStageSchema = z.object({
  stage: stageEnum,

  note: z.string().trim().max(500).optional(),
});

/* ------------------------------- Interviews ------------------------------ */

export const scheduleInterviewSchema = z
  .object({
    round: z.coerce.number().int().min(1).max(10).optional(),

    title: z.string().trim().max(100).optional(),

    scheduledAt: z.coerce.date(),

    durationMinutes: z.coerce.number().int().min(15).max(480).default(60),

    mode: interviewModeEnum.default(InterviewMode.ONLINE),

    location: z.string().trim().max(300).optional(),

    interviewers: z.array(objectId("interviewer ID")).max(10).default([]),
  })
  .refine(
    (data) => data.scheduledAt.getTime() > Date.now() - 5 * 60 * 1000,
    {
      message: "Interview must be scheduled for a future date and time",
      path: ["scheduledAt"],
    }
  );

export const updateInterviewSchema = z
  .object({
    title: z.string().trim().max(100).optional(),

    scheduledAt: z.coerce.date().optional(),

    durationMinutes: z.coerce.number().int().min(15).max(480).optional(),

    mode: interviewModeEnum.optional(),

    location: z.string().trim().max(300).optional(),

    interviewers: z.array(objectId("interviewer ID")).max(10).optional(),

    status: interviewStatusEnum.optional(),

    feedback: z.string().trim().max(2000).optional(),

    rating: z.coerce.number().int().min(1).max(5).optional(),

    result: interviewResultEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });
