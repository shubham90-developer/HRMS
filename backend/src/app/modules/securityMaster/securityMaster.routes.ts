import { Router } from "express";
import {
    createMaster,
    getAllMaster,
    getMasterById,
    updateMaster,
    deleteMaster,
    getSecurityPolicy,
    updateSecurityPolicy,
    registerSession,
    getMySessions,
    getAllSessions,
    revokeSession,
    getAuditLogs,
    exportAuditLogs,
    createRole,
    getAllRoles,
    getRoleById,
    updateRole,
    deleteRole,
    getSecurityMasterOverview,
} from "./securityMaster.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";

const router = Router();
const admin = authorizeRoles("admin", "super-admin");
const allRoles = authorizeRoles("employee", "admin", "super-admin");

/**
 * @swagger
 * tags:
 *   - name: Security & Master - Master Data
 *     description: Departments, designations, shifts, branch locations, cost centers, grade bands, employment types and holidays. Admins manage, everyone can read active records.
 *   - name: Security & Master - Security
 *     description: Password policy, login sessions and audit log.
 *   - name: Security & Master - Roles
 *     description: Roles and permissions configuration.
 *
 * components:
 *   parameters:
 *     MasterType:
 *       in: path
 *       name: type
 *       required: true
 *       schema:
 *         type: string
 *         enum: [department, designation, shift, branch-location, cost-center, grade-band, employment-type, holiday]
 *   schemas:
 *     MasterData:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         type: { type: string, enum: [department, designation, shift, branch-location, cost-center, grade-band, employment-type, holiday] }
 *         name: { type: string, example: "Engineering" }
 *         code: { type: string, example: "ENG" }
 *         description: { type: string }
 *         departmentHead: { type: string, description: "Employee _id (department)" }
 *         startTime: { type: string, example: "09:30", description: "shift" }
 *         endTime: { type: string, example: "18:30", description: "shift" }
 *         gracePeriodMinutes: { type: number, example: 15 }
 *         breakDurationMinutes: { type: number, example: 60 }
 *         workingHours: { type: number, example: 8 }
 *         address: { type: string }
 *         city: { type: string }
 *         state: { type: string }
 *         country: { type: string }
 *         pinCode: { type: string }
 *         latitude: { type: number }
 *         longitude: { type: number }
 *         geofenceRadius: { type: number, example: 100 }
 *         minSalary: { type: number, description: "grade-band" }
 *         maxSalary: { type: number, description: "grade-band" }
 *         date: { type: string, format: date-time, description: "holiday" }
 *         holidayType: { type: string, enum: [National, Festival, Optional, Company] }
 *         isActive: { type: boolean }
 *     MasterDataInput:
 *       type: object
 *       required: [name]
 *       description: "code is required for every type except shift (needs startTime and endTime) and holiday (needs date)."
 *       properties:
 *         name: { type: string, example: "General Shift" }
 *         code: { type: string, example: "GEN" }
 *         description: { type: string }
 *         departmentHead: { type: string }
 *         startTime: { type: string, example: "09:30" }
 *         endTime: { type: string, example: "18:30" }
 *         gracePeriodMinutes: { type: number, example: 15 }
 *         breakDurationMinutes: { type: number, example: 60 }
 *         workingHours: { type: number, example: 8 }
 *         address: { type: string }
 *         city: { type: string }
 *         state: { type: string }
 *         country: { type: string }
 *         pinCode: { type: string }
 *         latitude: { type: number }
 *         longitude: { type: number }
 *         geofenceRadius: { type: number }
 *         minSalary: { type: number }
 *         maxSalary: { type: number }
 *         date: { type: string, format: date, example: "2026-10-20" }
 *         holidayType: { type: string, enum: [National, Festival, Optional, Company] }
 *         isActive: { type: boolean, example: true }
 *     SecurityPolicy:
 *       type: object
 *       properties:
 *         passwordMinLength: { type: integer, example: 8 }
 *         requireUppercase: { type: boolean, example: true }
 *         requireLowercase: { type: boolean, example: true }
 *         requireNumber: { type: boolean, example: true }
 *         requireSpecialChar: { type: boolean, example: true }
 *         passwordExpiryDays: { type: integer, example: 90, description: "0 = never expires" }
 *         maxLoginAttempts: { type: integer, example: 5 }
 *         twoFactorRequired: { type: boolean, example: false }
 *         sessionTimeoutMinutes: { type: integer, example: 30 }
 *     Role:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         name: { type: string, example: "HR Manager" }
 *         description: { type: string }
 *         permissions:
 *           type: array
 *           items: { type: string }
 *           example: ["employee.read", "leave.approve"]
 *         isActive: { type: boolean }
 *     RoleInput:
 *       type: object
 *       required: [name]
 *       properties:
 *         name: { type: string, example: "HR Manager" }
 *         description: { type: string, example: "Handles leave and onboarding" }
 *         permissions:
 *           type: array
 *           items: { type: string }
 *           example: ["employee.read", "leave.approve"]
 *         isActive: { type: boolean, example: true }
 */

/**
 * @swagger
 * /v1/api/security-master/overview:
 *   get:
 *     summary: Security & Master overview
 *     description: Counts for the tab cards - roles configured, active login sessions and active records per master type. Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Master Data]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/overview", authenticate, admin, getSecurityMasterOverview);

/* ----------------------------- Master data ----------------------------- */

/**
 * @swagger
 * /v1/api/security-master/master/{type}:
 *   post:
 *     summary: Create master record
 *     description: Creates a department, designation, shift, branch location, cost center, grade band, employment type or holiday depending on {type}. Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MasterType'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MasterDataInput'
 *     responses:
 *       201:
 *         description: Record created successfully
 *       400:
 *         description: Validation failed or invalid master type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       409:
 *         description: Code (or holiday date) already exists
 *       500:
 *         description: Internal server error
 */
router.post("/master/:type", authenticate, admin, createMaster);

/**
 * @swagger
 * /v1/api/security-master/master/{type}:
 *   get:
 *     summary: List master records
 *     description: Lists records of the given type. Employees only see active records. For holidays use the year filter.
 *     tags: [Security & Master - Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MasterType'
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2026 }
 *         description: Holidays only
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List fetched successfully
 *       400:
 *         description: Invalid master type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/master/:type", authenticate, allRoles, getAllMaster);

/**
 * @swagger
 * /v1/api/security-master/master/{type}/{id}:
 *   get:
 *     summary: Get master record by ID
 *     tags: [Security & Master - Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MasterType'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record fetched successfully
 *       400:
 *         description: Invalid ID or master type
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Record not found
 *       500:
 *         description: Internal server error
 */
router.get("/master/:type/:id", authenticate, allRoles, getMasterById);

/**
 * @swagger
 * /v1/api/security-master/master/{type}/{id}:
 *   patch:
 *     summary: Update master record
 *     description: Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MasterType'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MasterDataInput'
 *     responses:
 *       200:
 *         description: Record updated successfully
 *       400:
 *         description: Validation failed or invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Record not found
 *       409:
 *         description: Code already exists
 *       500:
 *         description: Internal server error
 */
router.patch("/master/:type/:id", authenticate, admin, updateMaster);

/**
 * @swagger
 * /v1/api/security-master/master/{type}/{id}:
 *   delete:
 *     summary: Delete master record
 *     description: Soft-deletes the record. Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MasterType'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record deleted successfully
 *       400:
 *         description: Invalid ID or master type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Record not found
 *       500:
 *         description: Internal server error
 */
router.delete("/master/:type/:id", authenticate, admin, deleteMaster);

/* ----------------------------- Security ----------------------------- */

/**
 * @swagger
 * /v1/api/security-master/security/policy:
 *   get:
 *     summary: Get security / password policy
 *     description: Returns the single company-wide security policy (created with defaults on first read). Everyone can read it so apps can validate passwords.
 *     tags: [Security & Master - Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security policy fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/security/policy", authenticate, allRoles, getSecurityPolicy);

/**
 * @swagger
 * /v1/api/security-master/security/policy:
 *   put:
 *     summary: Update security / password policy
 *     description: Updates any subset of the policy fields. Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SecurityPolicy'
 *     responses:
 *       200:
 *         description: Security policy updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.put("/security/policy", authenticate, admin, updateSecurityPolicy);

/**
 * @swagger
 * /v1/api/security-master/security/sessions:
 *   post:
 *     summary: Register login session
 *     description: Call after login so this device appears under Login Sessions. IP and user agent are captured automatically.
 *     tags: [Security & Master - Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [deviceName]
 *             properties:
 *               deviceName: { type: string, example: "Pixel 8" }
 *               platform: { type: string, example: "Android" }
 *     responses:
 *       201:
 *         description: Session registered successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/security/sessions", authenticate, allRoles, registerSession);

/**
 * @swagger
 * /v1/api/security-master/security/sessions/my:
 *   get:
 *     summary: Get my active sessions
 *     tags: [Security & Master - Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/security/sessions/my", authenticate, allRoles, getMySessions);

/**
 * @swagger
 * /v1/api/security-master/security/sessions:
 *   get:
 *     summary: Get all login sessions (admin)
 *     description: Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: account
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Sessions fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/security/sessions", authenticate, admin, getAllSessions);

/**
 * @swagger
 * /v1/api/security-master/security/sessions/{id}/revoke:
 *   patch:
 *     summary: Revoke session
 *     description: Users can revoke their own sessions, admins can revoke any session. No request body needed.
 *     tags: [Security & Master - Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *       400:
 *         description: Invalid session ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Session not found
 *       500:
 *         description: Internal server error
 */
router.patch("/security/sessions/:id/revoke", authenticate, allRoles, revokeSession);

/**
 * @swagger
 * /v1/api/security-master/security/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     description: Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: module
 *         schema: { type: string, example: "master" }
 *       - in: query
 *         name: action
 *         schema: { type: string, example: "UPDATE" }
 *       - in: query
 *         name: actor
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Audit logs fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/security/audit-logs", authenticate, admin, getAuditLogs);

/**
 * @swagger
 * /v1/api/security-master/security/audit-logs/export:
 *   get:
 *     summary: Export audit logs as CSV
 *     description: Downloads up to 5000 matching entries. Accepts the same filters as the list. Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: module
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema: { type: string }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/security/audit-logs/export", authenticate, admin, exportAuditLogs);

/* ----------------------------- Roles & permissions ----------------------------- */

/**
 * @swagger
 * /v1/api/security-master/roles:
 *   post:
 *     summary: Create role
 *     description: Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleInput'
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       409:
 *         description: Role already exists
 *       500:
 *         description: Internal server error
 */
router.post("/roles", authenticate, admin, createRole);

/**
 * @swagger
 * /v1/api/security-master/roles:
 *   get:
 *     summary: Get all roles
 *     description: Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Roles fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/roles", authenticate, admin, getAllRoles);

/**
 * @swagger
 * /v1/api/security-master/roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Security & Master - Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Role fetched successfully
 *       400:
 *         description: Invalid role ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Role not found
 *       500:
 *         description: Internal server error
 */
router.get("/roles/:id", authenticate, admin, getRoleById);

/**
 * @swagger
 * /v1/api/security-master/roles/{id}:
 *   patch:
 *     summary: Update role / edit permissions
 *     description: Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Roles]
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
 *             $ref: '#/components/schemas/RoleInput'
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Validation failed or invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Role not found
 *       409:
 *         description: Role already exists
 *       500:
 *         description: Internal server error
 */
router.patch("/roles/:id", authenticate, admin, updateRole);

/**
 * @swagger
 * /v1/api/security-master/roles/{id}:
 *   delete:
 *     summary: Delete role
 *     description: Soft-deletes the role. Allowed roles are admin and super-admin.
 *     tags: [Security & Master - Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       400:
 *         description: Invalid role ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Role not found
 *       500:
 *         description: Internal server error
 */
router.delete("/roles/:id", authenticate, admin, deleteRole);

export const securityMasterRouter = router;
