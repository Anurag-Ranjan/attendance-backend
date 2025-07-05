import { Router } from "express";
import { getUserNotifications } from "../controllers/notification.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const notificationRouter = Router();

notificationRouter
  .route("/getNotification/:token")
  .get(protectRoute, getUserNotifications);

export default notificationRouter;
