export enum UserRole {
    SUPER_ADMIN = "super-admin",
    ADMIN = "admin",
    EMPLOYEE = "employee",
}

export interface IAuthentication {
    email?: string;
    employeeId?: string;
    password: string;
    role: UserRole;
}