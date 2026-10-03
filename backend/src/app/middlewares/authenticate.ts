import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Authentication } from "../modules/authentication/auth.model";

interface JwtPayload {
    id: string;
    role: string;
    employeeId?: string;
}

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({
                success: false,
                message: "Authorization token is required",
            });
            return;
        }

        const token = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;

        if (!token) {
            res.status(401).json({
                success: false,
                message: "Invalid authorization format",
            });
            return;
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as JwtPayload;

        if (!decoded.id) {
            res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
            return;
        }

        // Re-check the account on every request so that deactivated or
        // deleted users (and role changes) take effect immediately.
        const account = await Authentication.findById(decoded.id).select(
            "isActive role employeeId"
        );

        if (!account || !account.isActive) {
            res.status(401).json({
                success: false,
                message: "Account is inactive or no longer exists",
            });
            return;
        }

        req.user = {
            id: decoded.id,
            role: account.role,
            employeeId: account.employeeId ?? decoded.employeeId,
        };

        next();
    } catch (error) {
        console.error("Authentication Error:", error);

        res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};
