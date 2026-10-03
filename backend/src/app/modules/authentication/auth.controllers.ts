import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { generateToken } from "../../utils/generateJwtToken";
import { Authentication, UserRole } from "./auth.model";
import { adminLoginSchema, employeeLoginSchema } from "./auth.validation";

export const adminLogin = async (req: Request, res: Response) => {
    try {
        const parsed = adminLoginSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: parsed.error.issues,
            });
            return;
        }

        const { email, password } = parsed.data;

        const user = await Authentication.findOne({
            email: email.toLowerCase(),
            role: {
                $in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
            },
        });

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }

        if (!user.isActive) {
            res.status(403).json({
                success: false,
                message: "Account is inactive",
            });
            return;
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }

        const token = generateToken(
            user._id.toString(),
            user.role,
            user.employeeId
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                },
            },
        });
    } catch (error) {
        console.error("Admin Login Error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const employeeLogin = async (req: Request, res: Response) => {

    try {
        const parsed = employeeLoginSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: parsed.error.issues,
            });
            return;
        }

        const { employeeId, password } = parsed.data;

        const user = await Authentication.findOne({
            employeeId: employeeId.toUpperCase(),
            role: UserRole.EMPLOYEE,
        });

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid employee ID or password",
            });
            return;
        }

        if (!user.isActive) {
            res.status(403).json({
                success: false,
                message: "Account is inactive",
            });
            return;
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: "Invalid employee ID or password",
            });
            return;
        }

        const token = generateToken(user._id.toString(), user.role, user.employeeId);

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    id: user._id,
                    employeeId: user.employeeId,
                    role: user.role,
                },
            },
        });
    } catch (error) {
        console.error("Employee Login Error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};