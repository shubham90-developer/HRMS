import { Router } from "express";
import {
    createHoliday,
    getHolidays,
    getUpcomingHolidays,
    getHolidayById,
    updateHoliday,
    deleteHoliday,
} from "./holiday.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Holidays
 *   description: Company holiday calendar. Admins and super-admins manage holidays, every logged-in user (including employees) can view them.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Holiday:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68d8f1a4b3c9e123456789ab"
 *         name:
 *           type: string
 *           example: "Independence Day"
 *         date:
 *           type: string
 *           format: date-time
 *           description: Holiday date stored as UTC midnight
 *           example: "2026-08-15T00:00:00.000Z"
 *         type:
 *           type: string
 *           enum: [National, Optional, Restricted, Company, Other]
 *           example: "National"
 *         description:
 *           type: string
 *           example: "Celebrating India's independence"
 *         isAllLocations:
 *           type: boolean
 *           description: true when the holiday applies to every office location
 *           example: true
 *         locations:
 *           type: array
 *           description: Location names the holiday applies to. Always empty when isAllLocations is true.
 *           items:
 *             type: string
 *           example: []
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     HolidayPagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 14
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 50
 *         totalPages:
 *           type: integer
 *           example: 1
 */

/**
 * @swagger
 * /v1/api/holidays:
 *   post:
 *     summary: Create a holiday
 *     description: Allows an admin or super-admin to add a holiday to the calendar. Two holidays with the same name on the same date are rejected. When isAllLocations is false at least one location is required.
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - date
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Independence Day"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-15"
 *               type:
 *                 type: string
 *                 enum: [National, Optional, Restricted, Company, Other]
 *                 default: National
 *                 example: "National"
 *               description:
 *                 type: string
 *                 maxLength: 250
 *                 example: "Celebrating India's independence"
 *               isAllLocations:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *               locations:
 *                 type: array
 *                 description: Required when isAllLocations is false
 *                 items:
 *                   type: string
 *                 example: ["Pune Office", "Mumbai Office"]
 *     responses:
 *       201:
 *         description: Holiday created successfully
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
 *                   example: "Holiday created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Holiday'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       409:
 *         description: A holiday with the same name already exists on this date
 *       500:
 *         description: Internal server error
 */
router.post(
    "/",
    authenticate,
    authorizeRoles("admin", "super-admin"),
    createHoliday
);

/**
 * @swagger
 * /v1/api/holidays:
 *   get:
 *     summary: Get holidays
 *     description: Returns the holiday calendar sorted by date. Available to admins, super-admins and employees. Use year and month to load one calendar month, or only year to load a full year. Use location to get only the holidays that apply to one office (holidays marked for all locations are always included).
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 1900
 *           maximum: 2100
 *         description: Calendar year. Defaults to the current year when only month is sent.
 *         example: 2026
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Calendar month (1-12)
 *         example: 8
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [National, Optional, Restricted, Company, Other]
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Office location name (case-insensitive)
 *         example: "Pune Office"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by holiday name
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order by date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *     responses:
 *       200:
 *         description: Holidays fetched successfully
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
 *                   example: "Holidays fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Holiday'
 *                 pagination:
 *                   $ref: '#/components/schemas/HolidayPagination'
 *       400:
 *         description: Invalid year or month
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
    "/",
    authenticate,
    authorizeRoles("admin", "super-admin", "employee"),
    getHolidays
);

/**
 * @swagger
 * /v1/api/holidays/upcoming:
 *   get:
 *     summary: Get upcoming holidays
 *     description: Returns the next holidays starting from today (or from the given date), soonest first. Useful for a dashboard widget. Available to admins, super-admins and employees.
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *           maximum: 50
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD). Defaults to today in UTC. Send the user's local date to avoid timezone drift.
 *         example: "2026-10-03"
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Office location name (case-insensitive)
 *     responses:
 *       200:
 *         description: Upcoming holidays fetched successfully
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
 *                   example: "Upcoming holidays fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Holiday'
 *       400:
 *         description: Invalid from date
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
    "/upcoming",
    authenticate,
    authorizeRoles("admin", "super-admin", "employee"),
    getUpcomingHolidays
);

/**
 * @swagger
 * /v1/api/holidays/{id}:
 *   get:
 *     summary: Get holiday by ID
 *     description: Returns a single holiday. Available to admins, super-admins and employees.
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     responses:
 *       200:
 *         description: Holiday fetched successfully
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
 *                   example: "Holiday fetched successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Holiday'
 *       400:
 *         description: Invalid holiday ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Holiday not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/:id",
    authenticate,
    authorizeRoles("admin", "super-admin", "employee"),
    getHolidayById
);

/**
 * @swagger
 * /v1/api/holidays/{id}:
 *   patch:
 *     summary: Update a holiday
 *     description: Allows an admin or super-admin to update any field of a holiday. Only the fields that are sent are changed. Sending a non-empty locations list without isAllLocations restricts the holiday to those locations; setting isAllLocations to true clears the locations.
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Diwali"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-11-08"
 *               type:
 *                 type: string
 *                 enum: [National, Optional, Restricted, Company, Other]
 *               description:
 *                 type: string
 *                 maxLength: 250
 *               isAllLocations:
 *                 type: boolean
 *               locations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Pune Office"]
 *     responses:
 *       200:
 *         description: Holiday updated successfully
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
 *                   example: "Holiday updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Holiday'
 *       400:
 *         description: Invalid ID or validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       404:
 *         description: Holiday not found
 *       409:
 *         description: A holiday with the same name already exists on this date
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/:id",
    authenticate,
    authorizeRoles("admin", "super-admin"),
    updateHoliday
);

/**
 * @swagger
 * /v1/api/holidays/{id}:
 *   delete:
 *     summary: Delete a holiday
 *     description: Allows an admin or super-admin to remove a holiday from the calendar for all locations. The record is soft-deleted, so it no longer appears in any list.
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     responses:
 *       200:
 *         description: Holiday deleted successfully
 *       400:
 *         description: Invalid holiday ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       404:
 *         description: Holiday not found
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/:id",
    authenticate,
    authorizeRoles("admin", "super-admin"),
    deleteHoliday
);

export const holidayRouter = router;
