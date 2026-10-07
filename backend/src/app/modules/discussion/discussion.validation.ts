import { z } from "zod";
import { DiscussionCategory, DiscussionStatus } from "./discussion.interface";

const category = z.enum([
    DiscussionCategory.GENERAL,
    DiscussionCategory.HR,
    DiscussionCategory.FINANCE,
    DiscussionCategory.IT,
    DiscussionCategory.ANNOUNCEMENT,
]);

export const createDiscussionSchema = z.object({
    title: z.string().min(3).max(150),
    description: z.string().min(3).max(2000),
    category: category.optional(),
    attachment: z.string().optional(),
});

export const updateDiscussionSchema = z.object({
    title: z.string().min(3).max(150).optional(),
    description: z.string().min(3).max(2000).optional(),
    category: category.optional(),
    attachment: z.string().optional(),
    status: z
        .enum([DiscussionStatus.OPEN, DiscussionStatus.CLOSED])
        .optional(),
    isPinned: z
        .preprocess(
            (v) => (v === "true" ? true : v === "false" ? false : v),
            z.boolean()
        )
        .optional(),
});

export const addCommentSchema = z.object({
    message: z.string().min(1).max(1000),
});
