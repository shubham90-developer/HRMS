import { Router } from "express";
import {
    createStatutory,
    getAllStatutory,
    getMyStatutory,
    getStatutoryById,
    updateStatutory,
    updateFilingStatus,
    deleteStatutory,
    getComplianceCalendar,
    getStatutorySummary,
} from "./statutory.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";
import upload from "../../config/cloudinary";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Statutory
 *   description: Statutory & compliance (PF, ESI, PT, LWF). Admins create and manage records, employees read them.
 *
 * components:
 *   schemas:
 *     TaxSlab:
 *       type: object
 *       properties:
 *         minSalary: { type: number, example: 10000 }
 *         maxSalary: { type: number, example: 15000 }
 *         amount: { type: number, example: 150 }
 *     Statutory:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "68d8f1a4b3c9e123456789ab" }
 *         type: { type: string, enum: [PF, ESI, PT, LWF], example: PF }
 *         category: { type: string, enum: [Setting, Filing], example: Setting }
 *         title: { type: string, example: "PF Settings" }
 *         description: { type: string }
 *         isApplicable: { type: boolean, example: true }
 *         registrationNumber: { type: string, example: "MH/PUN/1234567" }
 *         wageCeiling: { type: number, example: 15000 }
 *         employeeContribution: { type: number, example: 12 }
 *         employerContribution: { type: number, example: 12 }
 *         taxSlabs:
 *           type: array
 *           items: { $ref: '#/components/schemas/TaxSlab' }
 *         state: { type: string, example: Maharashtra }
 *         periodLabel: { type: string, example: "Sep 2026" }
 *         dueDate: { type: string, format: date-time }
 *         filingStatus: { type: string, enum: [Pending, Filed, Overdue] }
 *         computedStatus: { type: string, enum: [Pending, Filed, Overdue], description: "Pending filings past their due date are returned as Overdue" }
 *         filedOn: { type: string, format: date-time }
 *         challanNumber: { type: string }
 *         remarks: { type: string }
 *         attachment: { type: string }
 *         visibleToEmployees: { type: boolean }
 *         isActive: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     StatutoryInput:
 *       type: object
 *       required: [type, title]
 *       properties:
 *         type: { type: string, enum: [PF, ESI, PT, LWF], example: PF }
 *         category: { type: string, enum: [Setting, Filing], example: Setting }
 *         title: { type: string, example: "PF Settings" }
 *         description: { type: string, example: "Deduct PF for eligible employees" }
 *         isApplicable: { type: boolean, example: true }
 *         registrationNumber: { type: string, example: "MH/PUN/1234567" }
 *         wageCeiling: { type: number, example: 15000 }
 *         employeeContribution: { type: number, example: 12 }
 *         employerContribution: { type: number, example: 12 }
 *         taxSlabs:
 *           type: string
 *           description: "JSON array string, e.g. [{\"minSalary\":10000,\"maxSalary\":15000,\"amount\":150}]"
 *         state: { type: string, example: Maharashtra }
 *         periodLabel: { type: string, example: "Sep 2026" }
 *         dueDate: { type: string, format: date, example: "2026-10-15", description: "Required when category is Filing" }
 *         filingStatus: { type: string, enum: [Pending, Filed, Overdue] }
 *         remarks: { type: string }
 *         visibleToEmployees: { type: boolean, example: true }
 *         isActive: { type: boolean, example: true }
 *         attachment: { type: string, format: binary, description: "Optional file (jpg, png, webp, pdf)" }
 */

/**
 * @swagger
 * /v1/api/statutory:
 *   post:
 *     summary: Create statutory record
 *     description: Creates a statutory setting (PF/ESI/PT/LWF) or a compliance filing entry. Allowed roles are admin and super-admin.
 *     tags: [Statutory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/StatutoryInput'
 *     responses:
 *       201:
 *         description: Statutory record created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.post(
    "/",
    authenticate,
    authorizeRoles("admin", "super-admin"),
    upload.single("attachment"),
    createStatutory
);

/**
 * @swagger
 * /v1/api/statutory:
 *   get:
 *     summary: Get all statutory records (admin)
 *     description: Returns all statutory records with filters and pagination. Allowed roles are admin and super-admin.
 *     tags: [Statutory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [PF, ESI, PT, LWF] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [Setting, Filing] }
 *       - in: query
 *         name: filingStatus
 *         schema: { type: string, enum: [Pending, Filed, Overdue] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
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
 *         description: Statutory records fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Statutory' }
 *                 pagination: { type: object }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get(
    "/",
    authenticate,
    authorizeRoles("admin", "super-admin"),
    getAllStatutory
);

/**
 * @swagger
 * /v1/api/statutory/my:
 *   get:
 *     summary: Get statutory records (employee)
 *     description: Returns active statutory records that admins have made visible to employees. Allowed role is employee.
 *     tags: [Statutory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [PF, ESI, PT, LWF] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [Setting, Filing] }
 *     responses:
 *       200:
 *         description: Statutory records fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get(
    "/my",
    authenticate,
    authorizeRoles("employee"),
    getMyStatutory
);

/**
 * @swagger
 * /v1/api/statutory/calendar:
 *   get:
 *     summary: Compliance calendar
 *     description: Returns filings due in the given month (defaults to the current month). Admins see all filings, employees see only visible ones.
 *     tags: [Statutory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12, example: 9 }
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2026 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [PF, ESI, PT, LWF] }
 *     responses:
 *       200:
 *         description: Compliance calendar fetched successfully
 *       400:
 *         description: Invalid month or year
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/calendar", authenticate, getComplianceCalendar);

/**
 * @swagger
 * /v1/api/statutory/summary:
 *   get:
 *     summary: Statutory summary / reports
 *     description: Returns PF, ESI, PT and LWF counts plus pending, filed, overdue and due-this-month filing counts. Allowed roles are admin and super-admin.
 *     tags: [Statutory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statutory summary fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get(
    "/summary",
    authenticate,
    authorizeRoles("admin", "super-admin"),
    getStatutorySummary
);

/**
 * @swagger
 * /v1/api/statutory/{id}:
 *   get:
 *     summary: Get statutory record by ID
 *     description: Admins can view any record. Employees can only view active records visible to employees.
 *     tags: [Statutory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: "68d8f1a4b3c9e123456789ab"
 *     responses:
 *       200:
 *         description: Statutory record fetched successfully
 *       400:
 *         description: Invalid statutory ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Statutory record not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", authenticate, getStatutoryById);

/**
 * @swagger
 * /v1/api/statutory/{id}:
 *   patch:
 *     summary: Update statutory record
 *     description: Updates any field of a statutory record. Allowed roles are admin and super-admin.
 *     tags: [Statutory]
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
 *             $ref: '#/components/schemas/StatutoryInput'
 *     responses:
 *       200:
 *         description: Statutory record updated successfully
 *       400:
 *         description: Validation failed or invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Statutory record not found
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/:id",
    authenticate,
    authorizeRoles("admin", "super-admin"),
    upload.single("attachment"),
    updateStatutory
);

/**
 * @swagger
 * /v1/api/statutory/{id}/filing:
 *   patch:
 *     summary: Update filing status
 *     description: Marks a compliance filing as Pending, Filed or Overdue. Only works on records with category Filing.
 *     tags: [Statutory]
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
 *             required: [filingStatus]
 *             properties:
 *               filingStatus: { type: string, enum: [Pending, Filed, Overdue], example: Filed }
 *               filedOn: { type: string, format: date, example: "2026-10-04" }
 *               challanNumber: { type: string, example: "CH-884211" }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Filing status updated successfully
 *       400:
 *         description: Validation failed, invalid ID, or record is not a filing
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Statutory record not found
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/:id/filing",
    authenticate,
    authorizeRoles("admin", "super-admin"),
    updateFilingStatus
);

/**
 * @swagger
 * /v1/api/statutory/{id}:
 *   delete:
 *     summary: Delete statutory record
 *     description: Soft-deletes a statutory record. Allowed roles are admin and super-admin.
 *     tags: [Statutory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Statutory record deleted successfully
 *       400:
 *         description: Invalid statutory ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Statutory record not found
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/:id",
    authenticate,
    authorizeRoles("admin", "super-admin"),
    deleteStatutory
);

export const statutoryRouter = router;
