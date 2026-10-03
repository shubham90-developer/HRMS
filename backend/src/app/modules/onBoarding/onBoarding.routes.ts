import { Router } from "express";
import {
  createOnBoarding,
  getOnboarding,
} from "./onBoarding.controllers";
import upload from "../../config/cloudinary";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";

const router = Router();
/**
 * @swagger
 * tags:
 *   - name: HRMS - On Boarding
 *     description: APIs for managing the onboarding screens of the HRMS app
 */

/**
 * @swagger
 * /v1/api/on-boarding:
 *   post:
 *     summary: Create On Boarding
 *     description: Creates a new onboarding screen with an image. Allowed role is super-admin.
 *     tags:
 *       - HRMS - On Boarding
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
 *               - image
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 150
 *                 example: Welcome to HRMS
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Manage your attendance and leaves in one place.
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *                 default: Active
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Onboarding image
 *     responses:
 *       201:
 *         description: Onboarding created successfully
 *       400:
 *         description: Validation failed or onboarding image is missing
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
  authorizeRoles("super-admin"),
  upload.single("image"),
  createOnBoarding
);
/**
 * @swagger
 * /v1/api/on-boarding:
 *   get:
 *     summary: Get On Boarding
 *     description: Returns all active onboarding screens. This is a public endpoint and needs no token.
 *     tags:
 *       - HRMS - On Boarding
 *     security: []
 *     responses:
 *       200:
 *         description: Onboarding fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get("/", getOnboarding);

export const onBoardingRouter = router;
