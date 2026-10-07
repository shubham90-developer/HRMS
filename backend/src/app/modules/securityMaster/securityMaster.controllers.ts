import { Request, Response } from "express";
import { Types } from "mongoose";
import {
    MasterData,
    SecurityPolicy,
    LoginSession,
    AuditLog,
    RolePermission,
} from "./securityMaster.model";
import { MasterType } from "./securityMaster.interface";
import {
    createMasterSchema,
    updateMasterSchema,
    updateSecurityPolicySchema,
    registerSessionSchema,
    createRoleSchema,
    updateRoleSchema,
} from "./securityMaster.validation";
import { logAudit } from "./auditLogger";
import {
    isValidId,
    getPagination,
    buildPagination,
    escapeRegex,
    isAdminRole,
} from "../../utils/common";

const fail = (res: Response, code: number, message: string) =>
    res.status(code).json({ success: false, message });

const serverError = (res: Response, label: string, error: unknown, message: string) => {
    console.error(`${label}:`, error);
    return fail(res, 500, message);
};

const validationError = (res: Response, error: { flatten: () => unknown }) =>
    res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.flatten(),
    });

const parseType = (value: unknown): MasterType | null =>
    Object.values(MasterType).includes(value as MasterType)
        ? (value as MasterType)
        : null;

/* ============================== MASTER DATA ============================== */

export const createMaster = async (req: Request, res: Response) => {
    try {
        const type = parseType(req.params.type);

        if (!type) return fail(res, 400, "Invalid master type");

        const result = createMasterSchema(type).safeParse(req.body);

        if (!result.success) return validationError(res, result.error);

        const data = result.data;

        // duplicate check: holidays by name + date, everything else by code
        const duplicate =
            type === MasterType.HOLIDAY
                ? await MasterData.findOne({
                      type,
                      isDeleted: false,
                      date: data.date,
                      name: data.name,
                  })
                : await MasterData.findOne({
                      type,
                      isDeleted: false,
                      code: data.code?.toUpperCase(),
                  });

        if (duplicate) {
            return fail(
                res,
                409,
                type === MasterType.HOLIDAY
                    ? "Holiday already exists on this date"
                    : `${type} code already exists`
            );
        }

        const record = await MasterData.create({
            ...data,
            type,
            createdBy: new Types.ObjectId(req.user!.id),
        });

        await logAudit(req, "CREATE", `master:${type}`, `Created ${type} "${record.name}"`, String(record._id));

        return res.status(201).json({
            success: true,
            message: `${type} created successfully`,
            data: record,
        });
    } catch (error) {
        return serverError(res, "Create master error", error, "Failed to create master record");
    }
};

export const getAllMaster = async (req: Request, res: Response) => {
    try {
        const type = parseType(req.params.type);

        if (!type) return fail(res, 400, "Invalid master type");

        const { isActive, search, year } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter: any = { type, isDeleted: false };

        // employees only see active master data
        if (!isAdminRole(req.user?.role)) {
            filter.isActive = true;
        } else if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }

        if (search) {
            const regex = new RegExp(escapeRegex(String(search)), "i");
            filter.$or = [{ name: regex }, { code: regex }];
        }

        if (type === MasterType.HOLIDAY && year) {
            const y = Number(year);
            filter.date = { $gte: new Date(y, 0, 1), $lt: new Date(y + 1, 0, 1) };
        }

        const sort: any = type === MasterType.HOLIDAY ? { date: 1 } : { name: 1 };

        const [records, total] = await Promise.all([
            MasterData.find(filter)
                .populate("departmentHead", "employeeId fullName")
                .sort(sort)
                .skip(skip)
                .limit(limit),
            MasterData.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: `${type} list fetched successfully`,
            data: records,
            pagination: buildPagination(total, page, limit),
        });
    } catch (error) {
        return serverError(res, "Get master error", error, "Failed to fetch master records");
    }
};

export const getMasterById = async (req: Request, res: Response) => {
    try {
        const type = parseType(req.params.type);
        const id = req.params.id as string;

        if (!type) return fail(res, 400, "Invalid master type");
        if (!isValidId(id)) return fail(res, 400, "Invalid ID");

        const filter: any = { _id: id, type, isDeleted: false };

        if (!isAdminRole(req.user?.role)) filter.isActive = true;

        const record = await MasterData.findOne(filter).populate(
            "departmentHead",
            "employeeId fullName"
        );

        if (!record) return fail(res, 404, "Record not found");

        return res.status(200).json({
            success: true,
            message: `${type} fetched successfully`,
            data: record,
        });
    } catch (error) {
        return serverError(res, "Get master by id error", error, "Failed to fetch master record");
    }
};

export const updateMaster = async (req: Request, res: Response) => {
    try {
        const type = parseType(req.params.type);
        const id = req.params.id as string;

        if (!type) return fail(res, 400, "Invalid master type");
        if (!isValidId(id)) return fail(res, 400, "Invalid ID");

        const result = updateMasterSchema.safeParse(req.body);

        if (!result.success) return validationError(res, result.error);

        const record = await MasterData.findOne({ _id: id, type, isDeleted: false });

        if (!record) return fail(res, 404, "Record not found");

        if (result.data.code && result.data.code.toUpperCase() !== record.code) {
            const duplicate = await MasterData.findOne({
                type,
                isDeleted: false,
                code: result.data.code.toUpperCase(),
                _id: { $ne: record._id },
            });

            if (duplicate) return fail(res, 409, `${type} code already exists`);
        }

        Object.assign(record, result.data);
        await record.save();

        await logAudit(req, "UPDATE", `master:${type}`, `Updated ${type} "${record.name}"`, id);

        return res.status(200).json({
            success: true,
            message: `${type} updated successfully`,
            data: record,
        });
    } catch (error) {
        return serverError(res, "Update master error", error, "Failed to update master record");
    }
};

export const deleteMaster = async (req: Request, res: Response) => {
    try {
        const type = parseType(req.params.type);
        const id = req.params.id as string;

        if (!type) return fail(res, 400, "Invalid master type");
        if (!isValidId(id)) return fail(res, 400, "Invalid ID");

        const record = await MasterData.findOne({ _id: id, type, isDeleted: false });

        if (!record) return fail(res, 404, "Record not found");

        record.isDeleted = true;
        record.isActive = false;
        await record.save();

        await logAudit(req, "DELETE", `master:${type}`, `Deleted ${type} "${record.name}"`, id);

        return res.status(200).json({
            success: true,
            message: `${type} deleted successfully`,
        });
    } catch (error) {
        return serverError(res, "Delete master error", error, "Failed to delete master record");
    }
};

/* ============================== SECURITY POLICY ============================== */

const loadPolicy = () =>
    SecurityPolicy.findOneAndUpdate(
        { key: "default" },
        { $setOnInsert: { key: "default" } },
        { upsert: true, new: true }
    );

export const getSecurityPolicy = async (_req: Request, res: Response) => {
    try {
        const policy = await loadPolicy();

        return res.status(200).json({
            success: true,
            message: "Security policy fetched successfully",
            data: policy,
        });
    } catch (error) {
        return serverError(res, "Get policy error", error, "Failed to fetch security policy");
    }
};

export const updateSecurityPolicy = async (req: Request, res: Response) => {
    try {
        const result = updateSecurityPolicySchema.safeParse(req.body);

        if (!result.success) return validationError(res, result.error);

        const policy = await SecurityPolicy.findOneAndUpdate(
            { key: "default" },
            {
                $set: { ...result.data, updatedBy: new Types.ObjectId(req.user!.id) },
                $setOnInsert: { key: "default" },
            },
            { upsert: true, new: true }
        );

        await logAudit(req, "UPDATE", "security:policy", "Updated security policy");

        return res.status(200).json({
            success: true,
            message: "Security policy updated successfully",
            data: policy,
        });
    } catch (error) {
        return serverError(res, "Update policy error", error, "Failed to update security policy");
    }
};

/* ============================== LOGIN SESSIONS ============================== */

/*
 * Call this from the app right after login so the device shows up
 * under "Login Sessions".
 */
export const registerSession = async (req: Request, res: Response) => {
    try {
        const result = registerSessionSchema.safeParse(req.body);

        if (!result.success) return validationError(res, result.error);

        const session = await LoginSession.create({
            ...result.data,
            account: new Types.ObjectId(req.user!.id),
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
            lastActiveAt: new Date(),
        });

        return res.status(201).json({
            success: true,
            message: "Session registered successfully",
            data: session,
        });
    } catch (error) {
        return serverError(res, "Register session error", error, "Failed to register session");
    }
};

export const getMySessions = async (req: Request, res: Response) => {
    try {
        const sessions = await LoginSession.find({
            account: req.user!.id,
            isActive: true,
        }).sort({ lastActiveAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Sessions fetched successfully",
            data: sessions,
        });
    } catch (error) {
        return serverError(res, "My sessions error", error, "Failed to fetch sessions");
    }
};

export const getAllSessions = async (req: Request, res: Response) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter: any = {};

        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === "true";
        }

        if (req.query.account && isValidId(req.query.account)) {
            filter.account = req.query.account;
        }

        const [sessions, total] = await Promise.all([
            LoginSession.find(filter)
                .populate("account", "email employeeId role")
                .sort({ lastActiveAt: -1 })
                .skip(skip)
                .limit(limit),
            LoginSession.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Sessions fetched successfully",
            data: sessions,
            pagination: buildPagination(total, page, limit),
        });
    } catch (error) {
        return serverError(res, "All sessions error", error, "Failed to fetch sessions");
    }
};

export const revokeSession = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid session ID");

        const session = await LoginSession.findOne({ _id: id, isActive: true });

        if (!session) return fail(res, 404, "Session not found");

        if (!isAdminRole(req.user?.role) && String(session.account) !== req.user!.id) {
            return fail(res, 403, "Access denied");
        }

        session.isActive = false;
        session.revokedAt = new Date();
        session.revokedBy = new Types.ObjectId(req.user!.id);
        await session.save();

        await logAudit(req, "REVOKE", "security:session", `Revoked session of ${session.deviceName}`, id);

        return res.status(200).json({
            success: true,
            message: "Session revoked successfully",
        });
    } catch (error) {
        return serverError(res, "Revoke session error", error, "Failed to revoke session");
    }
};

/* ============================== AUDIT LOG ============================== */

const buildAuditFilter = (req: Request) => {
    const { module, action, actor, from, to } = req.query;
    const filter: any = {};

    if (module) filter.module = new RegExp(`^${escapeRegex(String(module))}`, "i");
    if (action) filter.action = String(action).toUpperCase();
    if (actor && isValidId(actor)) filter.actor = actor;

    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(String(from));
        if (to) filter.createdAt.$lte = new Date(String(to));
    }

    return filter;
};

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = buildAuditFilter(req);

        const [logs, total] = await Promise.all([
            AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Audit logs fetched successfully",
            data: logs,
            pagination: buildPagination(total, page, limit),
        });
    } catch (error) {
        return serverError(res, "Audit logs error", error, "Failed to fetch audit logs");
    }
};

export const exportAuditLogs = async (req: Request, res: Response) => {
    try {
        const logs = await AuditLog.find(buildAuditFilter(req))
            .sort({ createdAt: -1 })
            .limit(5000);

        const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

        const header = ["Time", "Actor", "Role", "Action", "Module", "Target", "Description", "IP"];

        const rows = logs.map((l) =>
            [
                l.createdAt?.toISOString(),
                l.actorName,
                l.actorRole,
                l.action,
                l.module,
                l.targetId,
                l.description,
                l.ipAddress,
            ]
                .map(cell)
                .join(",")
        );

        await logAudit(req, "EXPORT", "security:audit-log", `Exported ${logs.length} audit entries`);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="audit-log.csv"');

        return res.status(200).send([header.map(cell).join(","), ...rows].join("\n"));
    } catch (error) {
        return serverError(res, "Export audit logs error", error, "Failed to export audit logs");
    }
};

/* ============================== ROLES & PERMISSIONS ============================== */

export const createRole = async (req: Request, res: Response) => {
    try {
        const result = createRoleSchema.safeParse(req.body);

        if (!result.success) return validationError(res, result.error);

        const exists = await RolePermission.findOne({
            isDeleted: false,
            name: new RegExp(`^${escapeRegex(result.data.name)}$`, "i"),
        });

        if (exists) return fail(res, 409, "Role already exists");

        const role = await RolePermission.create({
            ...result.data,
            permissions: [...new Set(result.data.permissions)],
            createdBy: new Types.ObjectId(req.user!.id),
        });

        await logAudit(req, "CREATE", "security:role", `Created role "${role.name}"`, String(role._id));

        return res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: role,
        });
    } catch (error) {
        return serverError(res, "Create role error", error, "Failed to create role");
    }
};

export const getAllRoles = async (req: Request, res: Response) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter: any = { isDeleted: false };

        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === "true";
        }

        if (req.query.search) {
            filter.name = new RegExp(escapeRegex(String(req.query.search)), "i");
        }

        const [roles, total] = await Promise.all([
            RolePermission.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
            RolePermission.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Roles fetched successfully",
            data: roles,
            pagination: buildPagination(total, page, limit),
        });
    } catch (error) {
        return serverError(res, "Get roles error", error, "Failed to fetch roles");
    }
};

export const getRoleById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid role ID");

        const role = await RolePermission.findOne({ _id: id, isDeleted: false });

        if (!role) return fail(res, 404, "Role not found");

        return res.status(200).json({
            success: true,
            message: "Role fetched successfully",
            data: role,
        });
    } catch (error) {
        return serverError(res, "Get role error", error, "Failed to fetch role");
    }
};

export const updateRole = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid role ID");

        const result = updateRoleSchema.safeParse(req.body);

        if (!result.success) return validationError(res, result.error);

        const role = await RolePermission.findOne({ _id: id, isDeleted: false });

        if (!role) return fail(res, 404, "Role not found");

        if (result.data.name && result.data.name.toLowerCase() !== role.name.toLowerCase()) {
            const exists = await RolePermission.findOne({
                isDeleted: false,
                _id: { $ne: role._id },
                name: new RegExp(`^${escapeRegex(result.data.name)}$`, "i"),
            });

            if (exists) return fail(res, 409, "Role already exists");
        }

        Object.assign(role, result.data);

        if (result.data.permissions) {
            role.permissions = [...new Set(result.data.permissions)];
        }

        await role.save();

        await logAudit(req, "UPDATE", "security:role", `Updated role "${role.name}"`, id);

        return res.status(200).json({
            success: true,
            message: "Role updated successfully",
            data: role,
        });
    } catch (error) {
        return serverError(res, "Update role error", error, "Failed to update role");
    }
};

export const deleteRole = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid role ID");

        const role = await RolePermission.findOne({ _id: id, isDeleted: false });

        if (!role) return fail(res, 404, "Role not found");

        role.isDeleted = true;
        role.isActive = false;
        await role.save();

        await logAudit(req, "DELETE", "security:role", `Deleted role "${role.name}"`, id);

        return res.status(200).json({
            success: true,
            message: "Role deleted successfully",
        });
    } catch (error) {
        return serverError(res, "Delete role error", error, "Failed to delete role");
    }
};

/* ============================== OVERVIEW ============================== */

/*
 * Counts for the Security & Master tab cards
 * (roles configured, active devices, shift patterns, departments ...).
 */
export const getSecurityMasterOverview = async (_req: Request, res: Response) => {
    try {
        const active = { isDeleted: false, isActive: true };

        const [roles, activeSessions, ...masterCounts] = await Promise.all([
            RolePermission.countDocuments(active),
            LoginSession.countDocuments({ isActive: true }),
            ...Object.values(MasterType).map((type) =>
                MasterData.countDocuments({ ...active, type })
            ),
        ]);

        const master: Record<string, number> = {};

        Object.values(MasterType).forEach((type, i) => {
            master[type] = masterCounts[i];
        });

        return res.status(200).json({
            success: true,
            message: "Overview fetched successfully",
            data: { roles, activeSessions, master },
        });
    } catch (error) {
        return serverError(res, "Overview error", error, "Failed to fetch overview");
    }
};
