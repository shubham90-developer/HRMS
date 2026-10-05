import { Types } from "mongoose";

export enum HolidayType {
  NATIONAL = "National",
  OPTIONAL = "Optional",
  RESTRICTED = "Restricted",
  COMPANY = "Company",
  OTHER = "Other",
}

export interface IHoliday {
  name: string;

  // Stored as UTC midnight of the holiday date (YYYY-MM-DD)
  date: Date;

  type: HolidayType;

  description?: string;

  // true  -> applies to every office location
  // false -> applies only to the names listed in `locations`
  isAllLocations: boolean;
  locations: string[];

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  isDeleted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}
