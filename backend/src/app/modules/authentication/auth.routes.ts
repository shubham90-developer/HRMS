import { Router } from "express";
import rateLimit from "express-rate-limit";
import { adminLogin, employeeLogin } from "./auth.controllers";

const router = Router();

// Brute-force protection: max 10 login attempts per IP every 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes.",
    },
});

/**
 * @swagger
 * tags:
 *   - name: Authentication - Admin Login
 *     description: APIs for admin and super-admin authentication
 */

/**
 * @swagger
 * /v1/api/auth/admin/login:
 *   post:
 *     summary: Admin Login
 *     description: Login API for Admin and Super Admin using email and password.
 *     tags:
 *       - Authentication - Admin Login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@yourcompany.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: YourStrongPassword
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 68c123456789abcdef123456
 *                         email:
 *                           type: string
 *                           example: admin@hrms.com
 *                         role:
 *                           type: string
 *                           example: super-admin
 *       400:
 *         description: Validation failed (valid email and password of at least 6 characters required)
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Account is inactive
 *       429:
 *         description: Too many login attempts
 *       500:
 *         description: Internal server error
 */
router.post("/admin/login", loginLimiter, adminLogin);
/**
 * @swagger
 * tags:
 *   name: Authentication - Employee Login
 *   description: Employee authentication and login APIs
 */

/**
 * @swagger
 * /v1/api/auth/employee-login:
 *   post:
 *     summary: Employee Login
 *     description: Authenticates an employee using Employee ID and password and returns a JWT token.
 *     tags:
 *       - Authentication - Employee Login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - password
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: EMP123456
 *                 description: Employee ID
 *               password:
 *                 type: string
 *                 format: password
 *                 example: YourPassword
 *                 description: Employee password
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 68d3a7b8f123456789abcdef
 *                         employeeId:
 *                           type: string
 *                           example: EMP123456
 *                         role:
 *                           type: string
 *                           example: employee
 *       400:
 *         description: Validation failed (employee ID and password of at least 6 characters required)
 *       401:
 *         description: Invalid employee ID or password
 *       403:
 *         description: Account is inactive
 *       429:
 *         description: Too many login attempts
 *       500:
 *         description: Internal server error
 */
router.post("/employee-login", loginLimiter, employeeLogin);

export const authenticationRouter = router;