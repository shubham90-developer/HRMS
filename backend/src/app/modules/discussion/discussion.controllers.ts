import { Request, Response } from "express";
import { Types } from "mongoose";
import { Discussion } from "./discussion.model";
import { DiscussionStatus } from "./discussion.interface";
import {
    createDiscussionSchema,
    updateDiscussionSchema,
    addCommentSchema,
} from "./discussion.validation";
import {
    isValidId,
    getPagination,
    buildPagination,
    escapeRegex,
    getDisplayName,
    isAdminRole,
} from "../../utils/common";

const notFound = (res: Response) =>
    res.status(404).json({ success: false, message: "Discussion not found" });

const invalidId = (res: Response) =>
    res.status(400).json({ success: false, message: "Invalid discussion ID" });

const isOwnerOrAdmin = (req: Request, ownerId: Types.ObjectId): boolean =>
    isAdminRole(req.user?.role) || String(ownerId) === req.user?.id;

export const createDiscussion = async (req: Request, res: Response) => {
    try {
        const result = createDiscussionSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const userId = new Types.ObjectId(req.user!.id);

        const discussion = await Discussion.create({
            ...result.data,
            attachment: req.file?.path ?? result.data.attachment,
            createdBy: userId,
            createdByName: await getDisplayName(req),
            participants: [userId],
        });

        return res.status(201).json({
            success: true,
            message: "Discussion created successfully",
            data: discussion,
        });
    } catch (error) {
        console.error("Create discussion error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create discussion",
        });
    }
};

export const getAllDiscussions = async (req: Request, res: Response) => {
    try {
        const { category, status, search } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filter: any = { isDeleted: false };

        if (category) filter.category = category;
        if (status) filter.status = status;

        if (search) {
            const regex = new RegExp(escapeRegex(String(search)), "i");
            filter.$or = [{ title: regex }, { description: regex }];
        }

        const [discussions, total] = await Promise.all([
            Discussion.find(filter)
                .select("-comments")
                .sort({ isPinned: -1, updatedAt: -1 })
                .skip(skip)
                .limit(limit),
            Discussion.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Discussions fetched successfully",
            data: discussions,
            pagination: buildPagination(total, page, limit),
        });
    } catch (error) {
        console.error("Get discussions error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch discussions",
        });
    }
};

export const getDiscussionById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return invalidId(res);

        const discussion = await Discussion.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!discussion) return notFound(res);

        return res.status(200).json({
            success: true,
            message: "Discussion fetched successfully",
            data: discussion,
        });
    } catch (error) {
        console.error("Get discussion error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch discussion",
        });
    }
};

export const updateDiscussion = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return invalidId(res);

        const result = updateDiscussionSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const discussion = await Discussion.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!discussion) return notFound(res);

        if (!isOwnerOrAdmin(req, discussion.createdBy)) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }

        // Only admins can pin discussions
        if (result.data.isPinned !== undefined && !isAdminRole(req.user?.role)) {
            return res.status(403).json({
                success: false,
                message: "Only admins can pin discussions",
            });
        }

        Object.assign(discussion, result.data, {
            ...(req.file ? { attachment: req.file.path } : {}),
        });

        await discussion.save();

        return res.status(200).json({
            success: true,
            message: "Discussion updated successfully",
            data: discussion,
        });
    } catch (error) {
        console.error("Update discussion error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update discussion",
        });
    }
};

export const deleteDiscussion = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return invalidId(res);

        const discussion = await Discussion.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!discussion) return notFound(res);

        if (!isOwnerOrAdmin(req, discussion.createdBy)) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }

        discussion.isDeleted = true;
        await discussion.save();

        return res.status(200).json({
            success: true,
            message: "Discussion deleted successfully",
        });
    } catch (error) {
        console.error("Delete discussion error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete discussion",
        });
    }
};

export const addComment = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return invalidId(res);

        const result = addCommentSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.flatten(),
            });
        }

        const discussion = await Discussion.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!discussion) return notFound(res);

        if (discussion.status === DiscussionStatus.CLOSED) {
            return res.status(400).json({
                success: false,
                message: "This discussion is closed",
            });
        }

        const userId = new Types.ObjectId(req.user!.id);

        discussion.comments.push({
            author: userId,
            authorName: await getDisplayName(req),
            message: result.data.message,
        });

        // commenting automatically makes the user a participant
        if (!discussion.participants.some((p) => String(p) === req.user!.id)) {
            discussion.participants.push(userId);
        }

        await discussion.save();

        return res.status(201).json({
            success: true,
            message: "Comment added successfully",
            data: discussion,
        });
    } catch (error) {
        console.error("Add comment error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to add comment",
        });
    }
};

export const deleteComment = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const commentId = req.params.commentId as string;

        if (!isValidId(id) || !isValidId(commentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid discussion or comment ID",
            });
        }

        const discussion = await Discussion.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!discussion) return notFound(res);

        const comment = discussion.comments.find(
            (c) => String(c._id) === commentId
        );

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found",
            });
        }

        if (!isOwnerOrAdmin(req, comment.author)) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }

        discussion.comments = discussion.comments.filter(
            (c) => String(c._id) !== commentId
        );

        await discussion.save();

        return res.status(200).json({
            success: true,
            message: "Comment deleted successfully",
        });
    } catch (error) {
        console.error("Delete comment error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete comment",
        });
    }
};

export const joinDiscussion = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return invalidId(res);

        const discussion = await Discussion.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { $addToSet: { participants: new Types.ObjectId(req.user!.id) } },
            { new: true }
        ).select("-comments");

        if (!discussion) return notFound(res);

        return res.status(200).json({
            success: true,
            message: "Joined discussion successfully",
            data: discussion,
        });
    } catch (error) {
        console.error("Join discussion error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to join discussion",
        });
    }
};

export const leaveDiscussion = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!isValidId(id)) return invalidId(res);

        const discussion = await Discussion.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { $pull: { participants: new Types.ObjectId(req.user!.id) } },
            { new: true }
        ).select("-comments");

        if (!discussion) return notFound(res);

        return res.status(200).json({
            success: true,
            message: "Left discussion successfully",
            data: discussion,
        });
    } catch (error) {
        console.error("Leave discussion error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to leave discussion",
        });
    }
};
