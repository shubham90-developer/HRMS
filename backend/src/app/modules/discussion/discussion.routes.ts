import { Router } from "express";
import {
    createDiscussion,
    getAllDiscussions,
    getDiscussionById,
    updateDiscussion,
    deleteDiscussion,
    addComment,
    deleteComment,
    joinDiscussion,
    leaveDiscussion,
} from "./discussion.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";
import upload from "../../config/cloudinary";

const router = Router();
const allRoles = authorizeRoles("employee", "admin", "super-admin");

/**
 * @swagger
 * tags:
 *   name: Discussion
 *   description: Team discussions and updates. Every logged-in user can start and join discussions.
 *
 * components:
 *   schemas:
 *     DiscussionComment:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         author: { type: string }
 *         authorName: { type: string, example: "Aditi Rao" }
 *         message: { type: string, example: "Please share the updated sheet." }
 *         createdAt: { type: string, format: date-time }
 *     Discussion:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "68d8f1a4b3c9e123456789ab" }
 *         title: { type: string, example: "Finance Team" }
 *         description: { type: string, example: "Quarterly closing discussion" }
 *         category: { type: string, enum: [General, HR, Finance, IT, Announcement] }
 *         status: { type: string, enum: [Open, Closed] }
 *         isPinned: { type: boolean }
 *         attachment: { type: string }
 *         createdByName: { type: string }
 *         participantsCount: { type: integer, example: 13 }
 *         commentsCount: { type: integer, example: 4 }
 *         comments:
 *           type: array
 *           items: { $ref: '#/components/schemas/DiscussionComment' }
 *         createdAt: { type: string, format: date-time }
 */

/**
 * @swagger
 * /v1/api/discussion:
 *   post:
 *     summary: Start a discussion
 *     description: Creates a discussion. The creator is added as the first participant. Optional attachment (jpg, png, webp, pdf).
 *     tags: [Discussion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title: { type: string, example: "Finance Team" }
 *               description: { type: string, example: "Quarterly closing discussion" }
 *               category: { type: string, enum: [General, HR, Finance, IT, Announcement] }
 *               attachment: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Discussion created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/", authenticate, allRoles, upload.single("attachment"), createDiscussion);

/**
 * @swagger
 * /v1/api/discussion:
 *   get:
 *     summary: Get all discussions
 *     description: Lists discussions (pinned first) without comments. Supports filters and pagination.
 *     tags: [Discussion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [General, HR, Finance, IT, Announcement] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Open, Closed] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Discussions fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/", authenticate, allRoles, getAllDiscussions);

/**
 * @swagger
 * /v1/api/discussion/{id}:
 *   get:
 *     summary: Get discussion with comments
 *     tags: [Discussion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Discussion fetched successfully
 *       400:
 *         description: Invalid discussion ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Discussion not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", authenticate, allRoles, getDiscussionById);

/**
 * @swagger
 * /v1/api/discussion/{id}:
 *   patch:
 *     summary: Update discussion
 *     description: The creator or an admin can edit or close a discussion. Only admins can pin one.
 *     tags: [Discussion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               category: { type: string, enum: [General, HR, Finance, IT, Announcement] }
 *               status: { type: string, enum: [Open, Closed] }
 *               isPinned: { type: boolean }
 *               attachment: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Discussion updated successfully
 *       400:
 *         description: Validation failed or invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Discussion not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id", authenticate, allRoles, upload.single("attachment"), updateDiscussion);

/**
 * @swagger
 * /v1/api/discussion/{id}:
 *   delete:
 *     summary: Delete discussion
 *     description: Soft-deletes a discussion. Allowed for the creator or an admin.
 *     tags: [Discussion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Discussion deleted successfully
 *       400:
 *         description: Invalid discussion ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Discussion not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", authenticate, allRoles, deleteDiscussion);

/**
 * @swagger
 * /v1/api/discussion/{id}/comments:
 *   post:
 *     summary: Add comment
 *     description: Adds a comment and makes the user a participant. Closed discussions do not accept comments.
 *     tags: [Discussion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, example: "Please share the updated sheet." }
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       400:
 *         description: Validation failed, invalid ID, or discussion closed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Discussion not found
 *       500:
 *         description: Internal server error
 */
router.post("/:id/comments", authenticate, allRoles, addComment);

/**
 * @swagger
 * /v1/api/discussion/{id}/comments/{commentId}:
 *   delete:
 *     summary: Delete comment
 *     description: Allowed for the comment author or an admin.
 *     tags: [Discussion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Discussion or comment not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id/comments/:commentId", authenticate, allRoles, deleteComment);

/**
 * @swagger
 * /v1/api/discussion/{id}/join:
 *   post:
 *     summary: Join discussion
 *     description: Adds the logged-in user to the participants. No request body needed.
 *     tags: [Discussion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Joined discussion successfully
 *       400:
 *         description: Invalid discussion ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Discussion not found
 *       500:
 *         description: Internal server error
 */
router.post("/:id/join", authenticate, allRoles, joinDiscussion);

/**
 * @swagger
 * /v1/api/discussion/{id}/leave:
 *   post:
 *     summary: Leave discussion
 *     description: Removes the logged-in user from the participants. No request body needed.
 *     tags: [Discussion]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Left discussion successfully
 *       400:
 *         description: Invalid discussion ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Discussion not found
 *       500:
 *         description: Internal server error
 */
router.post("/:id/leave", authenticate, allRoles, leaveDiscussion);

export const discussionRouter = router;
