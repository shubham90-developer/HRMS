import { z } from "zod";
import { HolidayType } from "./holiday.interface";

/*
 * Accepts "YYYY-MM-DD" (or any ISO date) and normalises it to UTC midnight
 * so a holiday always lands on one calendar day.
 */
const dateOnly = z.coerce.date().transform(
  (d) =>
    new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    )
);

const holidayTypeEnum = z.enum([
  HolidayType.NATIONAL,
  HolidayType.OPTIONAL,
  HolidayType.RESTRICTED,
  HolidayType.COMPANY,
  HolidayType.OTHER,
]);

// Trims, drops empty values and removes case-insensitive duplicates
const locationsArray = z
  .array(z.string().trim().min(1).max(100))
  .max(50, "A holiday can have at most 50 locations")
  .transform((items) => {
    const seen = new Set<string>();

    return items.filter((item) => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    });
  });

const nameField = z
  .string()
  .trim()
  .min(2, "Holiday name must contain at least 2 characters")
  .max(100, "Holiday name cannot exceed 100 characters");

const descriptionField = z
  .string()
  .trim()
  .max(250, "Description cannot exceed 250 characters");

export const createHolidaySchema = z
  .object({
    name: nameField,

    date: dateOnly,

    type: holidayTypeEnum.default(HolidayType.NATIONAL),

    description: descriptionField.optional(),

    isAllLocations: z.boolean().default(true),

    locations: locationsArray.default([]),
  })
  .refine(
    (data) => data.isAllLocations || data.locations.length > 0,
    {
      message:
        "Select at least one location or mark the holiday for all locations",
      path: ["locations"],
    }
  )
  .refine(
    (data) => !(data.isAllLocations && data.locations.length > 0),
    {
      message:
        "Remove the locations or set isAllLocations to false",
      path: ["locations"],
    }
  );

/*
 * No defaults here on purpose - a PATCH must only touch the fields
 * that were actually sent.
 */
export const updateHolidaySchema = z
  .object({
    name: nameField.optional(),

    date: dateOnly.optional(),

    type: holidayTypeEnum.optional(),

    description: descriptionField.optional(),

    isAllLocations: z.boolean().optional(),

    locations: locationsArray.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  })
  .refine(
    (data) =>
      !(data.isAllLocations === true && (data.locations?.length ?? 0) > 0),
    {
      message:
        "Remove the locations or set isAllLocations to false",
      path: ["locations"],
    }
  );
