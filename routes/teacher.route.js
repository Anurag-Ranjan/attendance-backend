import { Router } from "express";
import {
  getStudentAnalytics,
  getSubjects,
  getAttendanceSheet,
} from "../controllers/teacher.controller.js";
import { protectRoute, verifyToken } from "../middlewares/auth.middleware.js";

const teacherRouter = Router();

teacherRouter.route("/getSubjects/:token").get(protectRoute, getSubjects);
teacherRouter
  .route("/analytics/students")
  .get(verifyToken, getStudentAnalytics);
teacherRouter.route("/attendance/export").get(verifyToken, getAttendanceSheet);

export default teacherRouter;
