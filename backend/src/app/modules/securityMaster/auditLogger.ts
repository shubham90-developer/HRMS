import { Request } from "express";
import { Types } from "mongoose";
import { AuditLog } from "./securityMaster.model";
import { getDisplayName } from "../../utils/common";

/*
 * Fire-and-forget audit entry. Never throws, so it can be called from any
 * controller in the project:
 *
 *   import { logAudit } from "../securityMaster/auditLogger";
 *   await logAudit(req, "UPDATE", "payroll", "Changed salary structure", id);
 */
export const logAudit = async (
    req: Request,
    action: string,
    module: string,
    description?: string,
    targetId?: string
): Promise<void> => {
    try {
        await AuditLog.create({
            actor: req.user?.id ? new Types.ObjectId(req.user.id) : undefined,
            actorName: await getDisplayName(req),
            actorRole: req.user?.role,
            action,
            module,
            targetId,
            description,
            ipAddress: req.ip,
        });
    } catch (error) {
        console.error("Audit log error:", error);
    }
};
