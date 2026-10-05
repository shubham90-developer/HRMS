import { Request, Response } from "express";
import { PopulateOptions, Types } from "mongoose";
import { EmployeeDocument } from "./employeeDocument.model";
import {
    DOCUMENT_TYPES,
    DocumentCategory,
    DocumentExpiryStatus,
    DocumentStatus,
    EXPIRY_ALERT_DAYS,
    SINGLE_INSTANCE_CATEGORIES,
} from "./employeeDocument.interface";
import {
    createDocumentSchema,
    updateDocumentSchema,
    rejectDocumentSchema,
    resolveDocumentType,
} from "./employeeDocument.validation";
import { Employee } from "../employee/employee.model";

/* ------------------------------- Helpers -------------------------------- */

const DAY_MS = 24 * 60 * 60 * 1000;

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

const isEmployeeRole = (req: Request): boolean =>
    req.user?.role === "employee";

const startOfTodayUtc = (): Date => {
    const now = new Date();

    return new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        )
    );
};

const toFile = (file: Express.Multer.File) => ({
    url: file.path,
    publicId: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
});

const hasValue = <T extends string>(
    allowed: Record<string, T>,
    value: unknown
): value is T =>
    typeof value === "string" &&
    (Object.values(allowed) as string[]).includes(value);

const EMPLOYEE_FIELDS = "employeeId fullName role department";

const adminPopulate: PopulateOptions[] = [
    { path: "employee", select: EMPLOYEE_FIELDS },
    { path: "verifiedBy", select: "email role" },
    { path: "rejectedBy", select: "email role" },
    { path: "uploadedBy", select: "email role employeeId" },
];

/* Employees never see which admin verified or rejected a document */
const employeePopulate: PopulateOptions[] = [
    { path: "employee", select: EMPLOYEE_FIELDS },
];

const populateFor = (req: Request): PopulateOptions[] =>
    isEmployeeRole(req) ? employeePopulate : adminPopulate;

/*
 * Fields that only make sense for HR. They are removed from every
 * response an employee receives.
 */
const EMPLOYEE_HIDDEN_FIELDS = [
    "verifiedBy",
    "rejectedBy",
    "uploadedBy",
    "updatedBy",
    "isDeleted",
    "__v",
];

const present = (
    req: Request,
    document: { toJSON: () => unknown }
): Record<string, any> => {
    const output = document.toJSON() as Record<string, any>;

    if (isEmployeeRole(req)) {
        for (const field of EMPLOYEE_HIDDEN_FIELDS) {
            delete output[field];
        }
    }

    return output;
};

const getOwnEmployee = async (req: Request) => {
    if (!req.user?.employeeId) {
        return null;
    }

    return Employee.findOne({
        employeeId: req.user.employeeId,
    }).select("_id");
};

/*
 * Mongo condition for the expiry filter.
 *   expired  - expiry date is before today
 *   expiring - expires within the next EXPIRY_ALERT_DAYS days (today included)
 *   valid    - expires later than that
 *   none     - no expiry date
 */
const expiryCondition = (
    expiry: DocumentExpiryStatus
): Record<string, unknown> => {
    const today = startOfTodayUtc();
    const alertLimit = new Date(
        today.getTime() + EXPIRY_ALERT_DAYS * DAY_MS
    );

    switch (expiry) {
        case DocumentExpiryStatus.EXPIRED:
            return { expiryDate: { $lt: today } };

        case DocumentExpiryStatus.EXPIRING_SOON:
            return { expiryDate: { $gte: today, $lte: alertLimit } };

        case DocumentExpiryStatus.VALID:
            return { expiryDate: { $gt: alertLimit } };

        default:
            return { expiryDate: null };
    }
};

/* Query-string spellings accepted for the expiry filter */
const EXPIRY_QUERY_VALUES: Record<string, DocumentExpiryStatus> = {
    expired: DocumentExpiryStatus.EXPIRED,
    expiring: DocumentExpiryStatus.EXPIRING_SOON,
    valid: DocumentExpiryStatus.VALID,
    none: DocumentExpiryStatus.NO_EXPIRY,
};

/*
 * Filters shared by the admin list and "my documents".
 * Returns an error message when a value is not recognised.
 */
const applyCommonFilters = (
    query: Request["query"],
    filter: Record<string, any>
): string | null => {
    const { category, documentType, status, expiry } = query;

    if (category) {
        if (!hasValue(DocumentCategory, category)) {
            return "Invalid category";
        }

        filter.category = category;
    }

    if (documentType) {
        filter.documentType = {
            $regex: new RegExp(
                `^${escapeRegex(String(documentType).trim())}$`,
                "i"
            ),
        };
    }

    if (status) {
        if (!hasValue(DocumentStatus, status)) {
            return "Invalid status";
        }

        filter.status = status;
    }

    if (expiry) {
        const mapped = EXPIRY_QUERY_VALUES[String(expiry)];

        if (!mapped) {
            return "expiry must be one of: expired, expiring, valid, none";
        }

        Object.assign(filter, expiryCondition(mapped));
    }

    return null;
};

/*
 * Identity and resume documents are limited to one pending or verified
 * document per type. Returns the clashing document, if any.
 */
const findSingleInstanceClash = (
    employee: Types.ObjectId | string,
    category: DocumentCategory,
    documentType: string,
    excludeId?: Types.ObjectId | string
) => {
    if (!SINGLE_INSTANCE_CATEGORIES.includes(category)) {
        return null;
    }

    const filter: Record<string, any> = {
        employee,
        category,
        documentType,
        isDeleted: false,
        status: {
            $in: [DocumentStatus.PENDING, DocumentStatus.VERIFIED],
        },
    };

    if (excludeId) {
        filter._id = { $ne: excludeId };
    }

    return EmployeeDocument.findOne(filter).collation({
        locale: "en",
        strength: 2,
    });
};

const clashMessage = (documentType: string) =>
    `A pending or verified ${documentType} already exists for this employee. Delete it or wait for it to be rejected before uploading another one`;

/* ================================ CATALOGUE ============================== */

export const getDocumentTypes = async (
    req: Request,
    res: Response
) => {
    try {
        const data = Object.values(DocumentCategory).map(
            (category) => ({
                category,
                documentTypes: DOCUMENT_TYPES[category],
                acceptsCustomType: category === DocumentCategory.OTHER,
                singleInstance:
                    SINGLE_INSTANCE_CATEGORIES.includes(category),
            })
        );

        return res.status(200).json({
            success: true,
            message: "Document categories fetched successfully",
            data,
            expiryAlertDays: EXPIRY_ALERT_DAYS,
        });
    } catch (error) {
        console.error("Get document types error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch document categories",
        });
    }
};

/* ================================ UPLOAD ================================= */

export const createDocument = async (
    req: Request,
    res: Response
) => {
    try {
        const result = createDocumentSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Document file is required",
            });
        }

        const data = result.data;

        let employeeId: Types.ObjectId | string;

        if (isEmployeeRole(req)) {
            /* Employees can only upload their own documents */
            const me = await getOwnEmployee(req);

            if (!me) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found",
                });
            }

            if (data.employee && data.employee !== String(me._id)) {
                return res.status(403).json({
                    success: false,
                    message: "You can only upload documents for yourself",
                });
            }

            employeeId = me._id;
        } else {
            if (!data.employee) {
                return res.status(400).json({
                    success: false,
                    message: "Employee is required",
                });
            }

            const employee = await Employee.findById(data.employee).select(
                "_id"
            );

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found",
                });
            }

            employeeId = employee._id;
        }

        const documentType = resolveDocumentType(
            data.category,
            data.documentType
        )!;

        const clash = await findSingleInstanceClash(
            employeeId,
            data.category,
            documentType
        );

        if (clash) {
            return res.status(409).json({
                success: false,
                message: clashMessage(documentType),
            });
        }

        const document = await EmployeeDocument.create({
            employee: employeeId,
            category: data.category,
            documentType,
            issuedDate: data.issuedDate,
            expiryDate: data.expiryDate,
            remarks: data.remarks,
            file: toFile(req.file),
            status: DocumentStatus.PENDING,
            uploadedBy: currentUserId(req),
            updatedBy: currentUserId(req),
        });

        const populated = await EmployeeDocument.findById(
            document._id
        ).populate(populateFor(req));

        return res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            data: populated ? present(req, populated) : populated,
        });
    } catch (error) {
        console.error("Create employee document error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to upload document",
        });
    }
};

/* ================================== READ ================================= */

export const getAllDocuments = async (
    req: Request,
    res: Response
) => {
    try {
        const { employee, search } = req.query;

        const filter: Record<string, any> = { isDeleted: false };

        const filterError = applyCommonFilters(req.query, filter);

        if (filterError) {
            return res.status(400).json({
                success: false,
                message: filterError,
            });
        }

        if (employee) {
            if (!Types.ObjectId.isValid(String(employee))) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid employee ID",
                });
            }

            filter.employee = String(employee);
        }

        if (search) {
            const pattern = {
                $regex: escapeRegex(String(search).trim()),
                $options: "i",
            };

            const matches = await Employee.find({
                $or: [{ fullName: pattern }, { employeeId: pattern }],
            })
                .select("_id")
                .limit(500);

            const ids = matches.map((item) => item._id);

            /* Combine with an explicit employee filter instead of replacing it */
            filter.employee = filter.employee
                ? { $in: ids.filter((id) => String(id) === filter.employee) }
                : { $in: ids };
        }

        const { page, limit, skip } = getPagination(req.query);

        /* Documents closest to expiring come first when filtering by expiry */
        const sort: Record<string, 1 | -1> = req.query.expiry
            ? { expiryDate: 1, createdAt: -1 }
            : { createdAt: -1 };

        const [documents, total] = await Promise.all([
            EmployeeDocument.find(filter)
                .populate(adminPopulate)
                .sort(sort)
                .skip(skip)
                .limit(limit),

            EmployeeDocument.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Documents fetched successfully",
            data: documents,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Get all employee documents error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch documents",
        });
    }
};

export const getMyDocuments = async (
    req: Request,
    res: Response
) => {
    try {
        if (!req.user?.employeeId) {
            return res.status(400).json({
                success: false,
                message: "Employee information not found",
            });
        }

        const me = await getOwnEmployee(req);

        if (!me) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        const filter: Record<string, any> = {
            employee: me._id,
            isDeleted: false,
        };

        const filterError = applyCommonFilters(req.query, filter);

        if (filterError) {
            return res.status(400).json({
                success: false,
                message: filterError,
            });
        }

        const documents = await EmployeeDocument.find(filter)
            .populate(employeePopulate)
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Your documents fetched successfully",
            data: documents.map((item) => present(req, item)),
        });
    } catch (error) {
        console.error("Get my documents error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch your documents",
        });
    }
};

export const getDocumentSummary = async (
    req: Request,
    res: Response
) => {
    try {
        const base = { isDeleted: false };

        /* Rejected documents are ignored for the expiry counters */
        const notRejected = {
            ...base,
            status: { $ne: DocumentStatus.REJECTED },
        };

        const [total, pending, verified, rejected, expiringSoon, expired] =
            await Promise.all([
                EmployeeDocument.countDocuments(base),

                EmployeeDocument.countDocuments({
                    ...base,
                    status: DocumentStatus.PENDING,
                }),

                EmployeeDocument.countDocuments({
                    ...base,
                    status: DocumentStatus.VERIFIED,
                }),

                EmployeeDocument.countDocuments({
                    ...base,
                    status: DocumentStatus.REJECTED,
                }),

                EmployeeDocument.countDocuments({
                    ...notRejected,
                    ...expiryCondition(DocumentExpiryStatus.EXPIRING_SOON),
                }),

                EmployeeDocument.countDocuments({
                    ...notRejected,
                    ...expiryCondition(DocumentExpiryStatus.EXPIRED),
                }),
            ]);

        return res.status(200).json({
            success: true,
            message: "Document summary fetched successfully",
            data: {
                total,
                pending,
                verified,
                rejected,
                expiringSoon,
                expired,
            },
        });
    } catch (error) {
        console.error("Get document summary error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch document summary",
        });
    }
};

export const getDocumentById = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
        }

        const document = await EmployeeDocument.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        if (isEmployeeRole(req)) {
            const me = await getOwnEmployee(req);

            if (!me || String(document.employee) !== String(me._id)) {
                return res.status(403).json({
                    success: false,
                    message: "You can only view your own documents",
                });
            }
        }

        await document.populate(populateFor(req));

        return res.status(200).json({
            success: true,
            message: "Document fetched successfully",
            data: present(req, document),
        });
    } catch (error) {
        console.error("Get employee document error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch document",
        });
    }
};

/* ================================= UPDATE ================================ */

export const updateDocument = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
        }

        const hasBody = Object.keys(req.body ?? {}).length > 0;

        if (!hasBody && !req.file) {
            return res.status(400).json({
                success: false,
                message:
                    "At least one field or a new file is required to update",
            });
        }

        const result = hasBody
            ? updateDocumentSchema.safeParse(req.body)
            : { success: true as const, data: {} as Record<string, any> };

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const data = result.data as {
            category?: DocumentCategory;
            documentType?: string;
            issuedDate?: Date | null;
            expiryDate?: Date | null;
            remarks?: string;
        };

        const document = await EmployeeDocument.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        if (isEmployeeRole(req)) {
            const me = await getOwnEmployee(req);

            if (!me || String(document.employee) !== String(me._id)) {
                return res.status(403).json({
                    success: false,
                    message: "You can only update your own documents",
                });
            }

            if (document.status === DocumentStatus.VERIFIED) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Verified documents cannot be changed. Please contact HR",
                });
            }
        }

        const nextCategory = data.category ?? document.category;

        let nextType = document.documentType;

        if (data.category !== undefined || data.documentType !== undefined) {
            const resolved = resolveDocumentType(
                nextCategory,
                data.documentType ?? document.documentType
            );

            if (resolved === null) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Document type does not belong to the selected category",
                });
            }

            nextType = resolved;
        }

        const nextIssued =
            data.issuedDate !== undefined
                ? data.issuedDate
                : document.issuedDate;

        const nextExpiry =
            data.expiryDate !== undefined
                ? data.expiryDate
                : document.expiryDate;

        if (nextIssued && nextExpiry && nextExpiry <= nextIssued) {
            return res.status(400).json({
                success: false,
                message: "Expiry date must be after the issued date",
            });
        }

        const changesContent =
            !!req.file ||
            nextCategory !== document.category ||
            nextType !== document.documentType ||
            data.issuedDate !== undefined ||
            data.expiryDate !== undefined;

        /*
         * Any change to the file, type or dates has to be verified again.
         * A remarks-only change keeps the current status.
         */
        const willBePending = changesContent;
        const resultingStatus = willBePending
            ? DocumentStatus.PENDING
            : document.status;

        if (resultingStatus !== DocumentStatus.REJECTED) {
            const clash = await findSingleInstanceClash(
                document.employee,
                nextCategory,
                nextType,
                document._id
            );

            if (clash) {
                return res.status(409).json({
                    success: false,
                    message: clashMessage(nextType),
                });
            }
        }

        document.category = nextCategory;
        document.documentType = nextType;
        document.issuedDate = nextIssued;
        document.expiryDate = nextExpiry;

        if (data.remarks !== undefined) {
            document.remarks = data.remarks;
        }

        if (req.file) {
            document.file = toFile(req.file);
        }

        if (willBePending) {
            document.status = DocumentStatus.PENDING;
            document.verifiedBy = undefined;
            document.verifiedAt = undefined;
            document.rejectedBy = undefined;
            document.rejectedAt = undefined;
            document.rejectionReason = undefined;
        }

        document.updatedBy = currentUserId(req);

        await document.save();

        await document.populate(populateFor(req));

        return res.status(200).json({
            success: true,
            message: "Document updated successfully",
            data: present(req, document),
        });
    } catch (error) {
        console.error("Update employee document error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update document",
        });
    }
};

/* ============================== VERIFICATION ============================= */

export const verifyDocument = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
        }

        const document = await EmployeeDocument.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        if (document.status !== DocumentStatus.PENDING) {
            return res.status(409).json({
                success: false,
                message: `Only pending documents can be verified. This document is already ${document.status.toLowerCase()}`,
            });
        }

        document.status = DocumentStatus.VERIFIED;
        document.verifiedBy = currentUserId(req);
        document.verifiedAt = new Date();
        document.rejectedBy = undefined;
        document.rejectedAt = undefined;
        document.rejectionReason = undefined;
        document.updatedBy = currentUserId(req);

        await document.save();

        await document.populate(adminPopulate);

        return res.status(200).json({
            success: true,
            message: "Document verified successfully",
            data: document,
        });
    } catch (error) {
        console.error("Verify employee document error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to verify document",
        });
    }
};

export const rejectDocument = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
        }

        const result = rejectDocumentSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const document = await EmployeeDocument.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        if (document.status !== DocumentStatus.PENDING) {
            return res.status(409).json({
                success: false,
                message: `Only pending documents can be rejected. This document is already ${document.status.toLowerCase()}`,
            });
        }

        document.status = DocumentStatus.REJECTED;
        document.rejectionReason = result.data.rejectionReason;
        document.rejectedBy = currentUserId(req);
        document.rejectedAt = new Date();
        document.verifiedBy = undefined;
        document.verifiedAt = undefined;
        document.updatedBy = currentUserId(req);

        await document.save();

        await document.populate(adminPopulate);

        return res.status(200).json({
            success: true,
            message: "Document rejected successfully",
            data: document,
        });
    } catch (error) {
        console.error("Reject employee document error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to reject document",
        });
    }
};

/* ================================= DELETE ================================ */

export const deleteDocument = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID",
            });
        }

        const document = await EmployeeDocument.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        if (isEmployeeRole(req)) {
            const me = await getOwnEmployee(req);

            if (!me || String(document.employee) !== String(me._id)) {
                return res.status(403).json({
                    success: false,
                    message: "You can only delete your own documents",
                });
            }

            if (document.status === DocumentStatus.VERIFIED) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Verified documents cannot be deleted. Please contact HR",
                });
            }
        }

        document.isDeleted = true;
        document.updatedBy = currentUserId(req);

        await document.save();

        return res.status(200).json({
            success: true,
            message: "Document deleted successfully",
        });
    } catch (error) {
        console.error("Delete employee document error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete document",
        });
    }
};
