import { Request, Response } from "express";
import z from "zod";
import { Onboarding } from "./onBoarding.model";
import { createOnboardingSchema } from "./onBoarding.validation";

export const createOnBoarding = async (req: Request, res: Response) => {

    try {

        const validatedData = createOnboardingSchema.parse(req.body);

        if (!req.file) {
            res.status(400).json({
                success: false,
                message: "OnBoarding image is required"
            });
            return;
        }

        const image = req.file.path;

        const onBoarding = await Onboarding.create({
            title: validatedData.title,
            description: validatedData.description,
            image,
            status: validatedData.status,
        })

        res.status(201).json({
            success: true,
            message: "Onboarding created successfully",
            data: onBoarding,
        });

    } catch (error) {

        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.issues,
            });
            return;
        }

        console.error("Create onboarding error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create onboarding",
        });
    }
}

export const getOnboarding = async (req: Request, res: Response): Promise<void> => {

    try {
        const onboarding = await Onboarding.find({
            status: "Active",
        }).sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            message: "Onboarding fetched successfully",
            data: onboarding,
        });
    } catch (error) {
        console.error("Get onboarding error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch onboarding",
        });
    }
};