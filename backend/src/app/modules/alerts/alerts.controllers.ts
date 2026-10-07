import { Request, Response } from "express";
import { Types } from "mongoose";
import { Alert } from "./alerts.model";
import {
    AlertStatus,
    AlertSeverity,
    AlertAudience,
    AlertCategory,
} from "./alerts.interface";
import {
    createAlertSchema,
    updateAlertSchema,
    resolveAlertSchema,
} from "./alerts.validation";
import {
    isValidId,
    getPagination,
    buildPagination,
    escapeRegex,
    getMyEmployee,
    isAdminRole,
} from "../../utils/common";

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 30;

/* Alerts an employee is allowed to see */
const employeeAlertFilter = async (req: Request) => {
    const me = await getMyEmployee(req);

    const or: any[] = [
        { audience: { $in: [AlertAudience.ALL, AlertAudience.EMPLOYEE] }, targetEmployee: { $exists: false } },
    ];

    if (me) {
        or.push({ targetEmployee: me._id });
    }

    return { isDeleted: false, $or: or };
};

export const createAlert = async (req: Request, res: Response) => {
    try {
        const result = createAlertSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const alert = await Alert.create({
            ...result.data,
            // an alert aimed at one employee is always employee-facing
            audience: result.data.targetEmployee
                ? AlertAudience.EMPLOYEE
                : result.data.audience ?? AlertAudience.ADMIN,
            status: AlertStatus.ACTIVE,
            createdBy: new Types.ObjectId(req.user!.id),
        });

        return res.status(201).json({
            success: true,
            message: "Alert created successfully",
            data: alert,
        });
    } catch (error) {
        console.error("Create alert error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create alert",
        });
    }
};

export const getAllAlerts = async (req: Request, res: Response) => {
    try {
        const { severity, category, status, expiring, search } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter: any = { isDeleted: false };

        if (severity) filter.severity = severity;
        if (category) filter.category = category;
        if (status) filter.status = status;

        if (expiring === "true") {
            filter.expiryDate = {
                $gte: new Date(),
                $lte: new Date(Date.now() + EXPIRING_SOON_DAYS * DAY_MS),
            };
            filter.status = { $ne: AlertStatus.RESOLVED };
        }

        if (search) {
            const regex = new RegExp(escapeRegex(String(search)), "i");
            filter.$or = [{ title: regex }, { message: regex }];
        }

        const [alerts, total] = await Promise.all([
            Alert.find(filter)
                .populate("targetEmployee", "employeeId fullName department")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Alert.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Alerts fetched successfully",
            data: alerts,
            pagination: buildPagination(total, page, limit),
        });
    } catch (error) {
        console.error("Get alerts error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch alerts",
        });
    }
};

export const getMyAlerts = async (req: Request, res: Response) => {
    try {
        const base = await employeeAlertFilter(req);
        const filter: any = { ...base };

        if (req.query.severity) filter.severity = req.query.severity;
        if (req.query.status) filter.status = req.query.status;

        const alerts = await Alert.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Alerts fetched successfully",
            data: alerts,
        });
    } catch (error) {
        console.error("Get my alerts error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch alerts",
        });
    }
};

/*
 * Counts used by the Alerts tab (critical / warning / info / expiring / resolved).
 */
export const getAlertSummary = async (_req: Request, res: Response) => {
    try {
        const base = { isDeleted: false };
        const open = { ...base, status: { $ne: AlertStatus.RESOLVED } };

        const [total, critical, warning, info, expiringSoon, resolved] =
            await Promise.all([
                Alert.countDocuments(open),
                Alert.countDocuments({ ...open, severity: AlertSeverity.CRITICAL }),
                Alert.countDocuments({ ...open, severity: AlertSeverity.WARNING }),
                Alert.countDocuments({ ...open, severity: AlertSeverity.INFO }),
                Alert.countDocuments({
                    ...open,
                    category: AlertCategory.DOCUMENT_EXPIRY,
                    expiryDate: {
                        $gte: new Date(),
                        $lte: new Date(Date.now() + EXPIRING_SOON_DAYS * DAY_MS),
                    },
                }),
                Alert.countDocuments({ ...base, status: AlertStatus.RESOLVED }),
            ]);

        return res.status(200).json({
            success: true,
            message: "Alert summary fetched successfully",
            data: { total, critical, warning, info, expiringSoon, resolved },
        });
    } catch (error) {
        console.error("Alert summary error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch alert summary",
        });
    }
};

export const getAlertById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid alert ID",
            });
        }

        const filter: any = isAdminRole(req.user?.role)
            ? { _id: id, isDeleted: false }
            : { _id: id, ...(await employeeAlertFilter(req)) };

        const alert = await Alert.findOne(filter)
            .populate("targetEmployee", "employeeId fullName department")
            .populate("acknowledgedBy", "email employeeId role")
            .populate("resolvedBy", "email employeeId role");

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Alert fetched successfully",
            data: alert,
        });
    } catch (error) {
        console.error("Get alert error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch alert",
        });
    }
};

export const updateAlert = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid alert ID",
            });
        }

        const result = updateAlertSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const alert = await Alert.findOne({ _id: id, isDeleted: false });

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found",
            });
        }

        Object.assign(alert, result.data);
        await alert.save();

        return res.status(200).json({
            success: true,
            message: "Alert updated successfully",
            data: alert,
        });
    } catch (error) {
        console.error("Update alert error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update alert",
        });
    }
};

/*
 * "Acknowledge & Continue" - admins can acknowledge any alert,
 * employees only alerts addressed to them.
 */
export const acknowledgeAlert = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid alert ID",
            });
        }

        const filter: any = isAdminRole(req.user?.role)
            ? { _id: id, isDeleted: false }
            : { _id: id, ...(await employeeAlertFilter(req)) };

        const alert = await Alert.findOne(filter);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found",
            });
        }

        if (alert.status !== AlertStatus.ACTIVE) {
            return res.status(400).json({
                success: false,
                message: "Only active alerts can be acknowledged",
            });
        }

        alert.status = AlertStatus.ACKNOWLEDGED;
        alert.acknowledgedBy = new Types.ObjectId(req.user!.id);
        alert.acknowledgedAt = new Date();

        await alert.save();

        return res.status(200).json({
            success: true,
            message: "Alert acknowledged successfully",
            data: alert,
        });
    } catch (error) {
        console.error("Acknowledge alert error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to acknowledge alert",
        });
    }
};

/*
 * "Acknowledge & Resolve" - admin only.
 */
export const resolveAlert = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid alert ID",
            });
        }

        const result = resolveAlertSchema.safeParse(req.body ?? {});

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const alert = await Alert.findOne({ _id: id, isDeleted: false });

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found",
            });
        }

        if (alert.status === AlertStatus.RESOLVED) {
            return res.status(400).json({
                success: false,
                message: "Alert is already resolved",
            });
        }

        const userId = new Types.ObjectId(req.user!.id);

        if (alert.status === AlertStatus.ACTIVE) {
            alert.acknowledgedBy = userId;
            alert.acknowledgedAt = new Date();
        }

        alert.status = AlertStatus.RESOLVED;
        alert.resolvedBy = userId;
        alert.resolvedAt = new Date();
        alert.resolutionNote = result.data.resolutionNote;

        await alert.save();

        return res.status(200).json({
            success: true,
            message: "Alert resolved successfully",
            data: alert,
        });
    } catch (error) {
        console.error("Resolve alert error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to resolve alert",
        });
    }
};

export const deleteAlert = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid alert ID",
            });
        }

        const alert = await Alert.findOne({ _id: id, isDeleted: false });

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found",
            });
        }

        alert.isDeleted = true;
        await alert.save();

        return res.status(200).json({
            success: true,
            message: "Alert deleted successfully",
        });
    } catch (error) {
        console.error("Delete alert error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete alert",
        });
    }
};
