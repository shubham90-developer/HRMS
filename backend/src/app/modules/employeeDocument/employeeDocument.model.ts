import { Schema, model } from "mongoose";
import {
  DocumentCategory,
  DocumentExpiryStatus,
  DocumentStatus,
  EXPIRY_ALERT_DAYS,
  IEmployeeDocument,
} from "./employeeDocument.interface";

const fileSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
  },
  { _id: false }
);

const employeeDocumentSchema = new Schema<IEmployeeDocument>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: Object.values(DocumentCategory),
      required: true,
      index: true,
    },

    documentType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    file: {
      type: fileSchema,
      required: true,
    },

    issuedDate: {
      type: Date,
    },

    expiryDate: {
      type: Date,
      index: true,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 250,
    },

    status: {
      type: String,
      enum: Object.values(DocumentStatus),
      default: DocumentStatus.PENDING,
      index: true,
    },

    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },

    verifiedAt: {
      type: Date,
    },

    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },

    rejectedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 250,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/*
 * No Expiry | Valid | Expiring Soon | Expired
 * Calculated on every read so it never goes out of date.
 */
employeeDocumentSchema
  .virtual("expiryStatus")
  .get(function (this: IEmployeeDocument) {
    if (!this.expiryDate) {
      return DocumentExpiryStatus.NO_EXPIRY;
    }

    const now = new Date();

    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    if (this.expiryDate < today) {
      return DocumentExpiryStatus.EXPIRED;
    }

    const alertLimit = new Date(
      today.getTime() + EXPIRY_ALERT_DAYS * 24 * 60 * 60 * 1000
    );

    if (this.expiryDate <= alertLimit) {
      return DocumentExpiryStatus.EXPIRING_SOON;
    }

    return DocumentExpiryStatus.VALID;
  });

employeeDocumentSchema.index({
  isDeleted: 1,
  employee: 1,
  category: 1,
});

employeeDocumentSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

export const EmployeeDocument = model<IEmployeeDocument>(
  "EmployeeDocument",
  employeeDocumentSchema
);
