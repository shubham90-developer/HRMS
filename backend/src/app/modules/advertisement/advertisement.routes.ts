import { Router } from "express";
import {
    createAdvertisement,
    getAdvertisements,
    getActiveAdvertisements,
    getAdvertisementById,
    updateAdvertisement,
    updateAdvertisementStatus,
    deleteAdvertisement,
} from "./advertisement.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";
import upload from "../../config/cloudinary";

const router = Router();

const hrOnly = [authenticate, authorizeRoles("admin", "super-admin")];

const anyRole = [
    authenticate,
    authorizeRoles("admin", "super-admin", "employee"),
];

// Optional banner image and optional attachment (pdf)
const adFiles = upload.fields([
    { name: "image", maxCount: 1 },
    { name: "attachment", maxCount: 1 },
]);

/**
 * @swagger
 * tags:
 *   name: Advertisements
 *   description: Company advertisements and announcements. Admins and super-admins create, schedule, publish and manage them, employees read the ones that are live and meant for their department.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Advertisement:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68d8f1a4b3c9e123456789ab"
 *         title:
 *           type: string
 *           example: "Wellness Week"
 *         description:
 *           type: string
 *           example: "Join us for a week of yoga, health checks and talks."
 *         type:
 *           type: string
 *           enum: [General, Update, Event, Policy, Alert]
 *           example: "Event"
 *         priority:
 *           type: string
 *           enum: [Low, Medium, High]
 *           example: "Medium"
 *         image:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               example: "https://res.cloudinary.com/demo/image/upload/banner.png"
 *             publicId:
 *               type: string
 *             originalName:
 *               type: string
 *         attachment:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               example: "https://res.cloudinary.com/demo/image/upload/schedule.pdf"
 *             publicId:
 *               type: string
 *             originalName:
 *               type: string
 *         audience:
 *           type: string
 *           enum: [All, Departments]
 *           example: "All"
 *         departments:
 *           type: array
 *           description: Department names. Empty when the audience is All.
 *           items:
 *             type: string
 *           example: []
 *         status:
 *           type: string
 *           enum: [Draft, Published]
 *           description: What the admin chose. Employees only ever see Published ones that are live.
 *           example: "Published"
 *         displayStatus:
 *           type: string
 *           enum: [Draft, Scheduled, Published, Expired]
 *           description: Calculated status. Scheduled means the publish date is still in the future, Expired means the expiry date has passed.
 *           example: "Published"
 *         publishAt:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         views:
 *           type: integer
 *           description: Number of different employees who opened it
 *           example: 42
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     AdvertisementPagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 8
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalPages:
 *           type: integer
 *           example: 1
 */

/**
 * @swagger
 * /v1/api/advertisements:
 *   post:
 *     summary: Create an advertisement
 *     description: Creates an advertisement with an optional banner image and an optional attachment. It is published immediately by default. Send status Draft to save it without publishing, or a future publishAt to schedule it. Send an expiresAt to hide it automatically. Choose audience Departments together with departments to target specific departments.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 150
 *                 example: "Wellness Week"
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *                 example: "Join us for a week of yoga, health checks and talks."
 *               type:
 *                 type: string
 *                 enum: [General, Update, Event, Policy, Alert]
 *                 default: General
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High]
 *                 default: Medium
 *               audience:
 *                 type: string
 *                 enum: [All, Departments]
 *                 default: All
 *               departments:
 *                 type: string
 *                 description: Required when audience is Departments. Comma separated list, a JSON array string, or repeat the field.
 *                 example: "Engineering, Finance"
 *               status:
 *                 type: string
 *                 enum: [Draft, Published]
 *                 default: Published
 *               publishAt:
 *                 type: string
 *                 format: date-time
 *                 description: Defaults to now when published. A future value schedules it.
 *                 example: "2026-10-10T09:00:00.000Z"
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Must be after publishAt
 *                 example: "2026-10-30T18:00:00.000Z"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional banner image (jpg, png or webp)
 *               attachment:
 *                 type: string
 *                 format: binary
 *                 description: Optional attachment (pdf, jpg, png or webp)
 *     responses:
 *       201:
 *         description: Advertisement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Advertisement created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Advertisement'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       500:
 *         description: Internal server error
 */
router.post("/", ...hrOnly, adFiles, createAdvertisement);

/**
 * @swagger
 * /v1/api/advertisements:
 *   get:
 *     summary: Get all advertisements (admin)
 *     description: Returns every advertisement, drafts and expired ones included, newest first. Use status to filter by the calculated status.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Draft, Scheduled, Published, Expired]
 *         description: Calculated status (Published means live right now)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [General, Update, Event, Policy, Alert]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [Low, Medium, High]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Advertisements fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Advertisements fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Advertisement'
 *                 pagination:
 *                   $ref: '#/components/schemas/AdvertisementPagination'
 *       400:
 *         description: Invalid filter value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       500:
 *         description: Internal server error
 */
router.get("/", ...hrOnly, getAdvertisements);

/**
 * @swagger
 * /v1/api/advertisements/active:
 *   get:
 *     summary: Get live advertisements
 *     description: Returns the advertisements that are live right now (published, started and not expired), newest first. Employees only receive those meant for everyone or for their own department. Admins and super-admins see every live advertisement.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [General, Update, Event, Policy, Alert]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [Low, Medium, High]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Advertisements fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Advertisements fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Advertisement'
 *                 pagination:
 *                   $ref: '#/components/schemas/AdvertisementPagination'
 *       400:
 *         description: Invalid filter value or employee information not found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.get("/active", ...anyRole, getActiveAdvertisements);

/**
 * @swagger
 * /v1/api/advertisements/{id}:
 *   get:
 *     summary: Get advertisement by ID
 *     description: Admins and super-admins can open any advertisement, drafts included. Employees can only open live advertisements meant for them (others return 404), and each employee's first visit increases the views counter by one.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     responses:
 *       200:
 *         description: Advertisement fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Advertisement fetched successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Advertisement'
 *       400:
 *         description: Invalid advertisement ID or employee information not found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Advertisement not found (or not available to this employee)
 *       500:
 *         description: Internal server error
 */
router.get("/:id", ...anyRole, getAdvertisementById);

/**
 * @swagger
 * /v1/api/advertisements/{id}:
 *   patch:
 *     summary: Update an advertisement
 *     description: Updates only the fields that are sent. Attach image or attachment to replace the current file, or send removeImage / removeAttachment as true to delete it. Send an empty expiresAt to remove the expiry. Use the status endpoint to publish or unpublish.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [General, Update, Event, Policy, Alert]
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High]
 *               audience:
 *                 type: string
 *                 enum: [All, Departments]
 *               departments:
 *                 type: string
 *                 description: Comma separated list, a JSON array string, or repeat the field
 *                 example: "Engineering, Finance"
 *               publishAt:
 *                 type: string
 *                 format: date-time
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Send an empty value to remove the expiry
 *               removeImage:
 *                 type: boolean
 *               removeAttachment:
 *                 type: boolean
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: New banner image (jpg, png or webp)
 *               attachment:
 *                 type: string
 *                 format: binary
 *                 description: New attachment (pdf, jpg, png or webp)
 *     responses:
 *       200:
 *         description: Advertisement updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Advertisement updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Advertisement'
 *       400:
 *         description: Invalid ID or validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       404:
 *         description: Advertisement not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id", ...hrOnly, adFiles, updateAdvertisement);

/**
 * @swagger
 * /v1/api/advertisements/{id}/status:
 *   patch:
 *     summary: Publish or unpublish an advertisement
 *     description: Publish makes the advertisement live now, or schedules it when a future publishAt is sent. Draft takes it offline without deleting it. An advertisement whose expiry date has already passed cannot be published until the expiry is updated.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Draft, Published]
 *                 example: "Published"
 *               publishAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional, only used when publishing
 *                 example: "2026-10-10T09:00:00.000Z"
 *     responses:
 *       200:
 *         description: Advertisement status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Advertisement published successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Advertisement'
 *       400:
 *         description: Invalid ID, validation failed or the expiry date is already over
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       404:
 *         description: Advertisement not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/status", ...hrOnly, updateAdvertisementStatus);

/**
 * @swagger
 * /v1/api/advertisements/{id}:
 *   delete:
 *     summary: Delete an advertisement
 *     description: Soft-deletes the advertisement. It disappears from every list for admins and employees.
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     responses:
 *       200:
 *         description: Advertisement deleted successfully
 *       400:
 *         description: Invalid advertisement ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       404:
 *         description: Advertisement not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", ...hrOnly, deleteAdvertisement);

export const advertisementRouter = router;
