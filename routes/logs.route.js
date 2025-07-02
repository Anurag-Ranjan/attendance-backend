import { Router } from "express";
import {
  getStudentLogs,
  getTeacherLogs,
} from "../controllers/logs.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const logsRouter = Router();

logsRouter.route("/getTeacherLogs/:token").get(protectRoute, getTeacherLogs);
logsRouter.route("/getStudentLogs/:token").get(protectRoute, getStudentLogs);

export default logsRouter;
