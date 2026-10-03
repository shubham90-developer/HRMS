import { Request, Response } from "express";
import mongoose from "mongoose";
import Organization from "./organization.model";
import { organizationSchema } from "./organization.validation";

// Create (POST) organization
export const createOrganization = async (
    req: Request,
    res: Response
) => {
    try {
        const validation = organizationSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validation.error.flatten(),
            });
            return;
        }

        const {
            organizationCode,
            contact,
        } = validation.data;

        const existingOrganization = await Organization.findOne({
            $or: [
                {
                    organizationCode:
                        organizationCode.toUpperCase(),
                },
                {
                    "contact.email": contact.email.toLowerCase(),
                },
            ],
            isDeleted: false,
        });

        if (existingOrganization) {
            res.status(409).json({
                success: false,
                message:
                    "Organization code or email already exists",
            });
            return;
        }

        const organization = await Organization.create({
            ...validation.data,
            organizationCode:
                organizationCode.toUpperCase(),
        });

        res.status(201).json({
            success: true,
            message: "Organization created successfully",
            data: organization,
        });
    } catch (error) {
        console.error(
            "Create Organization Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Get (GET) all organization
export const getOrganizations = async (req: Request, res: Response) => {

    try {
        const organizations = await Organization.find({
            isDeleted: false,
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Organizations fetched successfully",
            data: organizations,
        });
    } catch (error) {
        console.error(
            "Get Organizations Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Get (GET) organization via Id
export const getOrganizationById = async (req: Request, res: Response) => {

    try {
        const { id } = req.params;

        if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid organization ID",
            });
            return;
        }

        const organization = await Organization.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!organization) {
            res.status(404).json({
                success: false,
                message: "Organization not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Organization fetched successfully",
            data: organization,
        });
    } catch (error) {
        console.error(
            "Get Organization Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Update (PUT) organization via Id
export const updateOrganization = async (req: Request, res: Response) => {

    try {
        const { id } = req.params;

        if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid organization ID",
            });
            return;
        }

        const validation = organizationSchema.safeParse(req.body);

        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validation.error.flatten(),
            });
            return;
        }

        const organization = await Organization.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!organization) {
            res.status(404).json({
                success: false,
                message: "Organization not found",
            });
            return;
        }

        const updatedOrganization =
            await Organization.findByIdAndUpdate(
                id,
                {
                    ...validation.data,
                    organizationCode:
                        validation.data.organizationCode.toUpperCase(),
                },
                {
                    new: true,
                    runValidators: true,
                }
            );

        res.status(200).json({
            success: true,
            message: "Organization updated successfully",
            data: updatedOrganization,
        });
    } catch (error) {
        console.error(
            "Update Organization Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


// Delete (DELETE) organization via Id
export const deleteOrganization = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid organization ID",
            });
            return;
        }

        const organization =
            await Organization.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                {
                    isDeleted: true,
                    isActive: false,
                },
                {
                    new: true,
                }
            );

        if (!organization) {
            res.status(404).json({
                success: false,
                message: "Organization not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Organization deleted successfully",
        });
    } catch (error) {
        console.error(
            "Delete Organization Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};