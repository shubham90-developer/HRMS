import { Document } from "mongoose";

export type EmploymentStatus =
    | "Active"
    | "Inactive"
    | "On Leave"
    | "Terminated";

export type Gender =
    | "Male"
    | "Female"
    | "Other";

export interface IEmployeeIdentification {
    aadhaar: string;
    panCard: string;
}

export interface IEmergencyContact {
    emergencyContactNumber: string;
    phoneNumber: string;
}

export interface IEmployee extends Document {
    fullName: string;
    role: string;
    employeeId: string;
    employmentStatus: EmploymentStatus;
    shift: string;
    department: string;
    gender: Gender;
    dob: Date;
    phoneNumber: string;
    address: string;
    email: string;

    identification: IEmployeeIdentification;

    salaryYearly: number;
    salaryMonthly: number;
    joiningDate: Date;

    emergencyContact: IEmergencyContact;

    createdAt: Date;
    updatedAt: Date;
}