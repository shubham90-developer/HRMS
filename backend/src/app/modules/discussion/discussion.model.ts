import { Schema, model } from "mongoose";
import {
    IDiscussion,
    IDiscussionComment,
    DiscussionCategory,
    DiscussionStatus,
} from "./discussion.interface";

const commentSchema = new Schema<IDiscussionComment>(
    {
        author: { type: Schema.Types.ObjectId, ref: "Auth", required: true },
        authorName: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

const discussionSchema = new Schema<IDiscussion>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },

        category: {
            type: String,
            enum: Object.values(DiscussionCategory),
            default: DiscussionCategory.GENERAL,
            index: true,
        },

        status: {
            type: String,
            enum: Object.values(DiscussionStatus),
            default: DiscussionStatus.OPEN,
            index: true,
        },

        isPinned: { type: Boolean, default: false },
        attachment: { type: String, trim: true },

        createdBy: { type: Schema.Types.ObjectId, ref: "Auth", required: true },
        createdByName: { type: String, required: true, trim: true },

        participants: [{ type: Schema.Types.ObjectId, ref: "Auth" }],
        comments: [commentSchema],

        isDeleted: { type: Boolean, default: false, index: true },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

discussionSchema.virtual("participantsCount").get(function () {
    return this.participants?.length ?? 0;
});

discussionSchema.virtual("commentsCount").get(function () {
    return this.comments?.length ?? 0;
});

discussionSchema.index({ isPinned: -1, updatedAt: -1 });

export const Discussion = model<IDiscussion>("Discussion", discussionSchema);
