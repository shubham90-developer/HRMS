import { Request, Response } from "express";
import mongoose from "mongoose";
import { Employee } from "./employee.model";
import { createEmployeeSchema, updateEmployeeSchema } from "./employee.validation";
import { generateEmployeeId } from "../../utils/generateEmployeeId";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Authentication, UserRole } from "../authentication/auth.model";

// POST - create employee
export const createEmployee = async (req: Request, res: Response): Promise<void> => {

    try {
        const validationResult =
            createEmployeeSchema.safeParse({
                ...req.body,
                salaryYearly: Number(req.body.salaryYearly),
            });

        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationResult.error.flatten(),
            });
            return;
        }

        let employeeId = generateEmployeeId();

        // Regenerate on the (unlikely) chance of a collision
        while (await Employee.exists({ employeeId })) {
            employeeId = generateEmployeeId();
        }

        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };

        const aadhaarFile = files?.aadhaar?.[0];
        const panCardFile = files?.panCard?.[0];

        if (!aadhaarFile || !panCardFile) {
            res.status(400).json({
                success: false,
                message:
                    "Both Aadhaar and PAN Card documents are required",
            });
            return;
        }

        const salaryYearly =
            validationResult.data.salaryYearly;

        const employee = await Employee.create({
            ...validationResult.data,

            employeeId,

            salaryMonthly: salaryYearly / 12,

            identification: {
                aadhaar: aadhaarFile.path,
                panCard: panCardFile.path,
            },
        });

        // Create login credentials so the employee can sign in.
        // The temporary password is returned only once in this response.
        const temporaryPassword = crypto.randomBytes(6).toString("base64url");

        try {
            await Authentication.create({
                employeeId,
                password: await bcrypt.hash(temporaryPassword, 10),
                role: UserRole.EMPLOYEE,
                isActive: true,
            });
        } catch (authError) {
            // Roll back so we never keep an employee without a login
            await Employee.findByIdAndDelete(employee._id);
            throw authError;
        }

        res.status(201).json({
            success: true,
            message: "Employee created successfully",
            data: employee,
            credentials: {
                employeeId,
                temporaryPassword,
            },
        });
    } catch (error: any) {
        console.error("Create Employee Error:", error);

        if (error.code === 11000) {
            res.status(409).json({
                success: false,
                message: "Employee with the provided details already exists",
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Failed to create employee",
        });
    }
};

// GET all employees
export const getAllEmployees = async (req: Request, res: Response): Promise<void> => {

    try {
        const employees = await Employee.find()
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Employees fetched successfully",
            count: employees.length,
            data: employees,
        });
    } catch (error: any) {
        console.error("Get Employees Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch employees",
        });
    }
};

// GET employee by Id
export const getEmployeeById = async (req: Request, res: Response): Promise<void> => {

    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid employee ID",
            });
            return;
        }

        const employee = await Employee.findById(id);

        if (!employee) {
            res.status(404).json({
                success: false,
                message: "Employee not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Employee fetched successfully",
            data: employee,
        });
    } catch (error: any) {
        console.error("Get Employee Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch employee",
        });
    }
};

// PUT - update employee by Id
export const updateEmployee = async (req: Request, res: Response): Promise<void> => {

    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid employee ID",
            });
            return;
        }

        const existingEmployee = await Employee.findById(id);

        if (!existingEmployee) {
            res.status(404).json({
                success: false,
                message: "Employee not found",
            });
            return;
        }

        const validationResult = updateEmployeeSchema.safeParse({
            ...req.body,

            salaryYearly:
                req.body.salaryYearly !== undefined
                    ? Number(req.body.salaryYearly)
                    : undefined,
        });

        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationResult.error.flatten(),
            });
            return;
        }

        const updateData: any = {
            ...validationResult.data,
        };

        // Calculate monthly salary automatically
        if (validationResult.data.salaryYearly !== undefined) {
            updateData.salaryMonthly =
                validationResult.data.salaryYearly / 12;
        }

        // Employee ID cannot be changed
        delete updateData.employeeId;

        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };

        const aadhaarFile = files?.aadhaar?.[0];
        const panCardFile = files?.panCard?.[0];

        // Keep existing identification documents
        const identification = {
            ...existingEmployee.identification,
        };

        // Replace Aadhaar if new document is uploaded
        if (aadhaarFile) {
            identification.aadhaar = aadhaarFile.path;
        }

        // Replace PAN Card if new document is uploaded
        if (panCardFile) {
            identification.panCard = panCardFile.path;
        }

        if (aadhaarFile || panCardFile) {
            updateData.identification = identification;
        }

        const updatedEmployee = await Employee.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        );

        // Keep login access in sync with employment status
        if (validationResult.data.employmentStatus !== undefined) {
            const loginAllowed = !["Inactive", "Terminated"].includes(
                validationResult.data.employmentStatus
            );

            await Authentication.updateOne(
                { employeeId: existingEmployee.employeeId },
                { isActive: loginAllowed }
            );
        }

        res.status(200).json({
            success: true,
            message: "Employee updated successfully",
            data: updatedEmployee,
        });
    } catch (error: any) {
        console.error("Update Employee Error:", error);

        if (error.code === 11000) {
            res.status(409).json({
                success: false,
                message: "Employee with the provided details already exists",
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Failed to update employee",
        });
    }
};

// DELETE employee by Id
export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {

    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid employee ID",
            });
            return;
        }

        const employee = await Employee.findById(id);

        if (!employee) {
            res.status(404).json({
                success: false,
                message: "Employee not found",
            });
            return;
        }

        await Authentication.deleteOne({
            employeeId: employee.employeeId,
        });

        await Employee.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Employee deleted successfully",
        });
    } catch (error: any) {
        console.error("Delete Employee Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete employee",
        });
    }
};