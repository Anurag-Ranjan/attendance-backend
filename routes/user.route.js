import { Router } from "express";
import {
  loginOtpSend,
  loginOtpVerify,
  verifyRefreshToken,
  getUserProfile,
} from "../controllers/user.controller.js";
import { storeFcm } from "../controllers/storefcm.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/loginOtpSend").post(loginOtpSend);
userRouter.route("/loginOtpVerify").post(loginOtpVerify);
userRouter.route("/verifyToken").post(verifyRefreshToken);
userRouter.route("/storeFcm").post(storeFcm);
userRouter.route("/me/:token").post(protectRoute, getUserProfile);

export default userRouter;
