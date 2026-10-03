import mongoose, { Schema, Document } from "mongoose";
import { IOrganizationDocument } from "./organization.interface";

const organizationSchema = new Schema<IOrganizationDocument>(
    {
        organizationName: {
            type: String,
            required: true,
            trim: true,
        },

        organizationCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        registrationNumber: {
            type: String,
            trim: true,
        },

        industry: {
            type: String,
            required: true,
            trim: true,
        },

        organizationType: {
            type: String,
            required: true,
            trim: true,
        },

        organizationLogo: {
            type: String,
        },

        address: {
            addressLine1: {
                type: String,
                required: true,
                trim: true,
            },

            addressLine2: {
                type: String,
                trim: true,
            },

            country: {
                type: String,
                required: true,
                trim: true,
            },

            state: {
                type: String,
                required: true,
                trim: true,
            },

            city: {
                type: String,
                required: true,
                trim: true,
            },

            pinCode: {
                type: String,
                required: true,
                trim: true,
            },
        },

        contact: {
            email: {
                type: String,
                required: true,
                lowercase: true,
                trim: true,
            },

            phoneNumber: {
                type: String,
                required: true,
                trim: true,
            },

            alternativePhoneNumber: {
                type: String,
                trim: true,
            },

            website: {
                type: String,
                trim: true,
            },

            gstNumber: {
                type: String,
                uppercase: true,
                trim: true,
            },

            panNumber: {
                type: String,
                uppercase: true,
                trim: true,
            },
        },

        configuration: {
            financialYearStartMonth: {
                type: String,
                required: true,
            },

            payrollCycle: {
                type: String,
                required: true,
            },

            workingDays: {
                type: [String],
                required: true,
            },

            weeklyOff: {
                type: [String],
                required: true,
            },

            defaultShift: {
                type: String,
                required: true,
            },

            leavePolicy: {
                type: String,
                required: true,
            },

            attendancePolicy: {
                type: String,
                required: true,
            },
        },

        isActive: {
            type: Boolean,
            default: true,
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

export default mongoose.model<IOrganizationDocument>(
    "Organization",
    organizationSchema
);