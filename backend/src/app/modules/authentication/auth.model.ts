import mongoose, { Schema, Document } from "mongoose";

export enum UserRole {
    SUPER_ADMIN = "super-admin",
    ADMIN = "admin",
    EMPLOYEE = "employee",
}

export interface IAuthentication extends Document {
    email?: string;
    employeeId?: string;
    password: string;
    role: UserRole;
    isActive: boolean;
}

const authenticationSchema = new Schema<IAuthentication>(
    {
        email: {
            type: String,
            lowercase: true,
            trim: true,
            unique: true,
            sparse: true,
        },

        employeeId: {
            type: String,
            uppercase: true,
            trim: true,
            unique: true,
            sparse: true,
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            enum: Object.values(UserRole),
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Authentication = mongoose.model<IAuthentication>(
    "Auth",
    authenticationSchema
);