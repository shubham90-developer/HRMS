import mongoose, { Schema } from "mongoose";
import { IOnboarding } from "./onBoarding.interface";

const onboardingSchema = new Schema<IOnboarding>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        image: {
            type: String,
            required: true,
            trim: true,
        },

        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active",
        },
    },
    {
        timestamps: true,
    }
);

export const Onboarding = mongoose.model<IOnboarding>(
    "Onboarding",
    onboardingSchema
);