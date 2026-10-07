import { Router } from "express";
import {
    createAlert,
    getAllAlerts,
    getMyAlerts,
    getAlertSummary,
    getAlertById,
    updateAlert,
    acknowledgeAlert,
    resolveAlert,
    deleteAlert,
} from "./alerts.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: System, payroll, security, compliance and document-expiry alerts
 *
 * components:
 *   schemas:
 *     Alert:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "68d8f1a4b3c9e123456789ab" }
 *         title: { type: string, example: "Payroll configuration issue" }
 *         message: { type: string, example: "Admin attention is required to resolve this payroll configuration issue." }
 *         severity: { type: string, enum: [Info, Warning, Critical] }
 *         category: { type: string, enum: [System, Payroll, Security, Document Expiry, Compliance, Attendance, Other] }
 *         status: { type: string, enum: [Active, Acknowledged, Resolved] }
 *         audience: { type: string, enum: [all, admin, employee] }
 *         targetEmployee: { type: string, description: "Employee _id when the alert is meant for one employee" }
 *         documentName: { type: string, example: "Passport" }
 *         expiryDate: { type: string, format: date-time }
 *         acknowledgedAt: { type: string, format: date-time }
 *         resolvedAt: { type: string, format: date-time }
 *         resolutionNote: { type: string }
 *         createdAt: { type: string, format: date-time }
 *     AlertInput:
 *       type: object
 *       required: [title, message]
 *       properties:
 *         title: { type: string, example: "Documents expiring soon" }
 *         message: { type: string, example: "5 documents expiring soon" }
 *         severity: { type: string, enum: [Info, Warning, Critical], example: Warning }
 *         category: { type: string, enum: [System, Payroll, Security, Document Expiry, Compliance, Attendance, Other], example: "Document Expiry" }
 *         audience: { type: string, enum: [all, admin, employee], example: admin }
 *         targetEmployee: { type: string, example: "68d8f1a4b3c9e123456789ab" }
 *         documentName: { type: string, example: "Passport" }
 *         expiryDate: { type: string, format: date, example: "2026-10-30" }
 */

/**
 * @swagger
 * /v1/api/alerts:
 *   post:
 *     summary: Create alert
 *     description: Creates an alert. Use targetEmployee to send it to one employee, or audience to target all / admins / employees. Allowed roles are admin and super-admin.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlertInput'
 *     responses:
 *       201:
 *         description: Alert created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.post("/", authenticate, authorizeRoles("admin", "super-admin"), createAlert);

/**
 * @swagger
 * /v1/api/alerts:
 *   get:
 *     summary: Get all alerts (admin)
 *     description: Lists alerts with filters. Use severity=Critical for critical alerts only, and expiring=true for document-expiry alerts due in the next 30 days.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [Info, Warning, Critical] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [System, Payroll, Security, Document Expiry, Compliance, Attendance, Other] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Active, Acknowledged, Resolved] }
 *       - in: query
 *         name: expiring
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
 *         description: Alerts fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/", authenticate, authorizeRoles("admin", "super-admin"), getAllAlerts);

/**
 * @swagger
 * /v1/api/alerts/my:
 *   get:
 *     summary: Get my alerts (employee)
 *     description: Returns alerts addressed to all employees or to the logged-in employee. Allowed role is employee.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [Info, Warning, Critical] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Active, Acknowledged, Resolved] }
 *     responses:
 *       200:
 *         description: Alerts fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/my", authenticate, authorizeRoles("employee"), getMyAlerts);

/**
 * @swagger
 * /v1/api/alerts/summary:
 *   get:
 *     summary: Alert summary counts
 *     description: Returns open, critical, warning, info, expiring-soon and resolved counts. Allowed roles are admin and super-admin.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alert summary fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/summary", authenticate, authorizeRoles("admin", "super-admin"), getAlertSummary);

/**
 * @swagger
 * /v1/api/alerts/{id}:
 *   get:
 *     summary: Get alert by ID
 *     description: Admins can view any alert. Employees can only view alerts addressed to them.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Alert fetched successfully
 *       400:
 *         description: Invalid alert ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", authenticate, getAlertById);

/**
 * @swagger
 * /v1/api/alerts/{id}:
 *   patch:
 *     summary: Update alert
 *     description: Allowed roles are admin and super-admin.
 *     tags: [Alerts]
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
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlertInput'
 *     responses:
 *       200:
 *         description: Alert updated successfully
 *       400:
 *         description: Validation failed or invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id", authenticate, authorizeRoles("admin", "super-admin"), updateAlert);

/**
 * @swagger
 * /v1/api/alerts/{id}/acknowledge:
 *   patch:
 *     summary: Acknowledge alert
 *     description: Marks an active alert as acknowledged ("Acknowledge & Continue"). Admins can acknowledge any alert, employees only alerts addressed to them. No request body needed.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Alert acknowledged successfully
 *       400:
 *         description: Invalid ID or alert is not active
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/acknowledge", authenticate, acknowledgeAlert);

/**
 * @swagger
 * /v1/api/alerts/{id}/resolve:
 *   patch:
 *     summary: Resolve alert
 *     description: Marks an alert as resolved ("Acknowledge & Resolve"). Allowed roles are admin and super-admin.
 *     tags: [Alerts]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolutionNote:
 *                 type: string
 *                 example: "Payroll configuration corrected."
 *     responses:
 *       200:
 *         description: Alert resolved successfully
 *       400:
 *         description: Validation failed, invalid ID, or already resolved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/resolve", authenticate, authorizeRoles("admin", "super-admin"), resolveAlert);

/**
 * @swagger
 * /v1/api/alerts/{id}:
 *   delete:
 *     summary: Delete alert
 *     description: Soft-deletes an alert. Allowed roles are admin and super-admin.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Alert deleted successfully
 *       400:
 *         description: Invalid alert ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", authenticate, authorizeRoles("admin", "super-admin"), deleteAlert);

export const alertsRouter = router;
