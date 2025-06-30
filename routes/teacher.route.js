import { Router } from "express";
import { getSubjects } from "../controllers/teacher.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const teacherRouter = Router();

teacherRouter.route("/getSubjects").get(protectRoute, getSubjects);

export default teacherRouter;
