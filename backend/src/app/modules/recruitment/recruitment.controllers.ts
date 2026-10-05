import { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import { Candidate, JobOpening } from "./recruitment.model";
import {
    CandidateSource,
    CandidateStage,
    EmploymentType,
    InterviewStatus,
    JobStatus,
    WorkMode,
} from "./recruitment.interface";
import {
    createJobSchema,
    updateJobSchema,
    updateJobStatusSchema,
    createCandidateSchema,
    updateCandidateSchema,
    updateCandidateStageSchema,
    scheduleInterviewSchema,
    updateInterviewSchema,
} from "./recruitment.validation";
import { Employee } from "../employee/employee.model";

/* ------------------------------- Helpers -------------------------------- */

const escapeRegex = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (
    query: Request["query"],
    defaultLimit = 10,
    maxLimit = 100
) => {
    const page = Math.max(
        parseInt(String(query.page ?? "1"), 10) || 1,
        1
    );

    const limit = Math.min(
        Math.max(
            parseInt(String(query.limit ?? defaultLimit), 10) ||
                defaultLimit,
            1
        ),
        maxLimit
    );

    return { page, limit, skip: (page - 1) * limit };
};

const currentUserId = (req: Request) =>
    new Types.ObjectId(req.user!.id);

const toResume = (file: Express.Multer.File) => ({
    url: file.path,
    publicId: file.filename,
    originalName: file.originalname,
});

const hasValue = <T extends string>(
    allowed: Record<string, T>,
    value: unknown
): value is T =>
    typeof value === "string" &&
    (Object.values(allowed) as string[]).includes(value);

const interviewersExist = async (ids: string[]): Promise<boolean> => {
    const unique = [...new Set(ids)];

    if (unique.length === 0) {
        return true;
    }

    const count = await Employee.countDocuments({
        _id: { $in: unique },
    });

    return count === unique.length;
};

/* ============================ JOB OPENINGS ============================== */

export const createJob = async (req: Request, res: Response) => {
    try {
        const result = createJobSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const data = result.data;

        const job = await JobOpening.create({
            ...data,
            skills: data.skills ?? [],
            createdBy: currentUserId(req),
        });

        return res.status(201).json({
            success: true,
            message: "Job opening created successfully",
            data: job,
        });
    } catch (error) {
        console.error("Create job error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create job opening",
        });
    }
};

export const getJobs = async (req: Request, res: Response) => {
    try {
        const { status, department, employmentType, workMode, search } =
            req.query;

        const filter: Record<string, any> = { isDeleted: false };

        if (status) {
            if (!hasValue(JobStatus, status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status filter",
                });
            }

            filter.status = status;
        }

        if (employmentType) {
            if (!hasValue(EmploymentType, employmentType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid employmentType filter",
                });
            }

            filter.employmentType = employmentType;
        }

        if (workMode) {
            if (!hasValue(WorkMode, workMode)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workMode filter",
                });
            }

            filter.workMode = workMode;
        }

        if (department) {
            filter.department = {
                $regex: `^${escapeRegex(String(department))}$`,
                $options: "i",
            };
        }

        if (search) {
            const pattern = {
                $regex: escapeRegex(String(search)),
                $options: "i",
            };

            filter.$or = [{ title: pattern }, { department: pattern }];
        }

        const { page, limit, skip } = getPagination(req.query);

        const [jobs, total] = await Promise.all([
            JobOpening.find(filter)
                .select("-createdBy -updatedBy -isDeleted")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            JobOpening.countDocuments(filter),
        ]);

        const counts = await Candidate.aggregate([
            {
                $match: {
                    job: { $in: jobs.map((job) => job._id) },
                    isDeleted: false,
                },
            },
            { $group: { _id: "$job", count: { $sum: 1 } } },
        ]);

        const countMap = new Map<string, number>(
            counts.map((item) => [String(item._id), item.count])
        );

        return res.status(200).json({
            success: true,
            message: "Job openings fetched successfully",
            data: jobs.map((job) => ({
                ...job,
                applicantsCount: countMap.get(String(job._id)) ?? 0,
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get jobs error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch job openings",
        });
    }
};

export const getJobById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID",
            });
        }

        const job = await JobOpening.findOne({
            _id: id,
            isDeleted: false,
        })
            .select("-isDeleted")
            .lean();

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job opening not found",
            });
        }

        const stageCounts = await Candidate.aggregate([
            { $match: { job: job._id, isDeleted: false } },
            { $group: { _id: "$stage", count: { $sum: 1 } } },
        ]);

        const stageSummary: Record<string, number> = {};

        Object.values(CandidateStage).forEach((stage) => {
            stageSummary[stage] = 0;
        });

        let applicantsCount = 0;

        stageCounts.forEach((item) => {
            stageSummary[item._id] = item.count;
            applicantsCount += item.count;
        });

        return res.status(200).json({
            success: true,
            message: "Job opening fetched successfully",
            data: { ...job, applicantsCount, stageSummary },
        });
    } catch (error) {
        console.error("Get job error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch job opening",
        });
    }
};

export const updateJob = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID",
            });
        }

        const result = updateJobSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const data = result.data;

        const job = await JobOpening.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job opening not found",
            });
        }

        const min = data.experienceMin ?? job.experienceMin;
        const max = data.experienceMax ?? job.experienceMax;

        if (max !== undefined && max < min) {
            return res.status(400).json({
                success: false,
                message:
                    "Maximum experience must be greater than or equal to minimum experience",
            });
        }

        job.set({ ...data, updatedBy: currentUserId(req) });

        await job.save();

        return res.status(200).json({
            success: true,
            message: "Job opening updated successfully",
            data: job,
        });
    } catch (error) {
        console.error("Update job error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update job opening",
        });
    }
};

export const updateJobStatus = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID",
            });
        }

        const result = updateJobStatusSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const job = await JobOpening.findOneAndUpdate(
            { _id: id, isDeleted: false },
            {
                status: result.data.status,
                updatedBy: currentUserId(req),
            },
            { returnDocument: "after" }
        );

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job opening not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: `Job opening marked as ${job.status}`,
            data: job,
        });
    } catch (error) {
        console.error("Update job status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update job status",
        });
    }
};

export const deleteJob = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID",
            });
        }

        const job = await JobOpening.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { isDeleted: true, updatedBy: currentUserId(req) },
            { returnDocument: "after" }
        );

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job opening not found",
            });
        }

        // Candidates belong to the job, so they are removed with it
        await Candidate.updateMany(
            { job: job._id, isDeleted: false },
            { isDeleted: true, updatedBy: currentUserId(req) }
        );

        return res.status(200).json({
            success: true,
            message: "Job opening deleted successfully",
        });
    } catch (error) {
        console.error("Delete job error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete job opening",
        });
    }
};

/* ============================== CANDIDATES ============================== */

export const addCandidate = async (req: Request, res: Response) => {
    try {
        const jobId = req.params.jobId as string;

        if (!Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID",
            });
        }

        const result = createCandidateSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const data = result.data;

        const job = await JobOpening.findOne({
            _id: jobId,
            isDeleted: false,
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job opening not found",
            });
        }

        if (job.status === JobStatus.CLOSED) {
            return res.status(400).json({
                success: false,
                message: "This job opening is closed",
            });
        }

        const duplicate = await Candidate.findOne({
            job: job._id,
            email: data.email,
            isDeleted: false,
        });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message:
                    "A candidate with this email already exists for this job",
            });
        }

        const now = new Date();

        const candidate = await Candidate.create({
            ...data,
            job: job._id,
            skills: data.skills ?? [],
            resume: req.file ? toResume(req.file) : undefined,
            stage: CandidateStage.APPLIED,
            stageHistory: [
                {
                    stage: CandidateStage.APPLIED,
                    changedBy: currentUserId(req),
                    changedAt: now,
                },
            ],
            appliedAt: data.appliedAt ?? now,
            createdBy: currentUserId(req),
        });

        return res.status(201).json({
            success: true,
            message: "Candidate added successfully",
            data: candidate,
        });
    } catch (error) {
        console.error("Add candidate error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to add candidate",
        });
    }
};

const listCandidates = async (
    req: Request,
    res: Response,
    fixedJobId?: string
) => {
    const { job, stage, source, search } = req.query;

    const filter: Record<string, any> = { isDeleted: false };

    if (fixedJobId) {
        filter.job = new Types.ObjectId(fixedJobId);
    } else if (job) {
        if (!Types.ObjectId.isValid(String(job))) {
            return res.status(400).json({
                success: false,
                message: "Invalid job filter",
            });
        }

        filter.job = new Types.ObjectId(String(job));
    }

    if (stage) {
        if (!hasValue(CandidateStage, stage)) {
            return res.status(400).json({
                success: false,
                message: "Invalid stage filter",
            });
        }

        filter.stage = stage;
    }

    if (source) {
        if (!hasValue(CandidateSource, source)) {
            return res.status(400).json({
                success: false,
                message: "Invalid source filter",
            });
        }

        filter.source = source;
    }

    if (search) {
        const pattern = {
            $regex: escapeRegex(String(search)),
            $options: "i",
        };

        filter.$or = [
            { fullName: pattern },
            { email: pattern },
            { phone: pattern },
        ];
    }

    const { page, limit, skip } = getPagination(req.query);

    const [candidates, total] = await Promise.all([
        Candidate.find(filter)
            .select("-stageHistory -interviews -createdBy -updatedBy -isDeleted")
            .populate("job", "title department status")
            .sort({ appliedAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit),

        Candidate.countDocuments(filter),
    ]);

    return res.status(200).json({
        success: true,
        message: "Candidates fetched successfully",
        data: candidates,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    });
};

export const getAllCandidates = async (req: Request, res: Response) => {
    try {
        return await listCandidates(req, res);
    } catch (error) {
        console.error("Get candidates error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch candidates",
        });
    }
};

export const getJobCandidates = async (req: Request, res: Response) => {
    try {
        const jobId = req.params.jobId as string;

        if (!Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID",
            });
        }

        const job = await JobOpening.exists({
            _id: jobId,
            isDeleted: false,
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job opening not found",
            });
        }

        return await listCandidates(req, res, jobId);
    } catch (error) {
        console.error("Get job candidates error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch candidates",
        });
    }
};

export const getCandidateById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid candidate ID",
            });
        }

        const candidate = await Candidate.findOne({
            _id: id,
            isDeleted: false,
        })
            .select("-isDeleted")
            .populate(
                "job",
                "title department status location workMode employmentType"
            )
            .populate(
                "interviews.interviewers",
                "employeeId fullName role department"
            )
            .populate("stageHistory.changedBy", "email role");

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found",
            });
        }

        /*
         * Neighbours in the same job, in the same order as the list
         * (newest applicant first) - powers Previous / Next buttons.
         */
        const jobRef =
            (candidate.job as any)?._id ?? candidate.job;

        const [next, previous] = await Promise.all([
            Candidate.findOne({
                job: jobRef,
                isDeleted: false,
                $or: [
                    { appliedAt: { $lt: candidate.appliedAt } },
                    {
                        appliedAt: candidate.appliedAt,
                        _id: { $lt: candidate._id },
                    },
                ],
            })
                .sort({ appliedAt: -1, _id: -1 })
                .select("_id"),

            Candidate.findOne({
                job: jobRef,
                isDeleted: false,
                $or: [
                    { appliedAt: { $gt: candidate.appliedAt } },
                    {
                        appliedAt: candidate.appliedAt,
                        _id: { $gt: candidate._id },
                    },
                ],
            })
                .sort({ appliedAt: 1, _id: 1 })
                .select("_id"),
        ]);

        return res.status(200).json({
            success: true,
            message: "Candidate fetched successfully",
            data: {
                ...candidate.toObject(),
                previousCandidateId: previous?._id ?? null,
                nextCandidateId: next?._id ?? null,
            },
        });
    } catch (error) {
        console.error("Get candidate error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch candidate",
        });
    }
};

export const updateCandidate = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid candidate ID",
            });
        }

        const body = req.body ?? {};

        // A request that only replaces the resume has no other fields
        const onlyResume =
            Boolean(req.file) && Object.keys(body).length === 0;

        let data: Record<string, any> = {};

        if (!onlyResume) {
            const result = updateCandidateSchema.safeParse(body);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: result.error.flatten(),
                });
            }

            data = result.data;
        }

        const candidate = await Candidate.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found",
            });
        }

        if (data.email && data.email !== candidate.email) {
            const duplicate = await Candidate.findOne({
                job: candidate.job,
                email: data.email,
                isDeleted: false,
                _id: { $ne: candidate._id },
            });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message:
                        "A candidate with this email already exists for this job",
                });
            }
        }

        candidate.set({ ...data, updatedBy: currentUserId(req) });

        if (req.file) {
            candidate.resume = toResume(req.file);
        }

        await candidate.save();

        return res.status(200).json({
            success: true,
            message: "Candidate updated successfully",
            data: candidate,
        });
    } catch (error) {
        console.error("Update candidate error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update candidate",
        });
    }
};

export const updateCandidateStage = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid candidate ID",
            });
        }

        const result = updateCandidateStageSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const { stage, note } = result.data;

        const candidate = await Candidate.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found",
            });
        }

        if (candidate.stage === stage) {
            return res.status(400).json({
                success: false,
                message: `Candidate is already in the ${stage} stage`,
            });
        }

        candidate.stage = stage;

        candidate.stageHistory.push({
            stage,
            note,
            changedBy: currentUserId(req),
            changedAt: new Date(),
        });

        // A rejected candidate has no upcoming interviews
        if (stage === CandidateStage.REJECTED) {
            candidate.interviews.forEach((interview) => {
                if (interview.status === InterviewStatus.SCHEDULED) {
                    interview.status = InterviewStatus.CANCELLED;
                }
            });
        }

        candidate.updatedBy = currentUserId(req);

        await candidate.save();

        return res.status(200).json({
            success: true,
            message: `Candidate moved to ${stage}`,
            data: candidate,
        });
    } catch (error) {
        console.error("Update candidate stage error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update candidate stage",
        });
    }
};

export const deleteCandidate = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid candidate ID",
            });
        }

        const candidate = await Candidate.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { isDeleted: true, updatedBy: currentUserId(req) },
            { returnDocument: "after" }
        );

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Candidate deleted successfully",
        });
    } catch (error) {
        console.error("Delete candidate error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete candidate",
        });
    }
};

/* =============================== INTERVIEWS ============================== */

export const scheduleInterview = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid candidate ID",
            });
        }

        const result = scheduleInterviewSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const data = result.data;

        const candidate = await Candidate.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found",
            });
        }

        if (
            candidate.stage === CandidateStage.HIRED ||
            candidate.stage === CandidateStage.REJECTED
        ) {
            return res.status(400).json({
                success: false,
                message: `Cannot schedule an interview for a ${candidate.stage.toLowerCase()} candidate`,
            });
        }

        if (!(await interviewersExist(data.interviewers))) {
            return res.status(400).json({
                success: false,
                message: "One or more interviewers were not found",
            });
        }

        const activeInterviews = candidate.interviews.filter(
            (interview) => interview.status !== InterviewStatus.CANCELLED
        );

        const round =
            data.round ??
            Math.max(0, ...activeInterviews.map((i) => i.round)) + 1;

        if (activeInterviews.some((interview) => interview.round === round)) {
            return res.status(409).json({
                success: false,
                message: `Round ${round} is already scheduled for this candidate`,
            });
        }

        candidate.interviews.push({
            round,
            title: data.title ?? `Round ${round}`,
            scheduledAt: data.scheduledAt,
            durationMinutes: data.durationMinutes,
            mode: data.mode,
            location: data.location,
            interviewers: [...new Set(data.interviewers)].map(
                (interviewerId) => new Types.ObjectId(interviewerId)
            ),
            status: InterviewStatus.SCHEDULED,
            scheduledBy: currentUserId(req),
        });

        // First interview moves the candidate into the Interview stage
        if (
            candidate.stage === CandidateStage.APPLIED ||
            candidate.stage === CandidateStage.SCREENING
        ) {
            candidate.stage = CandidateStage.INTERVIEW;

            candidate.stageHistory.push({
                stage: CandidateStage.INTERVIEW,
                note: `Interview round ${round} scheduled`,
                changedBy: currentUserId(req),
                changedAt: new Date(),
            });
        }

        candidate.updatedBy = currentUserId(req);

        await candidate.save();

        return res.status(201).json({
            success: true,
            message: "Interview scheduled successfully",
            data: {
                interview:
                    candidate.interviews[candidate.interviews.length - 1],
                stage: candidate.stage,
            },
        });
    } catch (error) {
        console.error("Schedule interview error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to schedule interview",
        });
    }
};

export const updateInterview = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const interviewId = req.params.interviewId as string;

        if (
            !Types.ObjectId.isValid(id) ||
            !Types.ObjectId.isValid(interviewId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid candidate or interview ID",
            });
        }

        const result = updateInterviewSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const data = result.data;

        const candidate = await Candidate.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found",
            });
        }

        const interview = candidate.interviews.find(
            (item) => String(item._id) === interviewId
        );

        if (!interview) {
            return res.status(404).json({
                success: false,
                message: "Interview not found",
            });
        }

        if (interview.status === InterviewStatus.CANCELLED) {
            return res.status(400).json({
                success: false,
                message: "A cancelled interview cannot be changed",
            });
        }

        const finalStatus = data.status ?? interview.status;

        const hasOutcome =
            data.feedback !== undefined ||
            data.rating !== undefined ||
            data.result !== undefined;

        if (hasOutcome && finalStatus !== InterviewStatus.COMPLETED) {
            return res.status(400).json({
                success: false,
                message:
                    "Feedback, rating and result can only be saved for a completed interview",
            });
        }

        if (interview.status === InterviewStatus.COMPLETED) {
            const changesSchedule =
                data.title !== undefined ||
                data.scheduledAt !== undefined ||
                data.durationMinutes !== undefined ||
                data.mode !== undefined ||
                data.location !== undefined ||
                data.interviewers !== undefined ||
                (data.status !== undefined &&
                    data.status !== InterviewStatus.COMPLETED);

            if (changesSchedule) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A completed interview can only be updated with feedback, rating or result",
                });
            }
        }

        if (
            data.scheduledAt &&
            finalStatus === InterviewStatus.SCHEDULED &&
            data.scheduledAt.getTime() < Date.now() - 5 * 60 * 1000
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Interview must be scheduled for a future date and time",
            });
        }

        if (
            data.interviewers &&
            !(await interviewersExist(data.interviewers))
        ) {
            return res.status(400).json({
                success: false,
                message: "One or more interviewers were not found",
            });
        }

        if (data.title !== undefined) interview.title = data.title;
        if (data.scheduledAt !== undefined)
            interview.scheduledAt = data.scheduledAt;
        if (data.durationMinutes !== undefined)
            interview.durationMinutes = data.durationMinutes;
        if (data.mode !== undefined) interview.mode = data.mode;
        if (data.location !== undefined) interview.location = data.location;
        if (data.feedback !== undefined) interview.feedback = data.feedback;
        if (data.rating !== undefined) interview.rating = data.rating;
        if (data.result !== undefined) interview.result = data.result;

        if (data.interviewers !== undefined) {
            interview.interviewers = [...new Set(data.interviewers)].map(
                (interviewerId) => new Types.ObjectId(interviewerId)
            );
        }

        if (
            data.status === InterviewStatus.COMPLETED &&
            interview.status !== InterviewStatus.COMPLETED
        ) {
            interview.completedAt = new Date();
        }

        if (data.status !== undefined) interview.status = data.status;

        candidate.updatedBy = currentUserId(req);

        await candidate.save();

        return res.status(200).json({
            success: true,
            message: "Interview updated successfully",
            data: interview,
        });
    } catch (error) {
        console.error("Update interview error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update interview",
        });
    }
};

export const getInterviews = async (req: Request, res: Response) => {
    try {
        const { status, from, to, job, candidate } = req.query;

        const candidateMatch: Record<string, any> = {
            isDeleted: false,
        };

        if (job) {
            if (!Types.ObjectId.isValid(String(job))) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid job filter",
                });
            }

            candidateMatch.job = new Types.ObjectId(String(job));
        }

        if (candidate) {
            if (!Types.ObjectId.isValid(String(candidate))) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid candidate filter",
                });
            }

            candidateMatch._id = new Types.ObjectId(String(candidate));
        }

        const interviewMatch: Record<string, any> = {};

        if (status) {
            if (!hasValue(InterviewStatus, status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status filter",
                });
            }

            interviewMatch["interviews.status"] = status;
        }

        if (from || to) {
            const range: Record<string, Date> = {};

            if (from) {
                const fromDate = new Date(String(from));

                if (Number.isNaN(fromDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "from must be a valid date",
                    });
                }

                range.$gte = fromDate;
            }

            if (to) {
                const toDate = new Date(String(to));

                if (Number.isNaN(toDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "to must be a valid date",
                    });
                }

                // A plain date means "until the end of that day"
                if (/^\d{4}-\d{2}-\d{2}$/.test(String(to))) {
                    toDate.setUTCHours(23, 59, 59, 999);
                }

                range.$lte = toDate;
            }

            interviewMatch["interviews.scheduledAt"] = range;
        }

        const { page, limit, skip } = getPagination(req.query);

        const sortOrder = req.query.sort === "desc" ? -1 : 1;

        const pipeline: PipelineStage[] = [
            { $match: candidateMatch },
            { $unwind: "$interviews" },
            { $match: interviewMatch },
            { $sort: { "interviews.scheduledAt": sortOrder, _id: 1 } },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: JobOpening.collection.name,
                                localField: "job",
                                foreignField: "_id",
                                as: "jobDoc",
                            },
                        },
                        {
                            $unwind: {
                                path: "$jobDoc",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $project: {
                                _id: "$interviews._id",
                                candidateId: "$_id",
                                candidateName: "$fullName",
                                candidateEmail: "$email",
                                candidateStage: "$stage",
                                job: {
                                    _id: "$jobDoc._id",
                                    title: "$jobDoc.title",
                                    department: "$jobDoc.department",
                                },
                                round: "$interviews.round",
                                title: "$interviews.title",
                                scheduledAt: "$interviews.scheduledAt",
                                durationMinutes:
                                    "$interviews.durationMinutes",
                                mode: "$interviews.mode",
                                location: "$interviews.location",
                                interviewers: "$interviews.interviewers",
                                status: "$interviews.status",
                                result: "$interviews.result",
                                rating: "$interviews.rating",
                            },
                        },
                    ],
                    total: [{ $count: "count" }],
                },
            },
        ];

        const [aggregated] = await Candidate.aggregate(pipeline);

        const total: number = aggregated?.total?.[0]?.count ?? 0;

        return res.status(200).json({
            success: true,
            message: "Interviews fetched successfully",
            data: aggregated?.data ?? [],
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get interviews error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch interviews",
        });
    }
};
