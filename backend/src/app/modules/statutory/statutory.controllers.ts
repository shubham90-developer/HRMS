import { Request, Response } from "express";
import { Types } from "mongoose";
import { Statutory } from "./statutory.model";
import {
    StatutoryCategory,
    FilingStatus,
    StatutoryType,
} from "./statutory.interface";
import {
    createStatutorySchema,
    updateStatutorySchema,
    updateFilingSchema,
} from "./statutory.validation";
import {
    isValidId,
    getPagination,
    buildPagination,
    escapeRegex,
    isAdminRole,
} from "../../utils/common";

/* Records an employee is allowed to see */
const employeeVisibleFilter = {
    isDeleted: false,
    isActive: true,
    visibleToEmployees: true,
};

export const createStatutory = async (req: Request, res: Response) => {
    try {
        const result = createStatutorySchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const data = result.data;
        const category = data.category ?? StatutoryCategory.SETTING;

        const statutory = await Statutory.create({
            ...data,
            category,
            filingStatus:
                category === StatutoryCategory.FILING
                    ? data.filingStatus ?? FilingStatus.PENDING
                    : undefined,
            attachment: req.file?.path ?? data.attachment,
            createdBy: new Types.ObjectId(req.user!.id),
        });

        return res.status(201).json({
            success: true,
            message: "Statutory record created successfully",
            data: statutory,
        });
    } catch (error) {
        console.error("Create statutory error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create statutory record",
        });
    }
};

export const getAllStatutory = async (req: Request, res: Response) => {
    try {
        const { type, category, filingStatus, isActive, search } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter: any = { isDeleted: false };

        if (type) filter.type = type;
        if (category) filter.category = category;
        if (isActive !== undefined) filter.isActive = isActive === "true";

        if (filingStatus === FilingStatus.OVERDUE) {
            filter.filingStatus = FilingStatus.PENDING;
            filter.dueDate = { $lt: new Date() };
        } else if (filingStatus) {
            filter.filingStatus = filingStatus;
        }

        if (search) {
            const regex = new RegExp(escapeRegex(String(search)), "i");
            filter.$or = [
                { title: regex },
                { registrationNumber: regex },
                { periodLabel: regex },
            ];
        }

        const [records, total] = await Promise.all([
            Statutory.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Statutory.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Statutory records fetched successfully",
            data: records,
            pagination: buildPagination(total, page, limit),
        });
    } catch (error) {
        console.error("Get statutory error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch statutory records",
        });
    }
};

/*
 * Employee view: only active records marked visible to employees.
 */
export const getMyStatutory = async (req: Request, res: Response) => {
    try {
        const { type, category } = req.query;

        const filter: any = { ...employeeVisibleFilter };

        if (type) filter.type = type;
        if (category) filter.category = category;

        const records = await Statutory.find(filter).sort({
            type: 1,
            createdAt: -1,
        });

        return res.status(200).json({
            success: true,
            message: "Statutory records fetched successfully",
            data: records,
        });
    } catch (error) {
        console.error("Get my statutory error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch statutory records",
        });
    }
};

export const getStatutoryById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid statutory ID",
            });
        }

        const filter: any = isAdminRole(req.user?.role)
            ? { _id: id, isDeleted: false }
            : { _id: id, ...employeeVisibleFilter };

        const record = await Statutory.findOne(filter);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Statutory record not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Statutory record fetched successfully",
            data: record,
        });
    } catch (error) {
        console.error("Get statutory by id error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch statutory record",
        });
    }
};

export const updateStatutory = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid statutory ID",
            });
        }

        const result = updateStatutorySchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const record = await Statutory.findOne({ _id: id, isDeleted: false });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Statutory record not found",
            });
        }

        Object.assign(record, result.data, {
            ...(req.file ? { attachment: req.file.path } : {}),
            updatedBy: new Types.ObjectId(req.user!.id),
        });

        await record.save();

        return res.status(200).json({
            success: true,
            message: "Statutory record updated successfully",
            data: record,
        });
    } catch (error) {
        console.error("Update statutory error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update statutory record",
        });
    }
};

/*
 * Mark a compliance calendar entry as Filed / Pending / Overdue.
 */
export const updateFilingStatus = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid statutory ID",
            });
        }

        const result = updateFilingSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const record = await Statutory.findOne({ _id: id, isDeleted: false });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Statutory record not found",
            });
        }

        if (record.category !== StatutoryCategory.FILING) {
            return res.status(400).json({
                success: false,
                message: "Only filing records have a filing status",
            });
        }

        const { filingStatus, filedOn, challanNumber, remarks } = result.data;

        record.filingStatus = filingStatus;
        record.filedOn =
            filingStatus === FilingStatus.FILED
                ? filedOn ?? new Date()
                : undefined;

        if (challanNumber !== undefined) record.challanNumber = challanNumber;
        if (remarks !== undefined) record.remarks = remarks;

        record.updatedBy = new Types.ObjectId(req.user!.id);

        await record.save();

        return res.status(200).json({
            success: true,
            message: "Filing status updated successfully",
            data: record,
        });
    } catch (error) {
        console.error("Update filing status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update filing status",
        });
    }
};

export const deleteStatutory = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid statutory ID",
            });
        }

        const record = await Statutory.findOne({ _id: id, isDeleted: false });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Statutory record not found",
            });
        }

        record.isDeleted = true;
        record.isActive = false;
        record.updatedBy = new Types.ObjectId(req.user!.id);

        await record.save();

        return res.status(200).json({
            success: true,
            message: "Statutory record deleted successfully",
        });
    } catch (error) {
        console.error("Delete statutory error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete statutory record",
        });
    }
};

/*
 * Compliance calendar: filings due in a month (defaults to current month).
 */
export const getComplianceCalendar = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const month = Number(req.query.month ?? now.getMonth() + 1);
        const year = Number(req.query.year ?? now.getFullYear());

        if (!(month >= 1 && month <= 12) || !(year >= 2000 && year <= 2100)) {
            return res.status(400).json({
                success: false,
                message: "Invalid month or year",
            });
        }

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);

        const filter: any = {
            category: StatutoryCategory.FILING,
            dueDate: { $gte: start, $lt: end },
            ...(isAdminRole(req.user?.role)
                ? { isDeleted: false }
                : employeeVisibleFilter),
        };

        if (req.query.type) filter.type = req.query.type;

        const filings = await Statutory.find(filter).sort({ dueDate: 1 });

        return res.status(200).json({
            success: true,
            message: "Compliance calendar fetched successfully",
            data: { month, year, filings },
        });
    } catch (error) {
        console.error("Compliance calendar error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch compliance calendar",
        });
    }
};

/*
 * Statutory reports tab: PF / ESI / PT / LWF summary + filing counts.
 */
export const getStatutorySummary = async (_req: Request, res: Response) => {
    try {
        const base = { isDeleted: false };
        const now = new Date();
        const filing = { ...base, category: StatutoryCategory.FILING };

        const [byType, pending, filed, overdue, dueThisMonth] =
            await Promise.all([
                Promise.all(
                    Object.values(StatutoryType).map(async (type) => ({
                        type,
                        settings: await Statutory.countDocuments({
                            ...base,
                            type,
                            category: StatutoryCategory.SETTING,
                        }),
                        filings: await Statutory.countDocuments({
                            ...filing,
                            type,
                        }),
                        filed: await Statutory.countDocuments({
                            ...filing,
                            type,
                            filingStatus: FilingStatus.FILED,
                        }),
                    }))
                ),
                Statutory.countDocuments({
                    ...filing,
                    filingStatus: FilingStatus.PENDING,
                    dueDate: { $gte: now },
                }),
                Statutory.countDocuments({
                    ...filing,
                    filingStatus: FilingStatus.FILED,
                }),
                Statutory.countDocuments({
                    ...filing,
                    filingStatus: FilingStatus.PENDING,
                    dueDate: { $lt: now },
                }),
                Statutory.countDocuments({
                    ...filing,
                    filingStatus: FilingStatus.PENDING,
                    dueDate: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                        $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
                    },
                }),
            ]);

        return res.status(200).json({
            success: true,
            message: "Statutory summary fetched successfully",
            data: { byType, pending, filed, overdue, dueThisMonth },
        });
    } catch (error) {
        console.error("Statutory summary error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch statutory summary",
        });
    }
};
