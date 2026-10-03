import mongoose, { Schema, Document } from "mongoose";

export interface IOrganizationDocument extends Document {
    organizationName: string;
    organizationCode: string;
    registrationNumber?: string;

    industry: string;
    organizationType: string;
    organizationLogo?: string;

    address: {
        addressLine1: string;
        addressLine2?: string;
        country: string;
        state: string;
        city: string;
        pinCode: string;
    };

    contact: {
        email: string;
        phoneNumber: string;
        alternativePhoneNumber?: string;
        website?: string;
        gstNumber?: string;
        panNumber?: string;
    };

    configuration: {
        financialYearStartMonth: string;
        payrollCycle: string;
        workingDays: string[];
        weeklyOff: string[];
        defaultShift: string;
        leavePolicy: string;
        attendancePolicy: string;
    };

    isActive: boolean;
    isDeleted: boolean;
}