import { z } from "zod";
import {
  DOCUMENT_TYPES,
  DocumentCategory,
} from "./employeeDocument.interface";

const categoryEnum = z.enum([
  DocumentCategory.IDENTITY,
  DocumentCategory.EDUCATION,
  DocumentCategory.EMPLOYMENT,
  DocumentCategory.RESUME,
  DocumentCategory.OTHER,
]);

/*
 * Accepts "YYYY-MM-DD" (or any ISO date) and normalises it to UTC midnight
 * so a document date always lands on one calendar day.
 * Form fields sent empty ("") count as "not provided".
 */
const dateOnly = z.coerce.date().transform(
  (d) =>
    new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    )
);

const optionalDate = z.preprocess(
  (value) => (value === "" ? undefined : value),
  dateOnly.optional()
);

// Empty / null clears the date
const clearableDate = z.preprocess(
  (value) => (value === "" ? null : value),
  dateOnly.nullable().optional()
);

const documentTypeField = z
  .string()
  .trim()
  .min(2, "Document type must contain at least 2 characters")
  .max(100, "Document type cannot exceed 100 characters");

const remarksField = z
  .string()
  .trim()
  .max(250, "Remarks cannot exceed 250 characters");

/*
 * Returns the catalogue spelling of a document type
 * ("pan card" -> "PAN Card"), or null when the type does not belong to
 * the category. The "Other" category accepts any name.
 */
export const resolveDocumentType = (
  category: DocumentCategory,
  documentType: string
): string | null => {
  if (category === DocumentCategory.OTHER) {
    return documentType.trim();
  }

  const match = DOCUMENT_TYPES[category].find(
    (type) => type.toLowerCase() === documentType.trim().toLowerCase()
  );

  return match ?? null;
};

export const createDocumentSchema = z
  .object({
    // Required for admins, optional for employees (always themselves)
    employee: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid employee ID")
      .optional(),

    category: categoryEnum,

    documentType: documentTypeField,

    issuedDate: optionalDate,

    expiryDate: optionalDate,

    remarks: remarksField.optional(),
  })
  .refine(
    (data) =>
      resolveDocumentType(data.category, data.documentType) !== null,
    {
      message: "Document type does not belong to the selected category",
      path: ["documentType"],
    }
  )
  .refine(
    (data) =>
      !data.issuedDate ||
      !data.expiryDate ||
      data.expiryDate > data.issuedDate,
    {
      message: "Expiry date must be after the issued date",
      path: ["expiryDate"],
    }
  );

/* No defaults - a PATCH only changes what was sent. */
export const updateDocumentSchema = z
  .object({
    category: categoryEnum.optional(),

    documentType: documentTypeField.optional(),

    issuedDate: clearableDate,

    expiryDate: clearableDate,

    remarks: remarksField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message:
      "At least one field (or a new file) is required to update",
  });

export const rejectDocumentSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(3, "Rejection reason is required")
    .max(250, "Rejection reason cannot exceed 250 characters"),
});
