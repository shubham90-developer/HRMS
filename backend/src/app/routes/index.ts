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
import { statutoryRouter } from "../modules/statutory/statutory.routes";
import { securityMasterRouter } from "../modules/securityMaster/securityMaster.routes";
import { discussionRouter } from "../modules/discussion/discussion.routes";
import { alertsRouter } from "../modules/alerts/alerts.routes";
import { trainingRouter } from "../modules/training/training.routes";
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
  {
    path: "/statutory",
    route: statutoryRouter,
  },
  {
    path: "/security-master",
    route: securityMasterRouter,
  },
  {
    path: "/discussion",
    route: discussionRouter,
  },
  {
    path: "/alerts",
    route: alertsRouter,
  },
  {
    path: "/training",
    route: trainingRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
