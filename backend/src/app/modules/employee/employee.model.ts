import mongoose, { Schema } from "mongoose";
import {
    IEmployee,
    IEmployeeIdentification,
    IEmergencyContact,
} from "./employee.interface";

const employeeIdentificationSchema =
    new Schema<IEmployeeIdentification>(
        {
            aadhaar: {
                type: String,
                required: [true, "Aadhaar card document is required"],
                trim: true,
            },

            panCard: {
                type: String,
                required: [true, "PAN Card document is required"],
                trim: true,
            },
        },
        { _id: false }
    );

const emergencyContactSchema =
    new Schema<IEmergencyContact>(
        {
            emergencyContactNumber: {
                type: String,
                required: [true, "Emergency contact number is required"],
                trim: true,
            },

            phoneNumber: {
                type: String,
                required: [
                    true,
                    "Emergency contact phone number is required",
                ],
                trim: true,
            },
        },
        { _id: false }
    );

const employeeSchema = new Schema<IEmployee>(
    {
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
        },

        role: {
            type: String,
            required: [true, "Role is required"],
            trim: true,
        },

        employeeId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        employmentStatus: {
            type: String,
            enum: [
                "Active",
                "Inactive",
                "On Leave",
                "Terminated",
            ],
            default: "Active",
        },

        shift: {
            type: String,
            required: [true, "Shift is required"],
            trim: true,
        },

        department: {
            type: String,
            required: [true, "Department is required"],
            trim: true,
        },

        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            required: [true, "Gender is required"],
        },

        dob: {
            type: Date,
            required: [true, "Date of birth is required"],
        },

        phoneNumber: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true,
        },

        address: {
            type: String,
            required: [true, "Address is required"],
            trim: true,
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },

        identification: {
            type: employeeIdentificationSchema,
            required: [
                true,
                "Employee identification documents are required",
            ],
        },

        salaryYearly: {
            type: Number,
            required: [true, "Yearly salary is required"],
            min: [0, "Yearly salary cannot be negative"],
        },

        salaryMonthly: {
            type: Number,
            required: [true, "Monthly salary is required"],
            min: [0, "Monthly salary cannot be negative"],
        },

        joiningDate: {
            type: Date,
            required: [true, "Joining date is required"],
        },

        emergencyContact: {
            type: emergencyContactSchema,
            required: [true, "Emergency contact is required"],
        },
    },
    {
        timestamps: true,
    }
);

export const Employee = mongoose.model<IEmployee>(
    "Employee",
    employeeSchema
);