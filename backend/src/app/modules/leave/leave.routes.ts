import { Router } from "express";
import {
    createLeave,
    getAllLeaves,
    getMyLeaves,
    getLeaveById,
    updateLeave,
    deleteLeave,
    approveLeave,
    rejectLeave,
} from "./leave.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";
import upload from "../../config/cloudinary";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Leaves
 *   description: Leave management APIs for employees, admins and super-admins
 */

/**
 * @swagger
 * /v1/api/leave:
 *   post:
 *     summary: Apply for leave
 *     description: Creates a leave application with an optional supporting attachment. Employees can only apply for themselves, admins and super-admins can apply on behalf of any employee. Overlapping pending or approved leaves are rejected.
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - employee
 *               - leaveType
 *               - startDate
 *               - endDate
 *               - session
 *               - reason
 *             properties:
 *               employee:
 *                 type: string
 *                 description: MongoDB ID of the employee record (the _id field, not the EMP number)
 *                 example: "68d8f1a4b3c9e123456789ab"
 *               leaveType:
 *                 type: string
 *                 enum:
 *                   - "Casual Leave"
 *                   - "Sick Leave"
 *                   - "Earned Leave"
 *                   - "Privilege Leave"
 *                   - "Other Leave"
 *                 example: "Sick Leave"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-05"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-07"
 *               session:
 *                 type: string
 *                 enum:
 *                   - "Full Day"
 *                   - "Half Day (First Half)"
 *                   - "Half Day (Second Half)"
 *                 example: "Full Day"
 *               reason:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 250
 *                 example: "I am not feeling well and need rest."
 *               reportingManager:
 *                 type: string
 *                 description: Optional MongoDB ID of the reporting manager (employee record)
 *               attachment:
 *                 type: string
 *                 format: binary
 *                 description: Optional supporting document such as a medical certificate (jpg, png, webp or pdf)
 *     responses:
 *       201:
 *         description: Leave applied successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Employees can only apply leave for themselves
 *       404:
 *         description: Employee not found
 *       409:
 *         description: Leave already exists for the selected date range
 *       500:
 *         description: Internal server error
 */
router.post(
    "/",
    authenticate,
    authorizeRoles("employee", "admin", "super-admin"),
    upload.single("attachment"),
    createLeave
);

/**
 * @swagger
 * /v1/api/leave/my:
 *   get:
 *     summary: Get my leaves
 *     description: Returns all leave applications submitted by the currently authenticated employee. Allowed role is employee.
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leaves fetched successfully
 *       400:
 *         description: Employee information not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/my",
    authenticate,
    authorizeRoles("employee"),
    getMyLeaves
);

/**
 * @swagger
 * /v1/api/leave/{id}:
 *   get:
 *     summary: Get leave by ID
 *     description: Returns details of a specific leave application. Employees can only view their own leaves, admins and super-admins can view any leave.
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     responses:
 *       200:
 *         description: Leave fetched successfully
 *       400:
 *         description: Invalid leave ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (leave belongs to another employee)
 *       404:
 *         description: Leave not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/:id",
    authenticate,
    getLeaveById
);

/**
 * @swagger
 * /v1/api/leave/{id}:
 *   patch:
 *     summary: Update pending leave
 *     description: Allows an employee to update their own leave application while it is still pending. Allowed role is employee.
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               leaveType:
 *                 type: string
 *                 enum:
 *                   - "Casual Leave"
 *                   - "Sick Leave"
 *                   - "Earned Leave"
 *                   - "Privilege Leave"
 *                   - "Other Leave"
 *                 example: "Casual Leave"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-10"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-12"
 *               session:
 *                 type: string
 *                 enum:
 *                   - "Full Day"
 *                   - "Half Day (First Half)"
 *                   - "Half Day (Second Half)"
 *               reason:
 *                 type: string
 *                 example: "Personal work."
 *               reportingManager:
 *                 type: string
 *                 description: MongoDB ID of the reporting manager (employee record)
 *               attachment:
 *                 type: string
 *                 format: binary
 *                 description: Optional supporting document
 *     responses:
 *       200:
 *         description: Leave updated successfully
 *       400:
 *         description: Validation failed, invalid ID, or leave is not pending
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (leave belongs to another employee)
 *       404:
 *         description: Leave not found
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/:id",
    authenticate,
    authorizeRoles("employee"),
    upload.single("attachment"),
    updateLeave
);

/**
 * @swagger
 * /v1/api/leave/{id}:
 *   delete:
 *     summary: Cancel pending leave
 *     description: Allows an employee to cancel their own pending leave application (soft delete). Allowed role is employee.
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     responses:
 *       200:
 *         description: Leave cancelled successfully
 *       400:
 *         description: Invalid ID or leave is not pending
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (leave belongs to another employee)
 *       404:
 *         description: Leave not found
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/:id",
    authenticate,
    authorizeRoles("employee"),
    deleteLeave
);

/**
 * @swagger
 * /v1/api/leave:
 *   get:
 *     summary: Get all leaves
 *     description: Allows admins and super-admins to view all employee leave applications with optional filters and pagination.
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: employee
 *         schema:
 *           type: string
 *         description: Employee MongoDB ID
 *       - in: query
 *         name: leaveType
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
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
 *     responses:
 *       200:
 *         description: Leaves fetched successfully
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
    getAllLeaves
);

/**
 * @swagger
 * /v1/api/leave/{id}/approve:
 *   patch:
 *     summary: Approve leave
 *     description: Allows an admin or super-admin to approve a pending leave application. No request body is needed.
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     responses:
 *       200:
 *         description: Leave approved successfully
 *       400:
 *         description: Invalid ID or leave is not pending
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Leave not found
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/:id/approve",
    authenticate,
    authorizeRoles("admin", "super-admin"),
    approveLeave
);

/**
 * @swagger
 * /v1/api/leave/{id}/reject:
 *   patch:
 *     summary: Reject leave
 *     description: Allows an admin or super-admin to reject a pending leave application with a reason.
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 250
 *                 description: Reason for rejecting the leave
 *                 example: "Leave cannot be approved due to project requirements."
 *     responses:
 *       200:
 *         description: Leave rejected successfully
 *       400:
 *         description: Validation failed, invalid ID, or leave is not pending
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Leave not found
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/:id/reject",
    authenticate,
    authorizeRoles("admin", "super-admin"),
    rejectLeave
);

export const leaveAppRouter = router;
