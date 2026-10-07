import { Router } from "express";
import {
    createTraining,
    getAllTrainings,
    getTrainingById,
    updateTraining,
    deleteTraining,
    getTrainingOverview,
    getTrainingCalendar,
    getTrainingReports,
    enrollInTraining,
    getMyEnrollments,
    getAllEnrollments,
    approveEnrollment,
    rejectEnrollment,
    updateEnrollmentProgress,
    cancelEnrollment,
} from "./training.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";

const router = Router();
const admin = authorizeRoles("admin", "super-admin");
const allRoles = authorizeRoles("employee", "admin", "super-admin");

/**
 * @swagger
 * tags:
 *   name: Training
 *   description: Course library, calendar, enrolment requests, progress and reports
 *
 * components:
 *   schemas:
 *     Training:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "68d8f1a4b3c9e123456789ab" }
 *         title: { type: string, example: "Flutter Advanced Training" }
 *         description: { type: string }
 *         category: { type: string, example: "Technical" }
 *         trainer: { type: string, example: "Rahul Verma" }
 *         mode: { type: string, enum: [Online, Offline, Hybrid] }
 *         venue: { type: string }
 *         startDate: { type: string, format: date-time }
 *         endDate: { type: string, format: date-time }
 *         startTime: { type: string, example: "10:00" }
 *         endTime: { type: string, example: "12:00" }
 *         durationHours: { type: number, example: 8 }
 *         capacity: { type: integer, example: 30 }
 *         isMandatory: { type: boolean }
 *         status: { type: string, enum: [Upcoming, Ongoing, Completed, Cancelled] }
 *         isActive: { type: boolean }
 *     TrainingInput:
 *       type: object
 *       required: [title, trainer, startDate, endDate]
 *       properties:
 *         title: { type: string, example: "Flutter Advanced Training" }
 *         description: { type: string, example: "Hands-on advanced Flutter session" }
 *         category: { type: string, example: "Technical" }
 *         trainer: { type: string, example: "Rahul Verma" }
 *         mode: { type: string, enum: [Online, Offline, Hybrid], example: Online }
 *         venue: { type: string, example: "Conference Room 2" }
 *         startDate: { type: string, format: date, example: "2026-10-12" }
 *         endDate: { type: string, format: date, example: "2026-10-14" }
 *         startTime: { type: string, example: "10:00" }
 *         endTime: { type: string, example: "12:00" }
 *         durationHours: { type: number, example: 8 }
 *         capacity: { type: integer, example: 30 }
 *         isMandatory: { type: boolean, example: false }
 *         status: { type: string, enum: [Upcoming, Ongoing, Completed, Cancelled] }
 *         isActive: { type: boolean, example: true }
 *     TrainingEnrollment:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         training: { type: string }
 *         employee: { type: string }
 *         status: { type: string, enum: [Requested, Approved, Rejected, In Progress, Completed] }
 *         progress: { type: number, example: 40 }
 *         score: { type: number, example: 88 }
 *         completedAt: { type: string, format: date-time }
 *         certificateUrl: { type: string }
 *         rejectionReason: { type: string }
 */

/**
 * @swagger
 * /v1/api/training:
 *   post:
 *     summary: Create training
 *     description: Adds a training to the course library. Allowed roles are admin and super-admin.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrainingInput'
 *     responses:
 *       201:
 *         description: Training created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.post("/", authenticate, admin, createTraining);

/**
 * @swagger
 * /v1/api/training:
 *   get:
 *     summary: Course library
 *     description: Lists trainings. Employees only see active, non-cancelled trainings.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Upcoming, Ongoing, Completed, Cancelled] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: mode
 *         schema: { type: string, enum: [Online, Offline, Hybrid] }
 *       - in: query
 *         name: mandatory
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
 *         description: Trainings fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/", authenticate, allRoles, getAllTrainings);

/**
 * @swagger
 * /v1/api/training/overview:
 *   get:
 *     summary: Training overview cards
 *     description: Admins get company-wide totals (total trainings, sessions this month, pending requests). Employees get their own enrolled / in-progress / completed counts.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Training overview fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.get("/overview", authenticate, allRoles, getTrainingOverview);

/**
 * @swagger
 * /v1/api/training/calendar:
 *   get:
 *     summary: Training calendar
 *     description: Returns trainings that overlap the given month (defaults to the current month).
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12, example: 10 }
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2026 }
 *     responses:
 *       200:
 *         description: Training calendar fetched successfully
 *       400:
 *         description: Invalid month or year
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/calendar", authenticate, allRoles, getTrainingCalendar);

/**
 * @swagger
 * /v1/api/training/reports:
 *   get:
 *     summary: Training reports
 *     description: Per-training enrolment, completion rate and average score. Allowed roles are admin and super-admin.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Upcoming, Ongoing, Completed, Cancelled] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Training reports fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/reports", authenticate, admin, getTrainingReports);

/**
 * @swagger
 * /v1/api/training/enrollments:
 *   get:
 *     summary: Get all enrollments (admin)
 *     description: Lists enrolment requests and progress. Use status=Requested for the Enrolment Requests screen. Allowed roles are admin and super-admin.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Requested, Approved, Rejected, In Progress, Completed] }
 *       - in: query
 *         name: training
 *         schema: { type: string }
 *       - in: query
 *         name: employee
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Enrollments fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/enrollments", authenticate, admin, getAllEnrollments);

/**
 * @swagger
 * /v1/api/training/enrollments/my:
 *   get:
 *     summary: Get my enrollments (employee)
 *     description: Training history, progress and certificates of the logged-in employee. Allowed role is employee.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Requested, Approved, Rejected, In Progress, Completed] }
 *     responses:
 *       200:
 *         description: Your enrollments fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */
router.get("/enrollments/my", authenticate, authorizeRoles("employee"), getMyEnrollments);

/**
 * @swagger
 * /v1/api/training/enrollments/{enrollmentId}/approve:
 *   patch:
 *     summary: Approve enrolment request
 *     description: Allowed roles are admin and super-admin. No request body needed.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Enrollment approved successfully
 *       400:
 *         description: Invalid ID or enrollment is not in Requested state
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Enrollment not found
 *       409:
 *         description: Training is full
 *       500:
 *         description: Internal server error
 */
router.patch("/enrollments/:enrollmentId/approve", authenticate, admin, approveEnrollment);

/**
 * @swagger
 * /v1/api/training/enrollments/{enrollmentId}/reject:
 *   patch:
 *     summary: Reject enrolment request
 *     description: Allowed roles are admin and super-admin.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason: { type: string, example: "Conflicts with a scheduled deadline" }
 *     responses:
 *       200:
 *         description: Enrollment rejected successfully
 *       400:
 *         description: Validation failed, invalid ID, or enrollment is not in Requested state
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Enrollment not found
 *       500:
 *         description: Internal server error
 */
router.patch("/enrollments/:enrollmentId/reject", authenticate, admin, rejectEnrollment);

/**
 * @swagger
 * /v1/api/training/enrollments/{enrollmentId}/progress:
 *   patch:
 *     summary: Update enrolment progress
 *     description: Progress 1-99 sets the status to In Progress, 100 completes the training. Optional score and certificate URL. Allowed roles are admin and super-admin.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [progress]
 *             properties:
 *               progress: { type: number, minimum: 0, maximum: 100, example: 100 }
 *               score: { type: number, minimum: 0, maximum: 100, example: 88 }
 *               certificateUrl: { type: string, example: "https://example.com/cert.pdf" }
 *     responses:
 *       200:
 *         description: Enrollment progress updated successfully
 *       400:
 *         description: Validation failed, invalid ID, or enrollment not approved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Enrollment not found
 *       500:
 *         description: Internal server error
 */
router.patch("/enrollments/:enrollmentId/progress", authenticate, admin, updateEnrollmentProgress);

/**
 * @swagger
 * /v1/api/training/enrollments/{enrollmentId}:
 *   delete:
 *     summary: Cancel my enrolment request
 *     description: Lets an employee withdraw their own request while it is still in Requested state. Allowed role is employee.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Enrollment request cancelled successfully
 *       400:
 *         description: Invalid ID or enrollment is not in Requested state
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Enrollment not found
 *       500:
 *         description: Internal server error
 */
router.delete("/enrollments/:enrollmentId", authenticate, authorizeRoles("employee"), cancelEnrollment);

/**
 * @swagger
 * /v1/api/training/{id}/enroll:
 *   post:
 *     summary: Request enrolment
 *     description: Employee requests to join a training. A rejected request can be re-submitted. No request body needed. Allowed role is employee.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Enrolment requested successfully
 *       400:
 *         description: Invalid ID or training is cancelled/completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Training or employee not found
 *       409:
 *         description: Already requested, or training is full
 *       500:
 *         description: Internal server error
 */
router.post("/:id/enroll", authenticate, authorizeRoles("employee"), enrollInTraining);

/**
 * @swagger
 * /v1/api/training/{id}:
 *   get:
 *     summary: Get training by ID
 *     description: Includes the number of seats taken (enrolledCount).
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Training fetched successfully
 *       400:
 *         description: Invalid training ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Training not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", authenticate, allRoles, getTrainingById);

/**
 * @swagger
 * /v1/api/training/{id}:
 *   patch:
 *     summary: Update training
 *     description: Allowed roles are admin and super-admin.
 *     tags: [Training]
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
 *             $ref: '#/components/schemas/TrainingInput'
 *     responses:
 *       200:
 *         description: Training updated successfully
 *       400:
 *         description: Validation failed or invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Training not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id", authenticate, admin, updateTraining);

/**
 * @swagger
 * /v1/api/training/{id}:
 *   delete:
 *     summary: Delete training
 *     description: Soft-deletes the training and its enrollments. Allowed roles are admin and super-admin.
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Training deleted successfully
 *       400:
 *         description: Invalid training ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Training not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", authenticate, admin, deleteTraining);

export const trainingRouter = router;
