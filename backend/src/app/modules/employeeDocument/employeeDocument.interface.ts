import { Types } from "mongoose";

export enum DocumentCategory {
  IDENTITY = "Identity",
  EDUCATION = "Education",
  EMPLOYMENT = "Employment",
  RESUME = "Resume",
  OTHER = "Other",
}

/*
 * Document types offered for each category.
 * "Other" accepts any type name typed by the user.
 */
export const DOCUMENT_TYPES: Record<DocumentCategory, string[]> = {
  [DocumentCategory.IDENTITY]: [
    "Aadhaar Card",
    "PAN Card",
    "Passport",
    "Driving License",
    "Voter ID",
  ],
  [DocumentCategory.EDUCATION]: [
    "Degree Certificate",
    "Marksheet",
    "Other Certificate",
  ],
  [DocumentCategory.EMPLOYMENT]: [
    "Offer Letter",
    "Appointment Letter",
    "Experience Letter",
    "Relieving Letter",
    "Contract",
    "NDA",
  ],
  [DocumentCategory.RESUME]: ["Resume"],
  [DocumentCategory.OTHER]: [],
};

/*
 * For these categories an employee can hold only one pending or verified
 * document per type (for example one PAN Card). Education certificates and
 * everything else can be uploaded more than once.
 */
export const SINGLE_INSTANCE_CATEGORIES: DocumentCategory[] = [
  DocumentCategory.IDENTITY,
  DocumentCategory.RESUME,
];

// A document counts as "expiring soon" this many days before its expiry date
export const EXPIRY_ALERT_DAYS = 30;

export enum DocumentStatus {
  PENDING = "Pending",
  VERIFIED = "Verified",
  REJECTED = "Rejected",
}

export enum DocumentExpiryStatus {
  NO_EXPIRY = "No Expiry",
  VALID = "Valid",
  EXPIRING_SOON = "Expiring Soon",
  EXPIRED = "Expired",
}

export interface IDocumentFile {
  url: string;
  publicId?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
}

export interface IEmployeeDocument {
  employee: Types.ObjectId;

  category: DocumentCategory;
  documentType: string;

  file: IDocumentFile;

  issuedDate?: Date | null;
  expiryDate?: Date | null;

  remarks?: string;

  status: DocumentStatus;

  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;

  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;

  uploadedBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  isDeleted: boolean;

  // createdAt is the date the document was uploaded
  createdAt?: Date;
  updatedAt?: Date;
}
