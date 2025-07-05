import prisma from "../db/db.config.js";

export const storeNotification = async (userId, message) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        message,
      },
    });
  } catch (err) {
    console.error("Error storing notification:", err.message);
  }
};

export const fillTemplate = (template, data) => {
  return template.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || "");
};
