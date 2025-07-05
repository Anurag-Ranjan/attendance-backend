import { Router } from "express";
import {
  getStudentAnalytics,
  getSubjects,
  getAttendanceSheet,
} from "../controllers/teacher.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const teacherRouter = Router();

teacherRouter.route("/getSubjects/:token").get(protectRoute, getSubjects);
teacherRouter
  .route("/analytics/students/:token")
  .get(protectRoute, getStudentAnalytics);
teacherRouter
  .route("/attendance/export/:token")
  .get(protectRoute, getAttendanceSheet);

export default teacherRouter;
