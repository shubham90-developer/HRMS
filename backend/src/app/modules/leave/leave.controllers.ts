import { Request, Response } from "express";
import { Types } from "mongoose";
import { Leave } from "./leave.model";
import {
    LeaveSession,
    LeaveStatus,
} from "./leave.interface";
import {
    createLeaveSchema,
    updateLeaveSchema,
    rejectLeaveSchema,
} from "./leave.validation";
import { Employee } from "../employee/employee.model";

const calculateLeaveDays = (
    startDate: Date,
    endDate: Date,
    session: LeaveSession
): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const difference =
        end.getTime() - start.getTime();

    const days =
        Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;

    if (session !== LeaveSession.FULL_DAY) {
        return 0.5;
    }

    return days;
};

/*
 * Returns true when the logged-in employee owns the given leave.
 * Accepts either an ObjectId or a populated employee document.
 */
const isLeaveOwner = async (
    req: Request,
    leaveEmployee: unknown
): Promise<boolean> => {
    if (!req.user?.employeeId) {
        return false;
    }

    const me = await Employee.findOne({
        employeeId: req.user.employeeId,
    }).select("_id");

    if (!me) {
        return false;
    }

    const target = (leaveEmployee as any)?._id ?? leaveEmployee;

    return String(me._id) === String(target);
};

export const createLeave = async (
    req: Request,
    res: Response
) => {
    try {
        const result = createLeaveSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const data = result.data;

        const employee = await Employee.findById(
            data.employee
        );

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        /*
         * Employees can only apply for themselves.
         * Admin/Super Admin can create leave for any employee.
         */

        if (
            req.user?.role === "employee" &&
            employee.employeeId !== req.user.employeeId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You can only apply leave for yourself",
            });
        }

        const totalDays = calculateLeaveDays(
            data.startDate,
            data.endDate,
            data.session
        );

        /*
         * Prevent overlapping pending/approved leaves.
         */

        const overlappingLeave = await Leave.findOne({
            employee: employee._id,
            isDeleted: false,
            status: {
                $in: [
                    LeaveStatus.PENDING,
                    LeaveStatus.APPROVED,
                ],
            },

            startDate: {
                $lte: data.endDate,
            },

            endDate: {
                $gte: data.startDate,
            },
        });

        if (overlappingLeave) {
            return res.status(409).json({
                success: false,
                message:
                    "Leave already exists for the selected date range",
            });
        }

        const leave = await Leave.create({
            ...data,
            attachment: req.file?.path ?? data.attachment,
            totalDays,
            status: LeaveStatus.PENDING,
        });

        const populatedLeave =
            await Leave.findById(leave._id)
                .populate(
                    "employee",
                    "employeeId fullName role department"
                )
                .populate(
                    "reportingManager",
                    "employeeId fullName role department"
                );

        return res.status(201).json({
            success: true,
            message: "Leave applied successfully",
            data: populatedLeave,
        });
    } catch (error) {
        console.error("Create leave error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create leave",
        });
    }
};

export const getAllLeaves = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            status,
            employee,
            leaveType,
            startDate,
            endDate,
            page = "1",
            limit = "10",
        } = req.query;

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        const filter: any = {
            isDeleted: false,
        };

        if (status) {
            filter.status = status;
        }

        if (employee) {
            filter.employee = employee;
        }

        if (leaveType) {
            filter.leaveType = leaveType;
        }

        if (startDate || endDate) {
            filter.startDate = {};

            if (startDate) {
                filter.startDate.$gte = new Date(
                    startDate as string
                );
            }

            if (endDate) {
                filter.startDate.$lte = new Date(
                    endDate as string
                );
            }
        }

        const skip =
            (pageNumber - 1) * limitNumber;

        const [leaves, total] =
            await Promise.all([
                Leave.find(filter)
                    .populate(
                        "employee",
                        "employeeId fullName role department"
                    )
                    .populate(
                        "reportingManager",
                        "employeeId fullName role department"
                    )
                    .populate(
                        "approvedBy",
                        "email role"
                    )
                    .populate(
                        "rejectedBy",
                        "email role"
                    )
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNumber),

                Leave.countDocuments(filter),
            ]);

        return res.status(200).json({
            success: true,
            message: "Leaves fetched successfully",
            data: leaves,
            pagination: {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(
                    total / limitNumber
                ),
            },
        });
    } catch (error) {
        console.error("Get all leaves error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch leaves",
        });
    }
};

export const getMyLeaves = async (
    req: Request,
    res: Response
) => {
    try {
        if (
            !req.user?.employeeId
        ) {
            return res.status(400).json({
                success: false,
                message: "Employee information not found",
            });
        }

        const employee =
            await Employee.findOne({
                employeeId: req.user.employeeId,
            });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        const leaves = await Leave.find({
            employee: employee._id,
            isDeleted: false,
        })
            .populate(
                "reportingManager",
                "employeeId fullName role department"
            )
            .populate(
                "approvedBy",
                "email role"
            )
            .populate(
                "rejectedBy",
                "email role"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Your leaves fetched successfully",
            data: leaves,
        });
    } catch (error) {
        console.error("Get my leaves error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch leaves",
        });
    }
};

export const getLeaveById = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave ID",
            });
        }

        const leave = await Leave.findOne({
            _id: id,
            isDeleted: false,
        })
            .populate(
                "employee",
                "employeeId fullName role department"
            )
            .populate(
                "reportingManager",
                "employeeId fullName role department"
            )
            .populate(
                "approvedBy",
                "email role"
            )
            .populate(
                "rejectedBy",
                "email role"
            );

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found",
            });
        }

        if (
            req.user?.role === "employee" &&
            !(await isLeaveOwner(req, leave.employee))
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Leave fetched successfully",
            data: leave,
        });
    } catch (error) {
        console.error("Get leave error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch leave",
        });
    }
};

export const updateLeave = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave ID",
            });
        }

        const result = updateLeaveSchema.safeParse(
            req.body
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const leave = await Leave.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found",
            });
        }

        if (!(await isLeaveOwner(req, leave.employee))) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }

        if (leave.status !== LeaveStatus.PENDING) {
            return res.status(400).json({
                success: false,
                message:
                    "Only pending leaves can be updated",
            });
        }

        const data = result.data;

        const startDate =
            data.startDate ?? leave.startDate;

        const endDate =
            data.endDate ?? leave.endDate;

        const session =
            data.session ?? leave.session;

        if (endDate < startDate) {
            return res.status(400).json({
                success: false,
                message:
                    "End date must be greater than or equal to start date",
            });
        }

        const totalDays = calculateLeaveDays(
            startDate,
            endDate,
            session
        );

        Object.assign(leave, {
            ...data,
            ...(req.file ? { attachment: req.file.path } : {}),
            totalDays,
        });

        await leave.save();

        return res.status(200).json({
            success: true,
            message: "Leave updated successfully",
            data: leave,
        });
    } catch (error) {
        console.error("Update leave error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update leave",
        });
    }
};

export const deleteLeave = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave ID",
            });
        }

        const leave = await Leave.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found",
            });
        }

        if (!(await isLeaveOwner(req, leave.employee))) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }

        if (leave.status !== LeaveStatus.PENDING) {
            return res.status(400).json({
                success: false,
                message:
                    "Only pending leaves can be cancelled",
            });
        }

        leave.isDeleted = true;

        await leave.save();

        return res.status(200).json({
            success: true,
            message: "Leave cancelled successfully",
        });
    } catch (error) {
        console.error("Delete leave error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to cancel leave",
        });
    }
};

export const approveLeave = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave ID",
            });
        }

        const leave = await Leave.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found",
            });
        }

        if (leave.status !== LeaveStatus.PENDING) {
            return res.status(400).json({
                success: false,
                message:
                    "Only pending leaves can be approved",
            });
        }

        /*
         * req.user.id comes from authenticate middleware.
         */

        leave.status = LeaveStatus.APPROVED;
        leave.approvedBy = new Types.ObjectId(
            req.user!.id
        );
        leave.approvedAt = new Date();

        // Clear rejection information if any
        leave.rejectionReason = undefined;
        leave.rejectedBy = undefined;
        leave.rejectedAt = undefined;

        await leave.save();

        const populatedLeave =
            await Leave.findById(leave._id)
                .populate(
                    "employee",
                    "employeeId fullName role department"
                )
                .populate(
                    "approvedBy",
                    "email role"
                );

        return res.status(200).json({
            success: true,
            message: "Leave approved successfully",
            data: populatedLeave,
        });
    } catch (error) {
        console.error("Approve leave error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to approve leave",
        });
    }
};

export const rejectLeave = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave ID",
            });
        }

        const result = rejectLeaveSchema.safeParse(
            req.body
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const leave = await Leave.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave not found",
            });
        }

        if (leave.status !== LeaveStatus.PENDING) {
            return res.status(400).json({
                success: false,
                message:
                    "Only pending leaves can be rejected",
            });
        }

        leave.status = LeaveStatus.REJECTED;

        leave.rejectionReason =
            result.data.rejectionReason;

        leave.rejectedBy = new Types.ObjectId(
            req.user!.id
        );

        leave.rejectedAt = new Date();

        await leave.save();

        const populatedLeave =
            await Leave.findById(leave._id)
                .populate(
                    "employee",
                    "employeeId fullName role department"
                )
                .populate(
                    "rejectedBy",
                    "email role"
                );

        return res.status(200).json({
            success: true,
            message: "Leave rejected successfully",
            data: populatedLeave,
        });
    } catch (error) {
        console.error("Reject leave error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to reject leave",
        });
    }
};

