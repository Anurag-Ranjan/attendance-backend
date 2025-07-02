import { Router } from "express";
import { getSubjectsWithAttendance } from "../controllers/student.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const studentRouter = Router();

studentRouter
  .route("/getSubjects/:token")
  .get(protectRoute, getSubjectsWithAttendance);

export default studentRouter;
