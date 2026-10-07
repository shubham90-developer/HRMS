import { Types } from "mongoose";

export enum DiscussionCategory {
    GENERAL = "General",
    HR = "HR",
    FINANCE = "Finance",
    IT = "IT",
    ANNOUNCEMENT = "Announcement",
}

export enum DiscussionStatus {
    OPEN = "Open",
    CLOSED = "Closed",
}

export interface IDiscussionComment {
    _id?: Types.ObjectId;
    author: Types.ObjectId;
    authorName: string;
    message: string;
    createdAt?: Date;
}

export interface IDiscussion {
    title: string;
    description: string;
    category: DiscussionCategory;
    status: DiscussionStatus;
    isPinned: boolean;
    attachment?: string;

    createdBy: Types.ObjectId;
    createdByName: string;

    participants: Types.ObjectId[];
    comments: IDiscussionComment[];

    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
