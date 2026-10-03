import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import { Request } from 'express'; // Import the Request type

dotenv.config();

// Configure cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        let folder = "hrms";

        if (req.baseUrl.includes("onboarding")) {
            folder = "hrms/onboarding";
        } else if (req.baseUrl.includes("employee")) {
            folder = "hrms/employee";
        } else if (req.baseUrl.includes("leave")) {
            folder = "hrms/leave";
        }

        return {
            folder,
            allowed_formats: [
                "jpg",
                "jpeg",
                "png",
                "webp",
                "pdf",
            ],
            resource_type: "auto",
        };
    },
});

const upload = multer({
    storage,
});

export default upload;