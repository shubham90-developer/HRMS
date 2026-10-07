import { Request, Response } from "express";
import { Types } from "mongoose";
import { Training, TrainingEnrollment } from "./training.model";
import { TrainingStatus, EnrollmentStatus } from "./training.interface";
import {
    createTrainingSchema,
    updateTrainingSchema,
    rejectEnrollmentSchema,
    updateProgressSchema,
} from "./training.validation";
import {
    isValidId,
    getPagination,
    buildPagination,
    escapeRegex,
    getMyEmployee,
    isAdminRole,
} from "../../utils/common";

/* Enrollments that occupy a seat */
const SEAT_STATUSES = [
    EnrollmentStatus.APPROVED,
    EnrollmentStatus.IN_PROGRESS,
    EnrollmentStatus.COMPLETED,
];

const fail = (res: Response, code: number, message: string) =>
    res.status(code).json({ success: false, message });

const serverError = (res: Response, label: string, error: unknown, message: string) => {
    console.error(`${label}:`, error);
    return fail(res, 500, message);
};

/* ----------------------------- Trainings ----------------------------- */

export const createTraining = async (req: Request, res: Response) => {
    try {
        const result = createTrainingSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const training = await Training.create({
            ...result.data,
            createdBy: new Types.ObjectId(req.user!.id),
        });

        return res.status(201).json({
            success: true,
            message: "Training created successfully",
            data: training,
        });
    } catch (error) {
        return serverError(res, "Create training error", error, "Failed to create training");
    }
};

/*
 * Course library. Employees only see active, non-cancelled trainings.
 */
export const getAllTrainings = async (req: Request, res: Response) => {
    try {
        const { status, category, mode, mandatory, search } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter: any = { isDeleted: false };

        if (!isAdminRole(req.user?.role)) {
            filter.isActive = true;
            filter.status = { $ne: TrainingStatus.CANCELLED };
        }

        if (status) filter.status = status;
        if (category) filter.category = category;
        if (mode) filter.mode = mode;
        if (mandatory !== undefined) filter.isMandatory = mandatory === "true";

        if (search) {
            const regex = new RegExp(escapeRegex(String(search)), "i");
            filter.$or = [{ title: regex }, { trainer: regex }, { category: regex }];
        }

        const [trainings, total] = await Promise.all([
            Training.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit),
            Training.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Trainings fetched successfully",
            data: trainings,
            pagination: buildPagination(total, page, limit),
        });
    } catch (error) {
        return serverError(res, "Get trainings error", error, "Failed to fetch trainings");
    }
};

export const getTrainingById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid training ID");

        const filter: any = { _id: id, isDeleted: false };

        if (!isAdminRole(req.user?.role)) filter.isActive = true;

        const training = await Training.findOne(filter);

        if (!training) return fail(res, 404, "Training not found");

        const enrolled = await TrainingEnrollment.countDocuments({
            training: training._id,
            isDeleted: false,
            status: { $in: SEAT_STATUSES },
        });

        return res.status(200).json({
            success: true,
            message: "Training fetched successfully",
            data: { ...training.toObject(), enrolledCount: enrolled },
        });
    } catch (error) {
        return serverError(res, "Get training error", error, "Failed to fetch training");
    }
};

export const updateTraining = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid training ID");

        const result = updateTrainingSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const training = await Training.findOne({ _id: id, isDeleted: false });

        if (!training) return fail(res, 404, "Training not found");

        Object.assign(training, result.data);

        if (training.endDate < training.startDate) {
            return fail(res, 400, "End date must be greater than or equal to start date");
        }

        await training.save();

        return res.status(200).json({
            success: true,
            message: "Training updated successfully",
            data: training,
        });
    } catch (error) {
        return serverError(res, "Update training error", error, "Failed to update training");
    }
};

export const deleteTraining = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid training ID");

        const training = await Training.findOne({ _id: id, isDeleted: false });

        if (!training) return fail(res, 404, "Training not found");

        training.isDeleted = true;
        training.isActive = false;
        await training.save();

        await TrainingEnrollment.updateMany(
            { training: training._id },
            { $set: { isDeleted: true } }
        );

        return res.status(200).json({
            success: true,
            message: "Training deleted successfully",
        });
    } catch (error) {
        return serverError(res, "Delete training error", error, "Failed to delete training");
    }
};

/* ------------------------ Overview / Calendar / Reports ------------------------ */

/*
 * Training tab header cards. Admin gets company-wide numbers,
 * employees get their own numbers.
 */
export const getTrainingOverview = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const trainingBase: any = { isDeleted: false };

        if (isAdminRole(req.user?.role)) {
            const [total, upcoming, ongoing, completed, sessionsThisMonth, pendingRequests, enrolled] =
                await Promise.all([
                    Training.countDocuments(trainingBase),
                    Training.countDocuments({ ...trainingBase, status: TrainingStatus.UPCOMING }),
                    Training.countDocuments({ ...trainingBase, status: TrainingStatus.ONGOING }),
                    Training.countDocuments({ ...trainingBase, status: TrainingStatus.COMPLETED }),
                    Training.countDocuments({
                        ...trainingBase,
                        startDate: { $gte: monthStart, $lt: monthEnd },
                    }),
                    TrainingEnrollment.countDocuments({
                        isDeleted: false,
                        status: EnrollmentStatus.REQUESTED,
                    }),
                    TrainingEnrollment.countDocuments({
                        isDeleted: false,
                        status: { $in: SEAT_STATUSES },
                    }),
                ]);

            return res.status(200).json({
                success: true,
                message: "Training overview fetched successfully",
                data: {
                    totalTrainings: total,
                    upcoming,
                    ongoing,
                    completed,
                    sessionsThisMonth,
                    pendingRequests,
                    totalEnrolled: enrolled,
                },
            });
        }

        const me = await getMyEmployee(req);

        if (!me) return fail(res, 404, "Employee not found");

        const mine = { employee: me._id, isDeleted: false };

        const [enrolled, inProgress, completed, pending] = await Promise.all([
            TrainingEnrollment.countDocuments({ ...mine, status: { $in: SEAT_STATUSES } }),
            TrainingEnrollment.countDocuments({ ...mine, status: EnrollmentStatus.IN_PROGRESS }),
            TrainingEnrollment.countDocuments({ ...mine, status: EnrollmentStatus.COMPLETED }),
            TrainingEnrollment.countDocuments({ ...mine, status: EnrollmentStatus.REQUESTED }),
        ]);

        return res.status(200).json({
            success: true,
            message: "Training overview fetched successfully",
            data: { enrolled, inProgress, completed, pendingRequests: pending },
        });
    } catch (error) {
        return serverError(res, "Training overview error", error, "Failed to fetch training overview");
    }
};

export const getTrainingCalendar = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const month = Number(req.query.month ?? now.getMonth() + 1);
        const year = Number(req.query.year ?? now.getFullYear());

        if (!(month >= 1 && month <= 12) || !(year >= 2000 && year <= 2100)) {
            return fail(res, 400, "Invalid month or year");
        }

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);

        const filter: any = {
            isDeleted: false,
            // any training overlapping the month
            startDate: { $lt: end },
            endDate: { $gte: start },
        };

        if (!isAdminRole(req.user?.role)) {
            filter.isActive = true;
            filter.status = { $ne: TrainingStatus.CANCELLED };
        }

        const trainings = await Training.find(filter).sort({ startDate: 1 });

        return res.status(200).json({
            success: true,
            message: "Training calendar fetched successfully",
            data: { month, year, trainings },
        });
    } catch (error) {
        return serverError(res, "Training calendar error", error, "Failed to fetch training calendar");
    }
};

/*
 * Training reports: enrolment, completion and average score per training.
 */
export const getTrainingReports = async (req: Request, res: Response) => {
    try {
        const { status, category, from, to } = req.query;

        const filter: any = { isDeleted: false };

        if (status) filter.status = status;
        if (category) filter.category = category;

        if (from || to) {
            filter.startDate = {};
            if (from) filter.startDate.$gte = new Date(String(from));
            if (to) filter.startDate.$lte = new Date(String(to));
        }

        const trainings = await Training.find(filter).sort({ startDate: -1 });

        const stats = await TrainingEnrollment.aggregate([
            {
                $match: {
                    isDeleted: false,
                    training: { $in: trainings.map((t) => t._id) },
                },
            },
            {
                $group: {
                    _id: "$training",
                    requested: {
                        $sum: { $cond: [{ $eq: ["$status", EnrollmentStatus.REQUESTED] }, 1, 0] },
                    },
                    enrolled: {
                        $sum: { $cond: [{ $in: ["$status", SEAT_STATUSES] }, 1, 0] },
                    },
                    completed: {
                        $sum: { $cond: [{ $eq: ["$status", EnrollmentStatus.COMPLETED] }, 1, 0] },
                    },
                    avgScore: { $avg: "$score" },
                },
            },
        ]);

        const statMap = new Map(stats.map((s) => [String(s._id), s]));

        const rows = trainings.map((t) => {
            const s = statMap.get(String(t._id));
            const enrolled = s?.enrolled ?? 0;
            const completed = s?.completed ?? 0;

            return {
                training: t._id,
                title: t.title,
                category: t.category,
                trainer: t.trainer,
                status: t.status,
                startDate: t.startDate,
                endDate: t.endDate,
                requested: s?.requested ?? 0,
                enrolled,
                completed,
                completionRate: enrolled ? Math.round((completed / enrolled) * 100) : 0,
                averageScore: s?.avgScore != null ? Math.round(s.avgScore * 10) / 10 : null,
            };
        });

        return res.status(200).json({
            success: true,
            message: "Training reports fetched successfully",
            data: rows,
        });
    } catch (error) {
        return serverError(res, "Training reports error", error, "Failed to fetch training reports");
    }
};

/* ----------------------------- Enrollments ----------------------------- */

const seatsTaken = (trainingId: Types.ObjectId) =>
    TrainingEnrollment.countDocuments({
        training: trainingId,
        isDeleted: false,
        status: { $in: SEAT_STATUSES },
    });

/*
 * Employee requests enrolment ("Enrolment Requests" tab for admins).
 */
export const enrollInTraining = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid training ID");

        const me = await getMyEmployee(req);

        if (!me) return fail(res, 404, "Employee not found");

        const training = await Training.findOne({
            _id: id,
            isDeleted: false,
            isActive: true,
        });

        if (!training) return fail(res, 404, "Training not found");

        if (
            training.status === TrainingStatus.CANCELLED ||
            training.status === TrainingStatus.COMPLETED
        ) {
            return fail(res, 400, `Cannot enroll in a ${training.status.toLowerCase()} training`);
        }

        if (training.capacity && (await seatsTaken(training._id as Types.ObjectId)) >= training.capacity) {
            return fail(res, 409, "Training is full");
        }

        const existing = await TrainingEnrollment.findOne({
            training: training._id,
            employee: me._id,
            isDeleted: false,
        });

        if (existing && existing.status !== EnrollmentStatus.REJECTED) {
            return fail(res, 409, "You have already requested or joined this training");
        }

        const enrollment = existing ?? new TrainingEnrollment({ training: training._id, employee: me._id });

        enrollment.status = EnrollmentStatus.REQUESTED;
        enrollment.rejectionReason = undefined;
        enrollment.progress = 0;

        await enrollment.save();

        return res.status(201).json({
            success: true,
            message: "Enrolment requested successfully",
            data: enrollment,
        });
    } catch (error) {
        return serverError(res, "Enroll error", error, "Failed to request enrolment");
    }
};

export const getMyEnrollments = async (req: Request, res: Response) => {
    try {
        const me = await getMyEmployee(req);

        if (!me) return fail(res, 404, "Employee not found");

        const filter: any = { employee: me._id, isDeleted: false };

        if (req.query.status) filter.status = req.query.status;

        const enrollments = await TrainingEnrollment.find(filter)
            .populate("training")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Your enrollments fetched successfully",
            data: enrollments,
        });
    } catch (error) {
        return serverError(res, "My enrollments error", error, "Failed to fetch enrollments");
    }
};

export const getAllEnrollments = async (req: Request, res: Response) => {
    try {
        const { status, training, employee } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter: any = { isDeleted: false };

        if (status) filter.status = status;
        if (training && isValidId(training)) filter.training = training;
        if (employee && isValidId(employee)) filter.employee = employee;

        const [enrollments, total] = await Promise.all([
            TrainingEnrollment.find(filter)
                .populate("training", "title trainer startDate endDate status")
                .populate("employee", "employeeId fullName department role")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            TrainingEnrollment.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Enrollments fetched successfully",
            data: enrollments,
            pagination: buildPagination(total, page, limit),
        });
    } catch (error) {
        return serverError(res, "Get enrollments error", error, "Failed to fetch enrollments");
    }
};

export const approveEnrollment = async (req: Request, res: Response) => {
    try {
        const id = req.params.enrollmentId as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid enrollment ID");

        const enrollment = await TrainingEnrollment.findOne({ _id: id, isDeleted: false });

        if (!enrollment) return fail(res, 404, "Enrollment not found");

        if (enrollment.status !== EnrollmentStatus.REQUESTED) {
            return fail(res, 400, "Only requested enrollments can be approved");
        }

        const training = await Training.findById(enrollment.training);

        if (training?.capacity && (await seatsTaken(training._id as Types.ObjectId)) >= training.capacity) {
            return fail(res, 409, "Training is full");
        }

        enrollment.status = EnrollmentStatus.APPROVED;
        enrollment.approvedBy = new Types.ObjectId(req.user!.id);
        enrollment.approvedAt = new Date();
        enrollment.rejectionReason = undefined;

        await enrollment.save();

        return res.status(200).json({
            success: true,
            message: "Enrollment approved successfully",
            data: enrollment,
        });
    } catch (error) {
        return serverError(res, "Approve enrollment error", error, "Failed to approve enrollment");
    }
};

export const rejectEnrollment = async (req: Request, res: Response) => {
    try {
        const id = req.params.enrollmentId as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid enrollment ID");

        const result = rejectEnrollmentSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const enrollment = await TrainingEnrollment.findOne({ _id: id, isDeleted: false });

        if (!enrollment) return fail(res, 404, "Enrollment not found");

        if (enrollment.status !== EnrollmentStatus.REQUESTED) {
            return fail(res, 400, "Only requested enrollments can be rejected");
        }

        enrollment.status = EnrollmentStatus.REJECTED;
        enrollment.rejectionReason = result.data.rejectionReason;
        enrollment.approvedBy = new Types.ObjectId(req.user!.id);
        enrollment.approvedAt = new Date();

        await enrollment.save();

        return res.status(200).json({
            success: true,
            message: "Enrollment rejected successfully",
            data: enrollment,
        });
    } catch (error) {
        return serverError(res, "Reject enrollment error", error, "Failed to reject enrollment");
    }
};

/*
 * Progress 1-99 => In Progress, 100 => Completed (certificate optional).
 */
export const updateEnrollmentProgress = async (req: Request, res: Response) => {
    try {
        const id = req.params.enrollmentId as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid enrollment ID");

        const result = updateProgressSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const enrollment = await TrainingEnrollment.findOne({ _id: id, isDeleted: false });

        if (!enrollment) return fail(res, 404, "Enrollment not found");

        if (
            enrollment.status !== EnrollmentStatus.APPROVED &&
            enrollment.status !== EnrollmentStatus.IN_PROGRESS &&
            enrollment.status !== EnrollmentStatus.COMPLETED
        ) {
            return fail(res, 400, "Progress can only be updated for approved enrollments");
        }

        const { progress, score, certificateUrl } = result.data;

        enrollment.progress = progress;

        if (score !== undefined) enrollment.score = score;
        if (certificateUrl !== undefined) enrollment.certificateUrl = certificateUrl;

        if (progress >= 100) {
            enrollment.status = EnrollmentStatus.COMPLETED;
            enrollment.completedAt = enrollment.completedAt ?? new Date();
        } else {
            enrollment.status =
                progress > 0 ? EnrollmentStatus.IN_PROGRESS : EnrollmentStatus.APPROVED;
            enrollment.completedAt = undefined;
        }

        await enrollment.save();

        return res.status(200).json({
            success: true,
            message: "Enrollment progress updated successfully",
            data: enrollment,
        });
    } catch (error) {
        return serverError(res, "Update progress error", error, "Failed to update progress");
    }
};

/*
 * Employee withdraws a request that is still pending.
 */
export const cancelEnrollment = async (req: Request, res: Response) => {
    try {
        const id = req.params.enrollmentId as string;

        if (!isValidId(id)) return fail(res, 400, "Invalid enrollment ID");

        const me = await getMyEmployee(req);

        if (!me) return fail(res, 404, "Employee not found");

        const enrollment = await TrainingEnrollment.findOne({ _id: id, isDeleted: false });

        if (!enrollment) return fail(res, 404, "Enrollment not found");

        if (String(enrollment.employee) !== String(me._id)) {
            return fail(res, 403, "Access denied");
        }

        if (enrollment.status !== EnrollmentStatus.REQUESTED) {
            return fail(res, 400, "Only requested enrollments can be cancelled");
        }

        enrollment.isDeleted = true;
        await enrollment.save();

        return res.status(200).json({
            success: true,
            message: "Enrollment request cancelled successfully",
        });
    } catch (error) {
        return serverError(res, "Cancel enrollment error", error, "Failed to cancel enrollment");
    }
};
