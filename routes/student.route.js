import { Router } from "express";
import {
  getSubjectsWithAttendance,
  getSubjectWiseMonthlyAttendance,
} from "../controllers/student.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const studentRouter = Router();

studentRouter
  .route("/getSubjects/:token")
  .get(protectRoute, getSubjectsWithAttendance);
studentRouter
  .route("/getSubjectWiseMonthlyAttendance/:token")
  .get(protectRoute, getSubjectWiseMonthlyAttendance);
export default studentRouter;
