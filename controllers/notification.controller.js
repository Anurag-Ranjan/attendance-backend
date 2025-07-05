import prisma from "../db/db.config.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new ApiError(401, "Unauthorized: User ID not found");
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          notifications,
          "User notifications fetched successfully"
        )
      );
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};
