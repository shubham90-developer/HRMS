import { Router } from "express";
import {
    createJob,
    getJobs,
    getJobById,
    updateJob,
    updateJobStatus,
    deleteJob,
    addCandidate,
    getAllCandidates,
    getJobCandidates,
    getCandidateById,
    updateCandidate,
    updateCandidateStage,
    deleteCandidate,
    scheduleInterview,
    updateInterview,
    getInterviews,
} from "./recruitment.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";
import upload from "../../config/cloudinary";

const router = Router();

// Recruitment data is HR-only
const hrOnly = [authenticate, authorizeRoles("admin", "super-admin")];

/**
 * @swagger
 * tags:
 *   name: Recruitment
 *   description: Job openings, candidates, hiring stages and interview scheduling. Available to admins and super-admins only.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     JobOpening:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68d8f1a4b3c9e123456789ab"
 *         title:
 *           type: string
 *           example: "Senior Backend Engineer"
 *         department:
 *           type: string
 *           example: "Engineering"
 *         location:
 *           type: string
 *           example: "Pune"
 *         workMode:
 *           type: string
 *           enum: [Onsite, Remote, Hybrid]
 *           example: "Hybrid"
 *         employmentType:
 *           type: string
 *           enum: [Full-time, Part-time, Contract, Internship]
 *           example: "Full-time"
 *         experienceMin:
 *           type: number
 *           example: 3
 *         experienceMax:
 *           type: number
 *           example: 6
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Node.js", "TypeScript", "MongoDB"]
 *         description:
 *           type: string
 *           example: "Build and maintain HRMS backend services."
 *         vacancies:
 *           type: integer
 *           example: 2
 *         closingDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [Open, On Hold, Closed]
 *           example: "Open"
 *         applicantsCount:
 *           type: integer
 *           description: Number of candidates who applied (list and detail responses)
 *           example: 12
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Used as the "Posted on" date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Candidate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68d8f1a4b3c9e123456789cd"
 *         job:
 *           type: string
 *           description: Job opening ID (populated with title, department and status in list and detail responses)
 *           example: "68d8f1a4b3c9e123456789ab"
 *         fullName:
 *           type: string
 *           example: "Kiran Mehta"
 *         email:
 *           type: string
 *           example: "kiran.mehta@example.com"
 *         phone:
 *           type: string
 *           example: "+91 98765 43210"
 *         experienceYears:
 *           type: number
 *           example: 4.5
 *         currentCompany:
 *           type: string
 *           example: "Acme Technologies"
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Node.js", "MongoDB"]
 *         source:
 *           type: string
 *           enum: [LinkedIn, Naukri, Indeed, Referral, Company Website, Campus, Other]
 *           example: "LinkedIn"
 *         resume:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               example: "https://res.cloudinary.com/demo/raw/upload/resume.pdf"
 *             publicId:
 *               type: string
 *             originalName:
 *               type: string
 *               example: "kiran-resume.pdf"
 *         stage:
 *           type: string
 *           enum: [Applied, Screening, Interview, Offer, Hired, Rejected]
 *           example: "Screening"
 *         notes:
 *           type: string
 *         appliedAt:
 *           type: string
 *           format: date-time
 *           description: Used as the "Applied on" date
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Interview:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68d8f1a4b3c9e123456789ef"
 *         round:
 *           type: integer
 *           example: 2
 *         title:
 *           type: string
 *           example: "Technical Round"
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           example: "2026-10-10T10:30:00.000Z"
 *         durationMinutes:
 *           type: integer
 *           example: 60
 *         mode:
 *           type: string
 *           enum: [Online, In-person, Phone]
 *           example: "Online"
 *         location:
 *           type: string
 *           description: Meeting link or venue
 *           example: "https://meet.example.com/abc-defg"
 *         interviewers:
 *           type: array
 *           items:
 *             type: string
 *           description: Employee IDs (the _id of the employee record)
 *         status:
 *           type: string
 *           enum: [Scheduled, Completed, Cancelled]
 *           example: "Scheduled"
 *         feedback:
 *           type: string
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         result:
 *           type: string
 *           enum: [Selected, Rejected, On Hold]
 *         completedAt:
 *           type: string
 *           format: date-time
 *     RecruitmentPagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 25
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalPages:
 *           type: integer
 *           example: 3
 */

/* ============================== JOB OPENINGS ============================== */

/**
 * @swagger
 * /v1/api/recruitment/jobs:
 *   post:
 *     summary: Create a job opening
 *     description: Allows an admin or super-admin to post a new job opening. New openings are Open by default.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - department
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 120
 *                 example: "Senior Backend Engineer"
 *               department:
 *                 type: string
 *                 example: "Engineering"
 *               location:
 *                 type: string
 *                 example: "Pune"
 *               workMode:
 *                 type: string
 *                 enum: [Onsite, Remote, Hybrid]
 *                 default: Onsite
 *               employmentType:
 *                 type: string
 *                 enum: [Full-time, Part-time, Contract, Internship]
 *                 default: Full-time
 *               experienceMin:
 *                 type: number
 *                 default: 0
 *                 example: 3
 *               experienceMax:
 *                 type: number
 *                 description: Must be greater than or equal to experienceMin
 *                 example: 6
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Node.js", "TypeScript", "MongoDB"]
 *               description:
 *                 type: string
 *                 maxLength: 3000
 *               vacancies:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 example: 2
 *               closingDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-11-30"
 *               status:
 *                 type: string
 *                 enum: [Open, On Hold, Closed]
 *                 default: Open
 *     responses:
 *       201:
 *         description: Job opening created successfully
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
 *                   example: "Job opening created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/JobOpening'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.post("/jobs", ...hrOnly, createJob);

/**
 * @swagger
 * /v1/api/recruitment/jobs:
 *   get:
 *     summary: Get job openings
 *     description: Returns job openings, newest first, each with its applicantsCount.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Open, On Hold, Closed]
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Exact department name (case-insensitive)
 *       - in: query
 *         name: employmentType
 *         schema:
 *           type: string
 *           enum: [Full-time, Part-time, Contract, Internship]
 *       - in: query
 *         name: workMode
 *         schema:
 *           type: string
 *           enum: [Onsite, Remote, Hybrid]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by job title or department
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Job openings fetched successfully
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
 *                   example: "Job openings fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/JobOpening'
 *                 pagination:
 *                   $ref: '#/components/schemas/RecruitmentPagination'
 *       400:
 *         description: Invalid filter value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/jobs", ...hrOnly, getJobs);

/**
 * @swagger
 * /v1/api/recruitment/jobs/{id}:
 *   get:
 *     summary: Get job opening by ID
 *     description: Returns the job details together with applicantsCount and a stageSummary (number of candidates in each hiring stage).
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job opening ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     responses:
 *       200:
 *         description: Job opening fetched successfully
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
 *                   example: "Job opening fetched successfully"
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/JobOpening'
 *                     - type: object
 *                       properties:
 *                         stageSummary:
 *                           type: object
 *                           example:
 *                             Applied: 5
 *                             Screening: 3
 *                             Interview: 2
 *                             Offer: 1
 *                             Hired: 0
 *                             Rejected: 1
 *       400:
 *         description: Invalid job ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Job opening not found
 *       500:
 *         description: Internal server error
 */
router.get("/jobs/:id", ...hrOnly, getJobById);

/**
 * @swagger
 * /v1/api/recruitment/jobs/{id}:
 *   patch:
 *     summary: Update a job opening
 *     description: Updates only the fields that are sent. Send closingDate as null to remove the closing date.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job opening ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               department:
 *                 type: string
 *               location:
 *                 type: string
 *               workMode:
 *                 type: string
 *                 enum: [Onsite, Remote, Hybrid]
 *               employmentType:
 *                 type: string
 *                 enum: [Full-time, Part-time, Contract, Internship]
 *               experienceMin:
 *                 type: number
 *               experienceMax:
 *                 type: number
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *               vacancies:
 *                 type: integer
 *               closingDate:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [Open, On Hold, Closed]
 *             example:
 *               vacancies: 3
 *               skills: ["Node.js", "TypeScript", "MongoDB", "Redis"]
 *     responses:
 *       200:
 *         description: Job opening updated successfully
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
 *                   example: "Job opening updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/JobOpening'
 *       400:
 *         description: Invalid ID or validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Job opening not found
 *       500:
 *         description: Internal server error
 */
router.patch("/jobs/:id", ...hrOnly, updateJob);

/**
 * @swagger
 * /v1/api/recruitment/jobs/{id}/status:
 *   patch:
 *     summary: Change job opening status
 *     description: Quickly opens, puts on hold or closes a job opening. New candidates cannot be added to a closed job.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job opening ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Open, On Hold, Closed]
 *                 example: "Closed"
 *     responses:
 *       200:
 *         description: Job opening status updated
 *       400:
 *         description: Invalid ID or validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Job opening not found
 *       500:
 *         description: Internal server error
 */
router.patch("/jobs/:id/status", ...hrOnly, updateJobStatus);

/**
 * @swagger
 * /v1/api/recruitment/jobs/{id}:
 *   delete:
 *     summary: Delete a job opening
 *     description: Soft-deletes the job opening together with all of its candidates.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job opening ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     responses:
 *       200:
 *         description: Job opening deleted successfully
 *       400:
 *         description: Invalid job ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Job opening not found
 *       500:
 *         description: Internal server error
 */
router.delete("/jobs/:id", ...hrOnly, deleteJob);

/* =============================== CANDIDATES =============================== */

/**
 * @swagger
 * /v1/api/recruitment/jobs/{jobId}/candidates:
 *   post:
 *     summary: Add a candidate to a job
 *     description: Adds a candidate in the Applied stage, with an optional resume upload (pdf, jpg, png or webp). The same email cannot be added twice to one job, and closed jobs do not accept new candidates.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job opening ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - phone
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Kiran Mehta"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "kiran.mehta@example.com"
 *               phone:
 *                 type: string
 *                 example: "+91 98765 43210"
 *               experienceYears:
 *                 type: number
 *                 default: 0
 *                 example: 4.5
 *               currentCompany:
 *                 type: string
 *                 example: "Acme Technologies"
 *               skills:
 *                 type: string
 *                 description: Comma separated list, a JSON array string, or repeat the field
 *                 example: "Node.js, MongoDB"
 *               source:
 *                 type: string
 *                 enum: [LinkedIn, Naukri, Indeed, Referral, Company Website, Campus, Other]
 *                 default: Other
 *               notes:
 *                 type: string
 *               appliedAt:
 *                 type: string
 *                 format: date
 *                 description: Defaults to now
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: Optional resume (pdf, jpg, png or webp)
 *     responses:
 *       201:
 *         description: Candidate added successfully
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
 *                   example: "Candidate added successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Candidate'
 *       400:
 *         description: Validation failed or the job is closed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Job opening not found
 *       409:
 *         description: A candidate with this email already exists for this job
 *       500:
 *         description: Internal server error
 */
router.post(
    "/jobs/:jobId/candidates",
    ...hrOnly,
    upload.single("resume"),
    addCandidate
);

/**
 * @swagger
 * /v1/api/recruitment/jobs/{jobId}/candidates:
 *   get:
 *     summary: Get candidates of a job
 *     description: Returns the candidates who applied for one job opening, newest applicant first. Powers the "View Candidates" screen.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job opening ID
 *         example: "68d8f1a4b3c9e123456789ab"
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *           enum: [Applied, Screening, Interview, Offer, Hired, Rejected]
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [LinkedIn, Naukri, Indeed, Referral, Company Website, Campus, Other]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email or phone
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Candidates fetched successfully
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
 *                   example: "Candidates fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Candidate'
 *                 pagination:
 *                   $ref: '#/components/schemas/RecruitmentPagination'
 *       400:
 *         description: Invalid job ID or filter value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Job opening not found
 *       500:
 *         description: Internal server error
 */
router.get("/jobs/:jobId/candidates", ...hrOnly, getJobCandidates);

/**
 * @swagger
 * /v1/api/recruitment/candidates:
 *   get:
 *     summary: Get all candidates
 *     description: Returns candidates across all job openings, newest applicant first. Powers the "All Candidates" screen.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: job
 *         schema:
 *           type: string
 *         description: Job opening ID
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *           enum: [Applied, Screening, Interview, Offer, Hired, Rejected]
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [LinkedIn, Naukri, Indeed, Referral, Company Website, Campus, Other]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email or phone
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Candidates fetched successfully
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
 *                   example: "Candidates fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Candidate'
 *                 pagination:
 *                   $ref: '#/components/schemas/RecruitmentPagination'
 *       400:
 *         description: Invalid filter value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/candidates", ...hrOnly, getAllCandidates);

/**
 * @swagger
 * /v1/api/recruitment/candidates/{id}:
 *   get:
 *     summary: Get candidate by ID
 *     description: Returns the full candidate profile with resume, stage history and interview rounds. previousCandidateId and nextCandidateId point to the neighbouring candidates of the same job (null at the ends of the list) for Previous / Next buttons.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *         example: "68d8f1a4b3c9e123456789cd"
 *     responses:
 *       200:
 *         description: Candidate fetched successfully
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
 *                   example: "Candidate fetched successfully"
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Candidate'
 *                     - type: object
 *                       properties:
 *                         stageHistory:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               stage:
 *                                 type: string
 *                                 example: "Screening"
 *                               note:
 *                                 type: string
 *                               changedAt:
 *                                 type: string
 *                                 format: date-time
 *                         interviews:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Interview'
 *                         previousCandidateId:
 *                           type: string
 *                           nullable: true
 *                         nextCandidateId:
 *                           type: string
 *                           nullable: true
 *       400:
 *         description: Invalid candidate ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Candidate not found
 *       500:
 *         description: Internal server error
 */
router.get("/candidates/:id", ...hrOnly, getCandidateById);

/**
 * @swagger
 * /v1/api/recruitment/candidates/{id}:
 *   patch:
 *     summary: Update a candidate
 *     description: Updates only the fields that are sent. Attach a resume file to replace the current resume. Use the stage endpoint to move a candidate between hiring stages.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *         example: "68d8f1a4b3c9e123456789cd"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               experienceYears:
 *                 type: number
 *               currentCompany:
 *                 type: string
 *               skills:
 *                 type: string
 *                 description: Comma separated list, a JSON array string, or repeat the field
 *               source:
 *                 type: string
 *                 enum: [LinkedIn, Naukri, Indeed, Referral, Company Website, Campus, Other]
 *               notes:
 *                 type: string
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: New resume (pdf, jpg, png or webp)
 *     responses:
 *       200:
 *         description: Candidate updated successfully
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
 *                   example: "Candidate updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Candidate'
 *       400:
 *         description: Invalid ID or validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Candidate not found
 *       409:
 *         description: A candidate with this email already exists for this job
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/candidates/:id",
    ...hrOnly,
    upload.single("resume"),
    updateCandidate
);

/**
 * @swagger
 * /v1/api/recruitment/candidates/{id}/stage:
 *   patch:
 *     summary: Move a candidate to another stage
 *     description: Moves the candidate through the hiring pipeline (Applied, Screening, Interview, Offer, Hired, Rejected) and records the change in the stage history. Moving a candidate to Rejected cancels all of their scheduled interviews.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *         example: "68d8f1a4b3c9e123456789cd"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stage
 *             properties:
 *               stage:
 *                 type: string
 *                 enum: [Applied, Screening, Interview, Offer, Hired, Rejected]
 *                 example: "Offer"
 *               note:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Cleared all rounds, rolling out the offer letter"
 *     responses:
 *       200:
 *         description: Candidate moved to the new stage
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
 *                   example: "Candidate moved to Offer"
 *                 data:
 *                   $ref: '#/components/schemas/Candidate'
 *       400:
 *         description: Invalid ID, validation failed or the candidate is already in this stage
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Candidate not found
 *       500:
 *         description: Internal server error
 */
router.patch("/candidates/:id/stage", ...hrOnly, updateCandidateStage);

/**
 * @swagger
 * /v1/api/recruitment/candidates/{id}:
 *   delete:
 *     summary: Delete a candidate
 *     description: Soft-deletes a candidate. The candidate disappears from all lists and the interview schedule.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *         example: "68d8f1a4b3c9e123456789cd"
 *     responses:
 *       200:
 *         description: Candidate deleted successfully
 *       400:
 *         description: Invalid candidate ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Candidate not found
 *       500:
 *         description: Internal server error
 */
router.delete("/candidates/:id", ...hrOnly, deleteCandidate);

/* =============================== INTERVIEWS =============================== */

/**
 * @swagger
 * /v1/api/recruitment/interviews:
 *   get:
 *     summary: Get interview schedule
 *     description: Returns interview rounds of all candidates, earliest first, each with candidate and job details. Powers the interview schedule screen. Combine from and to to show one day, week or month.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Scheduled, Completed, Cancelled]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Interviews on or after this date
 *         example: "2026-10-01"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Interviews on or before this date (a plain date includes the whole day)
 *         example: "2026-10-31"
 *       - in: query
 *         name: job
 *         schema:
 *           type: string
 *         description: Job opening ID
 *       - in: query
 *         name: candidate
 *         schema:
 *           type: string
 *         description: Candidate ID
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order by interview time
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Interviews fetched successfully
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
 *                   example: "Interviews fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Interview ID
 *                       candidateId:
 *                         type: string
 *                       candidateName:
 *                         type: string
 *                         example: "Kiran Mehta"
 *                       candidateEmail:
 *                         type: string
 *                       candidateStage:
 *                         type: string
 *                         example: "Interview"
 *                       job:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           title:
 *                             type: string
 *                             example: "Senior Backend Engineer"
 *                           department:
 *                             type: string
 *                             example: "Engineering"
 *                       round:
 *                         type: integer
 *                         example: 2
 *                       title:
 *                         type: string
 *                         example: "Round 2"
 *                       scheduledAt:
 *                         type: string
 *                         format: date-time
 *                       durationMinutes:
 *                         type: integer
 *                         example: 60
 *                       mode:
 *                         type: string
 *                         example: "Online"
 *                       location:
 *                         type: string
 *                       interviewers:
 *                         type: array
 *                         items:
 *                           type: string
 *                       status:
 *                         type: string
 *                         example: "Scheduled"
 *                       result:
 *                         type: string
 *                       rating:
 *                         type: integer
 *                 pagination:
 *                   $ref: '#/components/schemas/RecruitmentPagination'
 *       400:
 *         description: Invalid filter value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/interviews", ...hrOnly, getInterviews);

/**
 * @swagger
 * /v1/api/recruitment/candidates/{id}/interviews:
 *   post:
 *     summary: Schedule an interview
 *     description: Schedules an interview round for a candidate. The round number is assigned automatically (next free round) unless sent. The first interview moves a candidate from Applied or Screening into the Interview stage. Hired and rejected candidates cannot be scheduled.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *         example: "68d8f1a4b3c9e123456789cd"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduledAt
 *             properties:
 *               round:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 description: Optional, defaults to the next free round
 *                 example: 2
 *               title:
 *                 type: string
 *                 description: Defaults to "Round N"
 *                 example: "Technical Round"
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 description: Must be in the future
 *                 example: "2026-10-10T10:30:00.000Z"
 *               durationMinutes:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 480
 *                 default: 60
 *               mode:
 *                 type: string
 *                 enum: [Online, In-person, Phone]
 *                 default: Online
 *               location:
 *                 type: string
 *                 description: Meeting link or venue
 *                 example: "https://meet.example.com/abc-defg"
 *               interviewers:
 *                 type: array
 *                 description: Employee IDs (the _id of the employee record)
 *                 items:
 *                   type: string
 *                 example: ["68d8f1a4b3c9e123456789aa"]
 *     responses:
 *       201:
 *         description: Interview scheduled successfully
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
 *                   example: "Interview scheduled successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     interview:
 *                       $ref: '#/components/schemas/Interview'
 *                     stage:
 *                       type: string
 *                       description: Candidate stage after scheduling
 *                       example: "Interview"
 *       400:
 *         description: Validation failed, interviewer not found or candidate is hired or rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Candidate not found
 *       409:
 *         description: This round is already scheduled for the candidate
 *       500:
 *         description: Internal server error
 */
router.post("/candidates/:id/interviews", ...hrOnly, scheduleInterview);

/**
 * @swagger
 * /v1/api/recruitment/candidates/{id}/interviews/{interviewId}:
 *   patch:
 *     summary: Update, complete or cancel an interview
 *     description: Reschedules an interview, marks it Completed or Cancelled, and records feedback. feedback, rating and result are accepted only when the interview is (or becomes) Completed. A completed interview accepts only feedback, rating and result changes, and a cancelled interview cannot be changed.
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Candidate ID
 *         example: "68d8f1a4b3c9e123456789cd"
 *       - in: path
 *         name: interviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: Interview ID
 *         example: "68d8f1a4b3c9e123456789ef"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               durationMinutes:
 *                 type: integer
 *               mode:
 *                 type: string
 *                 enum: [Online, In-person, Phone]
 *               location:
 *                 type: string
 *               interviewers:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [Scheduled, Completed, Cancelled]
 *               feedback:
 *                 type: string
 *                 maxLength: 2000
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               result:
 *                 type: string
 *                 enum: [Selected, Rejected, On Hold]
 *             example:
 *               status: "Completed"
 *               rating: 4
 *               result: "Selected"
 *               feedback: "Strong problem solving and good communication."
 *     responses:
 *       200:
 *         description: Interview updated successfully
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
 *                   example: "Interview updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Interview'
 *       400:
 *         description: Invalid ID, validation failed or the change is not allowed for the interview's current status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Candidate or interview not found
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/candidates/:id/interviews/:interviewId",
    ...hrOnly,
    updateInterview
);

export const recruitmentRouter = router;
