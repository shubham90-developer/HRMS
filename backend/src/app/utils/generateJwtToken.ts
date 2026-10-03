import jwt from "jsonwebtoken";

export const generateToken = (
    userId: string,
    role: string,
    employeeId?: string
) => {
    return jwt.sign(
        {
            // Must be "id" - the authenticate middleware reads decoded.id
            id: userId,
            role,
            employeeId,
        },
        process.env.JWT_SECRET as string,
        {
            expiresIn: "1d",
        }
    );
};
