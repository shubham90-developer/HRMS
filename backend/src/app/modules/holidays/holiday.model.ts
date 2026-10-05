import { Schema, model } from "mongoose";
import { HolidayType, IHoliday } from "./holiday.interface";

const holidaySchema = new Schema<IHoliday>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(HolidayType),
      default: HolidayType.NATIONAL,
      required: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 250,
    },

    isAllLocations: {
      type: Boolean,
      default: true,
    },

    locations: {
      type: [String],
      default: [],
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
  }
);

holidaySchema.index({ isDeleted: 1, date: 1 });

export const Holiday = model<IHoliday>("Holiday", holidaySchema);
