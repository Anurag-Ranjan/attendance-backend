import prisma from "../db/db.config.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new ApiError(401, "Unauthorized: User ID missing");
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formatDateGroup = (date) => {
      const d = new Date(date);
      const isToday = d.toDateString() === today.toDateString();
      const isYesterday = d.toDateString() === yesterday.toDateString();

      if (isToday) return "Today";
      if (isYesterday) return "Yesterday";

      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    };

    const grouped = {};

    notifications.forEach((notif) => {
      const groupKey = formatDateGroup(notif.createdAt);
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(notif.message);
    });

    const groupedNotifications = Object.keys(grouped).map((date) => ({
      date,
      items: grouped[date],
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          groupedNotifications,
          "Grouped user notifications fetched successfully"
        )
      );
  } catch (err) {
    console.error("Error fetching grouped notifications:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};
