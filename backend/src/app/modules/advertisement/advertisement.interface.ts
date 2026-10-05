import { Types } from "mongoose";

export enum AdvertisementType {
  GENERAL = "General",
  UPDATE = "Update",
  EVENT = "Event",
  POLICY = "Policy",
  ALERT = "Alert",
}

export enum AdvertisementPriority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
}

export enum AdvertisementAudience {
  ALL = "All",
  DEPARTMENTS = "Departments",
}

// What an admin controls
export enum AdvertisementStatus {
  DRAFT = "Draft",
  PUBLISHED = "Published",
}

// What everyone sees (calculated from status, publishAt and expiresAt)
export enum AdvertisementDisplayStatus {
  DRAFT = "Draft",
  SCHEDULED = "Scheduled",
  PUBLISHED = "Published",
  EXPIRED = "Expired",
}

export interface IAdvertisementFile {
  url: string;
  publicId?: string;
  originalName?: string;
}

export interface IAdvertisement {
  title: string;
  description: string;

  type: AdvertisementType;
  priority: AdvertisementPriority;

  // Banner shown with the advertisement
  image?: IAdvertisementFile;

  // Optional document (pdf) attached to the advertisement
  attachment?: IAdvertisementFile;

  audience: AdvertisementAudience;
  // Department names, only used when audience is "Departments"
  departments: string[];

  status: AdvertisementStatus;

  // When the advertisement goes live. A future date means "Scheduled".
  publishAt?: Date;

  // When it stops being shown. Empty means it never expires.
  expiresAt?: Date | null;

  // Number of different employees who opened it
  views: number;
  viewedBy: Types.ObjectId[];

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  isDeleted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}
