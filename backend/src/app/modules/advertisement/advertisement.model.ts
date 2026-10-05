import { Schema, model } from "mongoose";
import {
  AdvertisementAudience,
  AdvertisementDisplayStatus,
  AdvertisementPriority,
  AdvertisementStatus,
  AdvertisementType,
  IAdvertisement,
} from "./advertisement.interface";

const fileSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    originalName: { type: String },
  },
  { _id: false }
);

const advertisementSchema = new Schema<IAdvertisement>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    type: {
      type: String,
      enum: Object.values(AdvertisementType),
      default: AdvertisementType.GENERAL,
      index: true,
    },

    priority: {
      type: String,
      enum: Object.values(AdvertisementPriority),
      default: AdvertisementPriority.MEDIUM,
    },

    image: { type: fileSchema },

    attachment: { type: fileSchema },

    audience: {
      type: String,
      enum: Object.values(AdvertisementAudience),
      default: AdvertisementAudience.ALL,
    },

    departments: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: Object.values(AdvertisementStatus),
      default: AdvertisementStatus.PUBLISHED,
      index: true,
    },

    publishAt: {
      type: Date,
    },

    expiresAt: {
      type: Date,
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Kept out of responses; used to count each employee only once
    viewedBy: {
      type: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
      default: [],
      select: false,
    },

    createdBy: {
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
 * Draft | Scheduled | Published | Expired
 * Calculated on every read so it never goes out of date.
 */
advertisementSchema
  .virtual("displayStatus")
  .get(function (this: IAdvertisement) {
    if (this.status === AdvertisementStatus.DRAFT) {
      return AdvertisementDisplayStatus.DRAFT;
    }

    const now = new Date();

    if (this.publishAt && this.publishAt > now) {
      return AdvertisementDisplayStatus.SCHEDULED;
    }

    if (this.expiresAt && this.expiresAt <= now) {
      return AdvertisementDisplayStatus.EXPIRED;
    }

    return AdvertisementDisplayStatus.PUBLISHED;
  });

advertisementSchema.index({
  isDeleted: 1,
  status: 1,
  publishAt: -1,
});

export const Advertisement = model<IAdvertisement>(
  "Advertisement",
  advertisementSchema
);
