import { Types } from "mongoose";

export enum StatutoryType {
    PF = "PF",
    ESI = "ESI",
    PT = "PT",
    LWF = "LWF",
}

/*
 * Setting = statutory configuration (PF / ESI / PT / LWF settings)
 * Filing  = compliance calendar entry (PF Return Filing, ESI Return Filing, PT Payment ...)
 */
export enum StatutoryCategory {
    SETTING = "Setting",
    FILING = "Filing",
}

export enum FilingStatus {
    PENDING = "Pending",
    FILED = "Filed",
    OVERDUE = "Overdue",
}

export interface ITaxSlab {
    minSalary: number;
    maxSalary?: number;
    amount: number;
}

export interface IStatutory {
    type: StatutoryType;
    category: StatutoryCategory;
    title: string;
    description?: string;

    // Settings
    isApplicable: boolean;
    registrationNumber?: string;
    wageCeiling?: number;
    employeeContribution?: number; // percentage
    employerContribution?: number; // percentage
    taxSlabs?: ITaxSlab[]; // Professional Tax slabs
    state?: string;

    // Filings / compliance calendar
    periodLabel?: string; // e.g. "Sep 2026"
    dueDate?: Date;
    filingStatus?: FilingStatus;
    filedOn?: Date;
    challanNumber?: string;
    remarks?: string;

    attachment?: string;
    visibleToEmployees: boolean;
    isActive: boolean;
    isDeleted: boolean;

    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;

    createdAt?: Date;
    updatedAt?: Date;
}
