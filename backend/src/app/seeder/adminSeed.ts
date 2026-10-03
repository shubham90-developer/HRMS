import bcrypt from "bcryptjs";
import { Authentication, UserRole } from "../modules/authentication/auth.model";

/**
 * Creates the first super-admin account if none exists.
 * Credentials are read from environment variables (ADMIN_EMAIL, ADMIN_PASSWORD)
 * so that no default password is hardcoded in the source code.
 */
export const seedAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            console.warn(
                "ADMIN_EMAIL / ADMIN_PASSWORD not set - skipping super-admin seed."
            );
            return;
        }

        const existingAdmin = await Authentication.findOne({
            email: adminEmail,
        });

        if (existingAdmin) {
            console.log("Super Admin already exists.");
            return;
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await Authentication.create({
            email: adminEmail,
            password: hashedPassword,
            role: UserRole.SUPER_ADMIN,
            isActive: true,
        });

        console.log(`Super Admin created successfully (${adminEmail}).`);
    } catch (error) {
        console.error("Admin Seeder Error:", error);
    }
};
