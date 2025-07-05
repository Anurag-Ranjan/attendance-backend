import prisma from "../db/db.config.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { notificationTemplate } from "../utils/notificationTemplates.js";
import {
  fillTemplate,
  storeNotification,
} from "../helpers/notification.helper.js";
import jwt from "jsonwebtoken";
import validateLocation from "../utils/checkLocation.js";
import { sendPushNotification } from "../utils/sendNotification.js";
import client from "../utils/redisClient.js";

const startSession = async (req, res) => {
  const {
    branch,
    semester,
    subjectName,
    token,
    teacherLatitude,
    teacherLongitude,
  } = req.body;

  try {
    let records = [];

    if (!token) {
      throw new ApiError(400, "Invalid login");
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const teacherId = decodedToken.userId;

    if (!teacherId) {
      throw new ApiError(400, "Wrong token provided");
    }

    const classObj = await prisma.class.findFirst({
      where: {
        branch,
        semester,
        subjects: {
          some: {
            subject: {
              name: subjectName,
            },
          },
        },
        teacherClasses: {
          some: {
            teacher_id: teacherId,
            subject: {
              name: subjectName,
            },
          },
        },
      },
    });

    if (!classObj) {
      throw new Error("No matching class found with the given parameters");
    }

    const students = await prisma.student.findMany({
      where: {
        class_id: classObj.id,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            gender: true,
            department: true,
            fcmToken: true,
          },
        },
      },
      orderBy: {
        reg_no: "asc",
      },
    });

    const fcmTokens = students
      .map((student) => student.user.fcmToken)
      .filter((token) => token);

    const sessionStart = new Date();
    const sessionEnd = new Date(sessionStart.getTime() + 3 * 60 * 1000);

    const studentRecords = students.reduce((acc, student) => {
      acc[student.id] = { status: "absent" };
      return acc;
    }, {});

    const subject = await prisma.subject.findFirst({
      where: {
        name: subjectName,
      },
      select: {
        id: true,
      },
    });

    const attendance = await prisma.attendance.create({
      data: {
        class_id: classObj.id,
        subject_id: subject.id,
        teacher_id: teacherId,
        teacherLatitude,
        teacherLongitude,
        date: sessionStart,
        session_start: sessionStart,
        session_end: sessionEnd,
        student_records: studentRecords,
      },
    });

    // Get existing Redis data (if any)
    const existingData = await client.get("attendance_records");
    records = existingData ? JSON.parse(existingData) : [];

    records.push({
      attendanceId: attendance.id,
      teacherLatitude: attendance.teacherLatitude,
      teacherLongitude: attendance.teacherLongitude,
      teacherId: teacherId,
      studentRecords: studentRecords,
    });

    const data = { attendanceId: attendance.id };

    sendPushNotification(
      fcmTokens,
      "Kindly Mark your attendance",
      "Click this notification to mark your attendance",
      data
    );

    const attendanceMessage = fillTemplate(
      notificationTemplate.student.attendance,
      {
        subject: subjectName,
      }
    );

    await Promise.all(
      students.map((student) =>
        storeNotification(student.id, attendanceMessage)
      )
    );

    await client.set(
      `attendance_session:${attendance.id}`,
      JSON.stringify(records)
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { students, attendanceId: attendance.id },
          "Students fetched and attendance session started"
        )
      );
  } catch (error) {
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
};

const getMarked = async (req, res) => {
  try {
    const { attendanceId, token, studentLat, studentLon } = req.body;

    if (!token) {
      throw new ApiError(400, "Invalid login");
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const selectedUser = decodedToken.userId;

    if (!selectedUser) {
      throw new ApiError(400, "Wrong token provided");
    }

    //Fetch attendance session from Redis using formatted key
    const redisKey = `attendance_session:${attendanceId}`;
    const sessionData = await client.get(redisKey);

    if (!sessionData) {
      throw new ApiError(404, "Attendance session not found in Redis");
    }

    const attendance = JSON.parse(sessionData);

    console.log(attendance[0]);

    // Step 2: Validate location
    const isPresentInRadius = validateLocation(
      parseFloat(attendance[0].teacherLatitude),
      parseFloat(attendance[0].teacherLongitude),
      parseFloat(studentLat),
      parseFloat(studentLon),
      1
    );

    console.log(attendance[0].teacherLatitude);
    console.log(attendance[0].teacherLongitude);

    if (!isPresentInRadius) {
      return res.status(403).json({
        message: "Student not within required range. Attendance not marked.",
      });
    }

    //Update student_records in Redis
    attendance[0].studentRecords[selectedUser] = { status: "present" };

    await client.set(redisKey, JSON.stringify(attendance));

    console.log("Attendance marked present in Redis for student", selectedUser);

    return res.status(200).json({ message: "You have been marked persent" });
  } catch (error) {
    console.error("Error in getMarked:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

const endSession = async (req, res) => {
  try {
    const { token, attendanceId } = req.body;

    if (!token) {
      throw new ApiError(400, "Invalid Request");
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const teacherId = decodedToken.userId;

    if (!teacherId) {
      throw new ApiError(400, "Wrong token provided");
    }

    //Fetch attendance session from Redis
    const redisKey = `attendance_session:${attendanceId}`;
    const sessionData = await client.get(redisKey);

    if (!sessionData) {
      throw new ApiError(404, "Attendance session not found in Redis");
    }

    const attendance = JSON.parse(sessionData);

    //Validate teacher ID matches session (optional but recommended)
    if (attendance[0].teacherId !== teacherId) {
      throw new ApiError(403, "Unauthorized access to this attendance session");
    }

    //Get student records
    const studentRecords = attendance[0].studentRecords || {};
    const studentIds = Object.keys(studentRecords);

    // Step 4: Fetch student names from DB
    const studentsWithStatus = await prisma.student.findMany({
      where: {
        id: {
          in: studentIds,
        },
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    //Combine records
    const combinedList = studentsWithStatus.map((student) => ({
      id: student.id,
      name: student.user.name,
      status: studentRecords[student.id]?.status || "absent",
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { combinedList, attendanceId },
          "Records sent successfully"
        )
      );
  } catch (error) {
    console.error("Error in endSession:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

// const storeRecords = async (req, res) => {
//   try {
//     const { attendanceRecords, attendanceId } = req.body;

//     // Check for required fields
//     if (!attendanceRecords || !attendanceId) {
//       throw new ApiError(400, "attendanceRecords or attendanceId missing");
//     }

//     // Convert to studentRecords format (ID: {status})
//     const studentRecords = {};
//     for (const record of attendanceRecords) {
//       studentRecords[record.id] = {
//         status: record.status, // mark each student as present/absent
//       };
//     }

//     // Update the attendance record in the database with the new student records
//     const updatedAttendance = await prisma.attendance.update({
//       where: {
//         id: attendanceId, // Match attendance by ID
//       },
//       data: {
//         student_records: studentRecords, // Update the student_records JSON field
//       },
//     });

//     const redisKey = `attendance_session:${attendanceId}`;
//     await client.del(redisKey);

//     // Send response with updated attendance
//     return res
//       .status(200)
//       .json(
//         new ApiResponse(
//           200,
//           updatedAttendance,
//           "Attendance records updated successfully"
//         )
//       );
//   } catch (err) {
//     console.error("Error updating attendance:", err);
//     return res.status(500).json(new ApiError(500, "Internal Server Error"));
//   }
// };

const storeRecords = async (req, res) => {
  try {
    const { attendanceRecords, attendanceId } = req.body;

    if (!attendanceRecords || !attendanceId) {
      throw new ApiError(400, "attendanceRecords or attendanceId missing");
    }

    // Build the student records format
    const studentRecords = {};
    for (const record of attendanceRecords) {
      studentRecords[record.id] = {
        status: record.status,
      };
    }

    // Update the DB attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: {
        id: attendanceId,
      },
      data: {
        student_records: studentRecords,
      },
      include: {
        subject: true,
      },
    });

    const redisKey = `attendance_session:${attendanceId}`;
    await client.del(redisKey);

    // Send notifications to students
    const attendanceDate = new Date(
      updatedAttendance.date
    ).toLocaleDateString();
    const subjectName = updatedAttendance.subject.name;

    // Get students’ user IDs (assuming Student model has relation to User)
    const studentIds = attendanceRecords.map((r) => r.id);

    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    // Prepare and send notifications
    await Promise.all(
      attendanceRecords.map(async (record) => {
        const student = students.find((s) => s.id === record.id);
        if (!student || !student.user) return;

        const status = record.status.toLowerCase(); // 'present' or 'absent'
        const template = notificationTemplate.student[status];

        const message = template
          .replace("{{subject}}", subjectName)
          .replace("{{date}}", attendanceDate);

        await storeNotification(student.user.id, message);
      })
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedAttendance,
          "Attendance records updated and notifications sent"
        )
      );
  } catch (err) {
    console.error("Error updating attendance:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const getActiveattendance = async (req, res) => {
  const { token } = req.body;

  try {
    if (!token) {
      throw new ApiError(400, "Invalid login");
    }

    // Decode the token and get the studentId
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const studentId = decodedToken.userId;

    if (!studentId) {
      throw new ApiError(400, "Wrong token provided");
    }

    // Get the current time
    const currentTime = new Date();

    // Find the active attendance record for the student where the session has not ended
    const attendance = await prisma.attendance.findFirst({
      where: {
        student_records: {
          path: [studentId],
          equals: { status: "absent" },
        },
        session_end: {
          gt: currentTime, // The session should not have ended yet
        },
      },
      select: {
        id: true,
        session_end: true,
        class: {
          select: {
            branch: true,
            semester: true,
          },
        },
        subject: {
          select: {
            name: true,
          },
        },
        teacher: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!attendance) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No active attendance session found"));
    }

    // Format session_end date
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    };

    const endTime = new Date(attendance.session_end).toLocaleString(
      "en-IN",
      options
    );

    // Prepare response data
    const responseData = {
      attendanceId: attendance.id,
      teacherName: attendance.teacher.user.name,
      branch: attendance.class.branch,
      semester: attendance.class.semester,
      subjectName: attendance.subject.name,
      endsAt: endTime,
    };

    return res
      .status(200)
      .json(
        new ApiResponse(200, responseData, "Active attendance session info")
      );
  } catch (error) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, error.message || "An error occurred"));
  }
};

const redisConnect = async (req, res) => {
  client.set("foo", "done");
  res.status(200).json({ message: "Redis pe gaya saaman" });
};

// TODO: Update records to be added

export {
  startSession,
  getMarked,
  storeRecords,
  endSession,
  getActiveattendance,
  redisConnect,
};
