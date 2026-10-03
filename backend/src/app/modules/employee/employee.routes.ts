import { Router } from "express";

import {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee,
} from "./employee.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";
import upload from "../../config/cloudinary";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Employee
 *   description: Employee management APIs
 */

/**
 * @swagger
 * /v1/api/employee:
 *   post:
 *     summary: Create employee
 *     description: Creates a new employee with Aadhaar and PAN Card document uploads. Employee ID and monthly salary are generated automatically, and a login account is created for the employee. The temporary password is returned only once in the response. Allowed roles are admin and super-admin.
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - role
 *               - employmentStatus
 *               - shift
 *               - department
 *               - gender
 *               - dob
 *               - phoneNumber
 *               - address
 *               - email
 *               - salaryYearly
 *               - joiningDate
 *               - emergencyContact
 *               - aadhaar
 *               - panCard
 *             properties:
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *               employmentStatus:
 *                 type: string
 *                 enum: [Active, Inactive, On Leave, Terminated]
 *               shift:
 *                 type: string
 *               department:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *               dob:
 *                 type: string
 *                 format: date
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               salaryYearly:
 *                 type: number
 *                 example: 600000
 *               joiningDate:
 *                 type: string
 *                 format: date
 *               emergencyContact:
 *                 type: object
 *                 properties:
 *                   emergencyContactNumber:
 *                     type: string
 *                   phoneNumber:
 *                     type: string
 *               aadhaar:
 *                 type: string
 *                 format: binary
 *               panCard:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Employee created successfully
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
 *                   example: Employee created successfully
 *                 data:
 *                   type: object
 *                   description: Created employee record
 *                 credentials:
 *                   type: object
 *                   description: Login credentials for the new employee (shown only once)
 *                   properties:
 *                     employeeId:
 *                       type: string
 *                       example: EMP123456
 *                     temporaryPassword:
 *                       type: string
 *                       example: aB3dE9xY
 *       400:
 *         description: Validation failed or documents missing
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Employee with the same email already exists
 *       500:
 *         description: Internal server error
 */
router.post("/", authenticate, authorizeRoles("admin", "super-admin"), upload.fields([
        { name: "aadhaar", maxCount: 1 },
        { name: "panCard", maxCount: 1 },
    ]),
    createEmployee
);
/**
 * @swagger
 * /v1/api/employee:
 *   get:
 *     summary: Get all employees
 *     description: Returns a list of all employees. Allowed roles are admin and super-admin.
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employees fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get("/", authenticate, authorizeRoles("admin", "super-admin"), getAllEmployees);
/**
 * @swagger
 * /v1/api/employee/{id}:
 *   get:
 *     summary: Get employee by ID
 *     description: Returns a single employee by MongoDB ID. Allowed roles are admin and super-admin.
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee MongoDB ID
 *     responses:
 *       200:
 *         description: Employee fetched successfully
 *       400:
 *         description: Invalid employee ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", authenticate, authorizeRoles("admin", "super-admin"), getEmployeeById);
/**
 * @swagger
 * /v1/api/employee/{id}:
 *   put:
 *     summary: Update employee
 *     description: Updates employee details. Employee ID cannot be changed. Salary monthly is calculated automatically from yearly salary. Setting employmentStatus to Inactive or Terminated disables the employee login, any other status enables it. Allowed roles are admin and super-admin.
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee MongoDB ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *               employmentStatus:
 *                 type: string
 *                 enum: [Active, Inactive, On Leave, Terminated]
 *               shift:
 *                 type: string
 *               department:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *               dob:
 *                 type: string
 *                 format: date
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               salaryYearly:
 *                 type: number
 *                 example: 600000
 *               joiningDate:
 *                 type: string
 *                 format: date
 *               emergencyContact:
 *                 type: object
 *                 properties:
 *                   emergencyContactNumber:
 *                     type: string
 *                   phoneNumber:
 *                     type: string
 *               aadhaar:
 *                 type: string
 *                 format: binary
 *               panCard:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       400:
 *         description: Validation failed or invalid employee ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", authenticate, authorizeRoles("admin", "super-admin"), upload.fields([
        { name: "aadhaar", maxCount: 1 },
        { name: "panCard", maxCount: 1 },
    ]),
    updateEmployee
);
/**
 * @swagger
 * /v1/api/employee/{id}:
 *   delete:
 *     summary: Delete employee
 *     description: Deletes an employee and the linked login account by MongoDB ID. Allowed roles are admin and super-admin.
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee MongoDB ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       400:
 *         description: Invalid employee ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", authenticate, authorizeRoles("admin", "super-admin"), deleteEmployee);

export const employeeRouter = router;