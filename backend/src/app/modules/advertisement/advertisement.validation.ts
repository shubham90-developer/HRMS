import { z } from "zod";
import {
  AdvertisementAudience,
  AdvertisementPriority,
  AdvertisementStatus,
  AdvertisementType,
} from "./advertisement.interface";

const typeEnum = z.enum([
  AdvertisementType.GENERAL,
  AdvertisementType.UPDATE,
  AdvertisementType.EVENT,
  AdvertisementType.POLICY,
  AdvertisementType.ALERT,
]);

const priorityEnum = z.enum([
  AdvertisementPriority.LOW,
  AdvertisementPriority.MEDIUM,
  AdvertisementPriority.HIGH,
]);

const audienceEnum = z.enum([
  AdvertisementAudience.ALL,
  AdvertisementAudience.DEPARTMENTS,
]);

const statusEnum = z.enum([
  AdvertisementStatus.DRAFT,
  AdvertisementStatus.PUBLISHED,
]);

/*
 * Departments can arrive as a real array (JSON), a JSON string, a comma
 * separated string or repeated form fields (multipart/form-data).
 */
const departmentsField = z.preprocess(
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
      .map((item) => (typeof item === "string" ? item.trim() : item))
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
  z.array(z.string().min(1).max(100)).max(50).optional()
);

// "true" / "false" strings come from multipart/form-data
const booleanField = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;

  return value;
}, z.boolean().optional());

// An empty form value means "clear it"
const clearableDate = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce.date().nullable().optional()
);

const titleField = z
  .string()
  .trim()
  .min(2, "Title must contain at least 2 characters")
  .max(150, "Title cannot exceed 150 characters");

const descriptionField = z
  .string()
  .trim()
  .min(2, "Description must contain at least 2 characters")
  .max(5000, "Description cannot exceed 5000 characters");

export const createAdvertisementSchema = z
  .object({
    title: titleField,

    description: descriptionField,

    type: typeEnum.default(AdvertisementType.GENERAL),

    priority: priorityEnum.default(AdvertisementPriority.MEDIUM),

    audience: audienceEnum.default(AdvertisementAudience.ALL),

    departments: departmentsField,

    status: statusEnum.default(AdvertisementStatus.PUBLISHED),

    publishAt: z.coerce.date().optional(),

    expiresAt: z.coerce.date().optional(),
  })
  .refine(
    (data) =>
      data.audience !== AdvertisementAudience.DEPARTMENTS ||
      (data.departments?.length ?? 0) > 0,
    {
      message: "Select at least one department for a department audience",
      path: ["departments"],
    }
  )
  .refine(
    (data) =>
      !data.expiresAt ||
      data.expiresAt.getTime() > (data.publishAt ?? new Date()).getTime(),
    {
      message: "Expiry date must be after the publish date",
      path: ["expiresAt"],
    }
  );

/* No defaults - a PATCH only changes what was sent. */
export const updateAdvertisementSchema = z
  .object({
    title: titleField.optional(),

    description: descriptionField.optional(),

    type: typeEnum.optional(),

    priority: priorityEnum.optional(),

    audience: audienceEnum.optional(),

    departments: departmentsField,

    publishAt: z.coerce.date().optional(),

    expiresAt: clearableDate,

    removeImage: booleanField,

    removeAttachment: booleanField,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message:
      "At least one field (or a new image / attachment file) is required to update",
  });

export const updateAdvertisementStatusSchema = z.object({
  status: statusEnum,

  // Only used when publishing - schedules it for later
  publishAt: z.coerce.date().optional(),
});
