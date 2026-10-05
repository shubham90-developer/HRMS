import { Request, Response } from "express";
import { Types } from "mongoose";
import { Advertisement } from "./advertisement.model";
import {
    AdvertisementAudience,
    AdvertisementDisplayStatus,
    AdvertisementPriority,
    AdvertisementStatus,
    AdvertisementType,
} from "./advertisement.interface";
import {
    createAdvertisementSchema,
    updateAdvertisementSchema,
    updateAdvertisementStatusSchema,
} from "./advertisement.validation";
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

const toFile = (file: Express.Multer.File) => ({
    url: file.path,
    publicId: file.filename,
    originalName: file.originalname,
});

const getUploadedFiles = (req: Request) => {
    const files = req.files as
        | { [field: string]: Express.Multer.File[] }
        | undefined;

    return {
        image: files?.image?.[0],
        attachment: files?.attachment?.[0],
    };
};

const hasValue = <T extends string>(
    allowed: Record<string, T>,
    value: unknown
): value is T =>
    typeof value === "string" &&
    (Object.values(allowed) as string[]).includes(value);

/* Published, already started and not expired */
const liveCondition = (now: Date) => ({
    status: AdvertisementStatus.PUBLISHED,
    publishAt: { $lte: now },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
});

/* Everyone, or the employee's own department */
const audienceCondition = (department?: string) => {
    const options: Record<string, unknown>[] = [
        { audience: AdvertisementAudience.ALL },
    ];

    if (department) {
        options.push({
            audience: AdvertisementAudience.DEPARTMENTS,
            departments: {
                $regex: new RegExp(`^${escapeRegex(department)}$`, "i"),
            },
        });
    }

    return { $or: options };
};

const getEmployeeForUser = async (req: Request) => {
    if (!req.user?.employeeId) {
        return null;
    }

    return Employee.findOne({
        employeeId: req.user.employeeId,
    }).select("_id department");
};

const statusCondition = (
    status: AdvertisementDisplayStatus,
    now: Date
): Record<string, unknown> => {
    switch (status) {
        case AdvertisementDisplayStatus.DRAFT:
            return { status: AdvertisementStatus.DRAFT };

        case AdvertisementDisplayStatus.SCHEDULED:
            return {
                status: AdvertisementStatus.PUBLISHED,
                publishAt: { $gt: now },
            };

        case AdvertisementDisplayStatus.EXPIRED:
            return {
                status: AdvertisementStatus.PUBLISHED,
                publishAt: { $lte: now },
                expiresAt: { $lte: now },
            };

        default:
            return liveCondition(now);
    }
};

/* ============================== ADMIN SIDE ============================== */

export const createAdvertisement = async (
    req: Request,
    res: Response
) => {
    try {
        const result = createAdvertisementSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const data = result.data;
        const files = getUploadedFiles(req);

        if (files.image && !files.image.mimetype.startsWith("image/")) {
            return res.status(400).json({
                success: false,
                message: "image must be a jpg, png or webp file",
            });
        }

        const publishAt =
            data.status === AdvertisementStatus.PUBLISHED
                ? data.publishAt ?? new Date()
                : data.publishAt;

        const advertisement = await Advertisement.create({
            title: data.title,
            description: data.description,
            type: data.type,
            priority: data.priority,
            audience: data.audience,
            departments:
                data.audience === AdvertisementAudience.DEPARTMENTS
                    ? data.departments ?? []
                    : [],
            status: data.status,
            publishAt,
            expiresAt: data.expiresAt,
            image: files.image ? toFile(files.image) : undefined,
            attachment: files.attachment
                ? toFile(files.attachment)
                : undefined,
            createdBy: currentUserId(req),
        });

        return res.status(201).json({
            success: true,
            message: "Advertisement created successfully",
            data: advertisement,
        });
    } catch (error) {
        console.error("Create advertisement error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create advertisement",
        });
    }
};

export const getAdvertisements = async (req: Request, res: Response) => {
    try {
        const { status, type, priority, search } = req.query;

        const now = new Date();

        const conditions: Record<string, unknown>[] = [
            { isDeleted: false },
        ];

        if (status) {
            if (!hasValue(AdvertisementDisplayStatus, status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status filter",
                });
            }

            conditions.push(statusCondition(status, now));
        }

        if (type) {
            if (!hasValue(AdvertisementType, type)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid type filter",
                });
            }

            conditions.push({ type });
        }

        if (priority) {
            if (!hasValue(AdvertisementPriority, priority)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid priority filter",
                });
            }

            conditions.push({ priority });
        }

        if (search) {
            const pattern = {
                $regex: escapeRegex(String(search)),
                $options: "i",
            };

            conditions.push({
                $or: [{ title: pattern }, { description: pattern }],
            });
        }

        const filter = { $and: conditions };

        const { page, limit, skip } = getPagination(req.query);

        const [advertisements, total] = await Promise.all([
            Advertisement.find(filter)
                .select("-isDeleted")
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit),

            Advertisement.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Advertisements fetched successfully",
            data: advertisements,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get advertisements error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch advertisements",
        });
    }
};

export const updateAdvertisement = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid advertisement ID",
            });
        }

        const files = getUploadedFiles(req);
        const body = req.body ?? {};

        // A request that only replaces files has no other fields
        const onlyFiles =
            Boolean(files.image || files.attachment) &&
            Object.keys(body).length === 0;

        let data: ReturnType<
            typeof updateAdvertisementSchema.parse
        > = {};

        if (!onlyFiles) {
            const result = updateAdvertisementSchema.safeParse(body);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: result.error.flatten(),
                });
            }

            data = result.data;
        }

        if (files.image && !files.image.mimetype.startsWith("image/")) {
            return res.status(400).json({
                success: false,
                message: "image must be a jpg, png or webp file",
            });
        }

        const advertisement = await Advertisement.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!advertisement) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found",
            });
        }

        /*
         * Audience: sending departments without an audience means
         * "restrict to these departments".
         */
        let audience = data.audience ?? advertisement.audience;

        if (
            data.audience === undefined &&
            (data.departments?.length ?? 0) > 0
        ) {
            audience = AdvertisementAudience.DEPARTMENTS;
        }

        let departments = data.departments ?? advertisement.departments;

        if (audience === AdvertisementAudience.ALL) {
            departments = [];
        } else if (departments.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Select at least one department for a department audience",
            });
        }

        // Dates must stay in order after the update
        const nextPublishAt = data.publishAt ?? advertisement.publishAt;

        const nextExpiresAt =
            data.expiresAt === undefined
                ? advertisement.expiresAt
                : data.expiresAt;

        if (
            nextExpiresAt &&
            nextExpiresAt.getTime() <=
                (nextPublishAt ?? new Date()).getTime()
        ) {
            return res.status(400).json({
                success: false,
                message: "Expiry date must be after the publish date",
            });
        }

        if (data.title !== undefined) advertisement.title = data.title;
        if (data.description !== undefined)
            advertisement.description = data.description;
        if (data.type !== undefined) advertisement.type = data.type;
        if (data.priority !== undefined)
            advertisement.priority = data.priority;

        advertisement.audience = audience;
        advertisement.departments = departments;

        if (data.publishAt !== undefined)
            advertisement.publishAt = data.publishAt;

        if (data.expiresAt !== undefined)
            advertisement.expiresAt = data.expiresAt;

        if (files.image) {
            advertisement.image = toFile(files.image);
        } else if (data.removeImage) {
            advertisement.image = undefined;
        }

        if (files.attachment) {
            advertisement.attachment = toFile(files.attachment);
        } else if (data.removeAttachment) {
            advertisement.attachment = undefined;
        }

        advertisement.updatedBy = currentUserId(req);

        await advertisement.save();

        return res.status(200).json({
            success: true,
            message: "Advertisement updated successfully",
            data: advertisement,
        });
    } catch (error) {
        console.error("Update advertisement error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update advertisement",
        });
    }
};

export const updateAdvertisementStatus = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid advertisement ID",
            });
        }

        const result = updateAdvertisementStatusSchema.safeParse(
            req.body
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const { status, publishAt } = result.data;

        const advertisement = await Advertisement.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!advertisement) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found",
            });
        }

        if (status === AdvertisementStatus.PUBLISHED) {
            const wasDraft =
                advertisement.status === AdvertisementStatus.DRAFT;

            const nextPublishAt =
                publishAt ??
                (wasDraft || !advertisement.publishAt
                    ? new Date()
                    : advertisement.publishAt);

            if (
                advertisement.expiresAt &&
                advertisement.expiresAt.getTime() <=
                    nextPublishAt.getTime()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "The expiry date is already over. Update the expiry date before publishing",
                });
            }

            advertisement.publishAt = nextPublishAt;
        }

        advertisement.status = status;
        advertisement.updatedBy = currentUserId(req);

        await advertisement.save();

        return res.status(200).json({
            success: true,
            message:
                status === AdvertisementStatus.PUBLISHED
                    ? "Advertisement published successfully"
                    : "Advertisement moved to drafts",
            data: advertisement,
        });
    } catch (error) {
        console.error("Update advertisement status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update advertisement status",
        });
    }
};

export const deleteAdvertisement = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid advertisement ID",
            });
        }

        const advertisement = await Advertisement.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { isDeleted: true, updatedBy: currentUserId(req) },
            { returnDocument: "after" }
        );

        if (!advertisement) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Advertisement deleted successfully",
        });
    } catch (error) {
        console.error("Delete advertisement error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete advertisement",
        });
    }
};

/* ============================ EMPLOYEE SIDE ============================= */

export const getActiveAdvertisements = async (
    req: Request,
    res: Response
) => {
    try {
        const { type, priority, search } = req.query;

        const now = new Date();

        const conditions: Record<string, unknown>[] = [
            { isDeleted: false },
            liveCondition(now),
        ];

        // Employees only see what is meant for them
        if (req.user?.role === "employee") {
            if (!req.user.employeeId) {
                return res.status(400).json({
                    success: false,
                    message: "Employee information not found",
                });
            }

            const employee = await getEmployeeForUser(req);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found",
                });
            }

            conditions.push(audienceCondition(employee.department));
        }

        if (type) {
            if (!hasValue(AdvertisementType, type)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid type filter",
                });
            }

            conditions.push({ type });
        }

        if (priority) {
            if (!hasValue(AdvertisementPriority, priority)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid priority filter",
                });
            }

            conditions.push({ priority });
        }

        if (search) {
            const pattern = {
                $regex: escapeRegex(String(search)),
                $options: "i",
            };

            conditions.push({
                $or: [{ title: pattern }, { description: pattern }],
            });
        }

        const filter = { $and: conditions };

        const { page, limit, skip } = getPagination(req.query);

        const [advertisements, total] = await Promise.all([
            Advertisement.find(filter)
                .select("-createdBy -updatedBy -isDeleted")
                .sort({ publishAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit),

            Advertisement.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Advertisements fetched successfully",
            data: advertisements,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get active advertisements error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch advertisements",
        });
    }
};

export const getAdvertisementById = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid advertisement ID",
            });
        }

        // Admins can open any advertisement, drafts included
        if (req.user?.role !== "employee") {
            const advertisement = await Advertisement.findOne({
                _id: id,
                isDeleted: false,
            })
                .select("-isDeleted")
                .populate("createdBy", "email role");

            if (!advertisement) {
                return res.status(404).json({
                    success: false,
                    message: "Advertisement not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Advertisement fetched successfully",
                data: advertisement,
            });
        }

        if (!req.user.employeeId) {
            return res.status(400).json({
                success: false,
                message: "Employee information not found",
            });
        }

        const employee = await getEmployeeForUser(req);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        const advertisement = await Advertisement.findOne({
            _id: id,
            isDeleted: false,
            $and: [
                liveCondition(new Date()),
                audienceCondition(employee.department),
            ],
        }).select("-createdBy -updatedBy -isDeleted");

        if (!advertisement) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found",
            });
        }

        // Count each employee only once
        const viewed = await Advertisement.updateOne(
            { _id: advertisement._id, viewedBy: { $ne: employee._id } },
            { $addToSet: { viewedBy: employee._id }, $inc: { views: 1 } }
        );

        advertisement.views += viewed.modifiedCount;

        return res.status(200).json({
            success: true,
            message: "Advertisement fetched successfully",
            data: advertisement,
        });
    } catch (error) {
        console.error("Get advertisement error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch advertisement",
        });
    }
};
