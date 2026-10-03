import { Router } from "express";

import {
    createOrganization,
    getOrganizations,
    getOrganizationById,
    updateOrganization,
    deleteOrganization,
} from "./organization.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";

const router = Router();
/**
 * @swagger
 * tags:
 *   name: Organization
 *   description: Organization management APIs
 */

/**
 * @swagger
 * /v1/api/organizations:
 *   post:
 *     summary: Create Organization
 *     description: Create a new organization. Only super-admin can create an organization.
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationName
 *               - organizationCode
 *               - industry
 *               - organizationType
 *               - address
 *               - contact
 *               - configuration
 *             properties:
 *               organizationName:
 *                 type: string
 *                 example: ABC Technologies
 *               organizationCode:
 *                 type: string
 *                 example: ABC001
 *               registrationNumber:
 *                 type: string
 *                 example: U12345MH2020PTC123456
 *               industry:
 *                 type: string
 *                 example: Information Technology
 *               organizationType:
 *                 type: string
 *                 example: Private Limited
 *               organizationLogo:
 *                 type: string
 *                 example: https://example.com/logo.png
 *               address:
 *                 type: object
 *                 required:
 *                   - addressLine1
 *                   - country
 *                   - state
 *                   - city
 *                   - pinCode
 *                 properties:
 *                   addressLine1:
 *                     type: string
 *                     example: 123 Business Park
 *                   addressLine2:
 *                     type: string
 *                     example: Kharadi
 *                   country:
 *                     type: string
 *                     example: India
 *                   state:
 *                     type: string
 *                     example: Maharashtra
 *                   city:
 *                     type: string
 *                     example: Pune
 *                   pinCode:
 *                     type: string
 *                     example: 411014
 *               contact:
 *                 type: object
 *                 required:
 *                   - email
 *                   - phoneNumber
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: admin@abctech.com
 *                   phoneNumber:
 *                     type: string
 *                     example: 9876543210
 *                   alternativePhoneNumber:
 *                     type: string
 *                     example: 9123456789
 *                   website:
 *                     type: string
 *                     example: https://abctech.com
 *                   gstNumber:
 *                     type: string
 *                     example: 27ABCDE1234F1Z5
 *                   panNumber:
 *                     type: string
 *                     example: ABCDE1234F
 *               configuration:
 *                 type: object
 *                 required:
 *                   - financialYearStartMonth
 *                   - payrollCycle
 *                   - workingDays
 *                   - weeklyOff
 *                   - defaultShift
 *                   - leavePolicy
 *                   - attendancePolicy
 *                 properties:
 *                   financialYearStartMonth:
 *                     type: string
 *                     example: April
 *                   payrollCycle:
 *                     type: string
 *                     example: Monthly
 *                   workingDays:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: [Monday, Tuesday, Wednesday, Thursday, Friday]
 *                   weeklyOff:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: [Saturday, Sunday]
 *                   defaultShift:
 *                     type: string
 *                     example: General
 *                   leavePolicy:
 *                     type: string
 *                     example: Standard Leave Policy
 *                   attendancePolicy:
 *                     type: string
 *                     example: Standard Attendance Policy
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Super-admin access required
 *       409:
 *         description: Organization code or email already exists
 *       500:
 *         description: Internal server error
 */
router.post("/", authenticate, authorizeRoles("super-admin"), createOrganization);
/**
 * @swagger
 * /v1/api/organizations:
 *   get:
 *     summary: Get All Organizations
 *     description: Get all active organizations. Allowed roles are admin and super-admin.
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organizations fetched successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/", authenticate, authorizeRoles("admin", "super-admin"), getOrganizations);
/**
 * @swagger
 * /v1/api/organizations/{id}:
 *   get:
 *     summary: Get Organization By ID
 *     description: Get an active organization by its ID. Allowed roles are admin and super-admin.
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 68c123456789abcdef123456
 *     responses:
 *       200:
 *         description: Organization fetched successfully
 *       400:
 *         description: Invalid organization ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", authenticate, authorizeRoles("admin", "super-admin"), getOrganizationById);
/**
 * @swagger
 * /v1/api/organizations/{id}:
 *   put:
 *     summary: Update Organization
 *     description: Update an existing organization. Only super-admin can update an organization.
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 68c123456789abcdef123456
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationName
 *               - organizationCode
 *               - industry
 *               - organizationType
 *               - address
 *               - contact
 *               - configuration
 *             properties:
 *               organizationName:
 *                 type: string
 *                 example: ABC Technologies
 *               organizationCode:
 *                 type: string
 *                 example: ABC001
 *               registrationNumber:
 *                 type: string
 *                 example: U12345MH2020PTC123456
 *               industry:
 *                 type: string
 *                 example: Information Technology
 *               organizationType:
 *                 type: string
 *                 example: Private Limited
 *               organizationLogo:
 *                 type: string
 *                 example: https://example.com/logo.png
 *               address:
 *                 type: object
 *                 properties:
 *                   addressLine1:
 *                     type: string
 *                     example: 123 Business Park
 *                   addressLine2:
 *                     type: string
 *                     example: Kharadi
 *                   country:
 *                     type: string
 *                     example: India
 *                   state:
 *                     type: string
 *                     example: Maharashtra
 *                   city:
 *                     type: string
 *                     example: Pune
 *                   pinCode:
 *                     type: string
 *                     example: 411014
 *               contact:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: admin@abctech.com
 *                   phoneNumber:
 *                     type: string
 *                     example: 9876543210
 *                   alternativePhoneNumber:
 *                     type: string
 *                     example: 9123456789
 *                   website:
 *                     type: string
 *                     example: https://abctech.com
 *                   gstNumber:
 *                     type: string
 *                     example: 27ABCDE1234F1Z5
 *                   panNumber:
 *                     type: string
 *                     example: ABCDE1234F
 *               configuration:
 *                 type: object
 *                 properties:
 *                   financialYearStartMonth:
 *                     type: string
 *                     example: April
 *                   payrollCycle:
 *                     type: string
 *                     example: Monthly
 *                   workingDays:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: [Monday, Tuesday, Wednesday, Thursday, Friday]
 *                   weeklyOff:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: [Saturday, Sunday]
 *                   defaultShift:
 *                     type: string
 *                     example: General
 *                   leavePolicy:
 *                     type: string
 *                     example: Standard Leave Policy
 *                   attendancePolicy:
 *                     type: string
 *                     example: Standard Attendance Policy
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *       400:
 *         description: Invalid organization ID or validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Super-admin access required
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", authenticate, authorizeRoles("super-admin"), updateOrganization);
/**
 * @swagger
 * /v1/api/organizations/{id}:
 *   delete:
 *     summary: Delete Organization
 *     description: Soft delete an organization. Only super-admin can delete an organization.
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 68c123456789abcdef123456
 *     responses:
 *       200:
 *         description: Organization deleted successfully
 *       400:
 *         description: Invalid organization ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Super-admin access required
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", authenticate, authorizeRoles("super-admin"), deleteOrganization);

export const organizationRouter = router;