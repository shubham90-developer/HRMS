import { Document, Types } from "mongoose";

export type OnboardingStatus = "Active" | "Inactive";

export interface IOnboarding extends Document {
    _id: Types.ObjectId;
    title: string;
    description: string;
    image: string;
    status: OnboardingStatus;
    createdAt: Date;
    updatedAt: Date;
}