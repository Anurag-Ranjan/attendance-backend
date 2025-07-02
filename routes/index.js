import { Router } from "express";
import adminRouter from "./admin.route.js";
import userRouter from "./user.route.js";
import teacherRouter from "./teacher.route.js";
import homeRouter from "./home.route.js";
import attendanceRouter from "./attendance.route.js";
import studentRouter from "./student.route.js";
import logsRouter from "./logs.route.js";

const router = Router();

router.use("/admin", adminRouter);
router.use("/user", userRouter);
router.use("/teacher", teacherRouter);
router.use("/student", studentRouter);
router.use("/home", homeRouter);
router.use("/attendance", attendanceRouter);
router.use("/logs", logsRouter);

export { router };
