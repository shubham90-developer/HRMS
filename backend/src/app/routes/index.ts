import { Router } from "express";
import { onBoardingRouter } from "../modules/onBoarding/onBoarding.routes";
import { authenticationRouter } from "../modules/authentication/auth.routes";
import { organizationRouter } from "../modules/organization/organization.routes";
import { employeeRouter } from "../modules/employee/employee.routes";
import { leaveAppRouter } from "../modules/leave/leave.routes";
import { holidayRouter } from "../modules/holidays/holiday.routes";
import { recruitmentRouter } from "../modules/recruitment/recruitment.routes";
import { advertisementRouter } from "../modules/advertisement/advertisement.routes";
import { employeeDocumentRouter } from "../modules/employeeDocument/employeeDocument.routes";
const router = Router();

const moduleRoutes = [
  {
    path: "/on-boarding",
    route: onBoardingRouter,
  },
  {
    path: "/auth",
    route: authenticationRouter,
  },
  {
    path: "/organizations",
    route: organizationRouter,
  },
  {
    path: "/employee",
    route: employeeRouter,
  },
  {
    path: "/leave",
    route: leaveAppRouter,
  },
  {
    path: "/holidays",
    route: holidayRouter,
  },
  {
    path: "/recruitment",
    route: recruitmentRouter,
  },
  {
    path: "/advertisements",
    route: advertisementRouter,
  },
  {
    path: "/employee-documents",
    route: employeeDocumentRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
