import { Router } from "express";
import {
    getDocumentTypes,
    getDocumentSummary,
    getMyDocuments,
    createDocument,
    getAllDocuments,
    getDocumentById,
    updateDocument,
    verifyDocument,
    rejectDocument,
    deleteDocument,
} from "./employeeDocument.controllers";
import { authenticate } from "../../middlewares/authenticate";
import { authorizeRoles } from "../../middlewares/authorize";
import upload from "../../config/cloudinary";

const router = Router();

const hrOnly = [authenticate, authorizeRoles("admin", "super-admin")];

const anyRole = [
    authenticate,
    authorizeRoles("admin", "super-admin", "employee"),
];

/**
 * @swagger
 * tags:
 *   name: Employee Documents
 *   description: Upload, verify and track employee documents. Employees manage their own documents, admins and super-admins manage everyone's documents, verify or reject them and watch expiry dates.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EmployeeDocument:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "68d8f1a4b3c9e123456789ab"
 *         employee:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             employeeId:
 *               type: string
 *               example: "EMP123456"
 *             fullName:
 *               type: string
 *               example: "Priya Sharma"
 *             role:
 *               type: string
 *             department:
 *               type: string
 *         category:
 *           type: string
 *           enum: [Identity, Education, Employment, Resume, Other]
 *           example: "Identity"
 *         documentType:
 *           type: string
 *           example: "PAN Card"
 *         file:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               example: "https://res.cloudinary.com/demo/image/upload/pan.png"
 *             publicId:
 *               type: string
 *             originalName:
 *               type: string
 *               example: "pan.png"
 *             mimeType:
 *               type: string
 *               example: "image/png"
 *             size:
 *               type: integer
 *               description: File size in bytes
 *         issuedDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         expiryDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         expiryStatus:
 *           type: string
 *           enum: [No Expiry, Valid, Expiring Soon, Expired]
 *           description: Calculated on every read. Expiring Soon means the document expires within 30 days.
 *           example: "Valid"
 *         remarks:
 *           type: string
 *         status:
 *           type: string
 *           enum: [Pending, Verified, Rejected]
 *           example: "Pending"
 *         verifiedBy:
 *           type: object
 *           description: Admin who verified the document (admin responses only)
 *         verifiedAt:
 *           type: string
 *           format: date-time
 *         rejectedBy:
 *           type: object
 *           description: Admin who rejected the document (admin responses only)
 *         rejectedAt:
 *           type: string
 *           format: date-time
 *         rejectionReason:
 *           type: string
 *           example: "Image is blurred, please upload a clear copy"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date the document was uploaded
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     EmployeeDocumentPagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 24
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

/**
 * @swagger
 * /v1/api/employee-documents/types:
 *   get:
 *     summary: Get document categories and types
 *     description: Returns the categories and document types offered on the upload form. The Other category accepts any type name typed by the user. Categories marked singleInstance allow only one pending or verified document per type. Allowed roles are employee, admin and super-admin.
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document categories fetched successfully
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
 *                   example: "Document categories fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         example: "Identity"
 *                       documentTypes:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Aadhaar Card", "PAN Card", "Passport"]
 *                       acceptsCustomType:
 *                         type: boolean
 *                         example: false
 *                       singleInstance:
 *                         type: boolean
 *                         example: true
 *                 expiryAlertDays:
 *                   type: integer
 *                   example: 30
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
router.get("/types", ...anyRole, getDocumentTypes);

/**
 * @swagger
 * /v1/api/employee-documents/summary:
 *   get:
 *     summary: Get document summary (admin)
 *     description: Returns the counters shown at the top of the documents screen. Rejected documents are ignored by the expiry counters. Allowed roles are admin and super-admin.
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document summary fetched successfully
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
 *                   example: "Document summary fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 120
 *                     pending:
 *                       type: integer
 *                       example: 14
 *                     verified:
 *                       type: integer
 *                       example: 98
 *                     rejected:
 *                       type: integer
 *                       example: 8
 *                     expiringSoon:
 *                       type: integer
 *                       example: 5
 *                     expired:
 *                       type: integer
 *                       example: 2
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       500:
 *         description: Internal server error
 */
router.get("/summary", ...hrOnly, getDocumentSummary);

/**
 * @swagger
 * /v1/api/employee-documents/my:
 *   get:
 *     summary: Get my documents
 *     description: Returns every document uploaded by the logged-in employee, newest first. Allowed role is employee.
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Identity, Education, Employment, Resume, Other]
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *         example: "PAN Card"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Verified, Rejected]
 *       - in: query
 *         name: expiry
 *         schema:
 *           type: string
 *           enum: [expired, expiring, valid, none]
 *         description: expiring means expiring within 30 days
 *     responses:
 *       200:
 *         description: Your documents fetched successfully
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
 *                   example: "Your documents fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmployeeDocument'
 *       400:
 *         description: Invalid filter value or employee information not found
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
    getMyDocuments
);

/**
 * @swagger
 * /v1/api/employee-documents:
 *   post:
 *     summary: Upload an employee document
 *     description: Uploads a document (jpg, jpeg, png, webp or pdf) in the Pending state. Employees can only upload for themselves and may leave employee empty. Admins and super-admins must pass the employee they upload for. Identity and Resume documents are limited to one pending or verified document per type.
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - documentType
 *               - file
 *             properties:
 *               employee:
 *                 type: string
 *                 description: MongoDB ID of the employee record (the _id field, not the EMP number). Required for admins, optional for employees.
 *                 example: "68d8f1a4b3c9e123456789ab"
 *               category:
 *                 type: string
 *                 enum: [Identity, Education, Employment, Resume, Other]
 *                 example: "Identity"
 *               documentType:
 *                 type: string
 *                 description: Must belong to the category (see GET /employee-documents/types). Any name is accepted for the Other category.
 *                 example: "PAN Card"
 *               issuedDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-04-01"
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 description: Must be after the issued date
 *                 example: "2030-04-01"
 *               remarks:
 *                 type: string
 *                 maxLength: 250
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The document file (jpg, jpeg, png, webp or pdf)
 *     responses:
 *       201:
 *         description: Document uploaded successfully
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
 *                   example: "Document uploaded successfully"
 *                 data:
 *                   $ref: '#/components/schemas/EmployeeDocument'
 *       400:
 *         description: Validation failed, file missing or employee missing (admin)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Employees can only upload documents for themselves
 *       404:
 *         description: Employee not found
 *       409:
 *         description: A pending or verified document of this type already exists
 *       500:
 *         description: Internal server error
 */
router.post("/", ...anyRole, upload.single("file"), createDocument);

/**
 * @swagger
 * /v1/api/employee-documents:
 *   get:
 *     summary: Get all employee documents (admin)
 *     description: Returns every document, newest first. Use status=Pending for the verification queue and expiry=expiring or expiry=expired for the expiry alerts (soonest expiry first). Allowed roles are admin and super-admin.
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employee
 *         schema:
 *           type: string
 *         description: MongoDB ID of the employee record
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by employee name or employee ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Identity, Education, Employment, Resume, Other]
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *         example: "Aadhaar Card"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Verified, Rejected]
 *       - in: query
 *         name: expiry
 *         schema:
 *           type: string
 *           enum: [expired, expiring, valid, none]
 *         description: expiring means expiring within 30 days
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
 *         description: Documents fetched successfully
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
 *                   example: "Documents fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmployeeDocument'
 *                 pagination:
 *                   $ref: '#/components/schemas/EmployeeDocumentPagination'
 *       400:
 *         description: Invalid filter value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       500:
 *         description: Internal server error
 */
router.get("/", ...hrOnly, getAllDocuments);

/**
 * @swagger
 * /v1/api/employee-documents/{id}:
 *   get:
 *     summary: Get a document by ID
 *     description: Admins and super-admins can open any document. Employees can only open their own. Allowed roles are employee, admin and super-admin.
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the document
 *     responses:
 *       200:
 *         description: Document fetched successfully
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
 *                   example: "Document fetched successfully"
 *                 data:
 *                   $ref: '#/components/schemas/EmployeeDocument'
 *       400:
 *         description: Invalid document ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Employees can only view their own documents
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", ...anyRole, getDocumentById);

/**
 * @swagger
 * /v1/api/employee-documents/{id}:
 *   patch:
 *     summary: Update a document
 *     description: Updates the details of a document and/or replaces its file. Send only the fields that change. Changing the file, category, type or dates sends the document back to Pending for a new verification, a remarks-only change keeps the status. Send an empty value for issuedDate or expiryDate to clear it. Employees can only update their own documents and not after they are verified. Admins and super-admins can update any document.
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the document
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [Identity, Education, Employment, Resume, Other]
 *               documentType:
 *                 type: string
 *                 example: "Passport"
 *               issuedDate:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               remarks:
 *                 type: string
 *                 maxLength: 250
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: New document file (jpg, jpeg, png, webp or pdf)
 *     responses:
 *       200:
 *         description: Document updated successfully
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
 *                   example: "Document updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/EmployeeDocument'
 *       400:
 *         description: Validation failed or nothing to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not your document, or the document is already verified
 *       404:
 *         description: Document not found
 *       409:
 *         description: A pending or verified document of this type already exists
 *       500:
 *         description: Internal server error
 */
router.patch("/:id", ...anyRole, upload.single("file"), updateDocument);

/**
 * @swagger
 * /v1/api/employee-documents/{id}/verify:
 *   patch:
 *     summary: Verify a document (admin)
 *     description: Marks a pending document as Verified. Allowed roles are admin and super-admin.
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the document
 *     responses:
 *       200:
 *         description: Document verified successfully
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
 *                   example: "Document verified successfully"
 *                 data:
 *                   $ref: '#/components/schemas/EmployeeDocument'
 *       400:
 *         description: Invalid document ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       404:
 *         description: Document not found
 *       409:
 *         description: Only pending documents can be verified
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/verify", ...hrOnly, verifyDocument);

/**
 * @swagger
 * /v1/api/employee-documents/{id}/reject:
 *   patch:
 *     summary: Reject a document (admin)
 *     description: Marks a pending document as Rejected with a reason the employee can read. The employee can then upload a corrected file. Allowed roles are admin and super-admin.
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the document
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
 *                 example: "Image is blurred, please upload a clear copy"
 *     responses:
 *       200:
 *         description: Document rejected successfully
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
 *                   example: "Document rejected successfully"
 *                 data:
 *                   $ref: '#/components/schemas/EmployeeDocument'
 *       400:
 *         description: Validation failed or invalid document ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin or super-admin only)
 *       404:
 *         description: Document not found
 *       409:
 *         description: Only pending documents can be rejected
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/reject", ...hrOnly, rejectDocument);

/**
 * @swagger
 * /v1/api/employee-documents/{id}:
 *   delete:
 *     summary: Delete a document
 *     description: Soft-deletes a document. Employees can only delete their own documents and not after they are verified. Admins and super-admins can delete any document.
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the document
 *     responses:
 *       200:
 *         description: Document deleted successfully
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
 *                   example: "Document deleted successfully"
 *       400:
 *         description: Invalid document ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not your document, or the document is already verified
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", ...anyRole, deleteDocument);

export const employeeDocumentRouter = router;
