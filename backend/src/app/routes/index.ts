import { Router } from "express";
import { onBoardingRouter } from "../modules/onBoarding/onBoarding.routes";
import { authenticationRouter } from "../modules/authentication/auth.routes";
import { organizationRouter } from "../modules/organization/organization.routes";
import { employeeRouter } from "../modules/employee/employee.routes";
import { leaveAppRouter } from "../modules/leave/leave.routes";
const router = Router();

const moduleRoutes = [
    {
        path: '/on-boarding',
        route: onBoardingRouter
    },
    {
        path: '/auth',
        route: authenticationRouter
    },
    {
        path: "/organizations",
        route: organizationRouter
    },
    {
        path: "/employee",
        route: employeeRouter
    },
    {
        path: "/leave",
        route: leaveAppRouter
    }
]

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;