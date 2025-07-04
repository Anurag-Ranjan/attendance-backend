import prisma from "../db/db.config.js";

export const getSubjectsWithAttendance = async (req, res) => {
  try {
    const userId = req.userId;

    // Step 1: Get student by user ID
    const student = await prisma.student.findUnique({
      where: { id: userId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    // Step 2: Get all subjects for the student's class
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        class_id: student.class_id,
      },
      include: {
        subject: true,
      },
    });

    // Step 3: Get teacher info for each subject (from TeacherClass)
    const teacherAssignments = await prisma.teacherClass.findMany({
      where: {
        class_id: student.class_id,
        subject_id: { in: classSubjects.map((cs) => cs.subject_id) },
      },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    // Step 4: Get all attendance records for the student's class
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        class_id: student.class_id,
      },
      include: {
        subject: true,
      },
    });

    // Step 5: Build summary
    const summaryMap = new Map();

    for (const { subject } of classSubjects) {
      summaryMap.set(subject.id, {
        id: subject.id,
        name: subject.name,
        subcode: subject.code,
        professor:
          teacherAssignments.find((t) => t.subject_id === subject.id)?.teacher
            ?.user.name || "N/A",
        total: 0,
        present: 0,
      });
    }

    for (const att of attendanceRecords) {
      const records = att.student_records || {};
      const studentData = records[student.id];

      const summary = summaryMap.get(att.subject_id);
      if (!summary) continue;

      summary.total += 1;
      if (studentData?.status === "present") {
        summary.present += 1;
      }
    }

    const result = Array.from(summaryMap.values());

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("getSubjectsWithAttendance error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// export const getSubjectsWithAttendance = async (req, res) => {
//   try {
//     const userId = req.userId;

//     // Step 1: Get student by user ID
//     const student = await prisma.student.findUnique({
//       where: { id: userId },
//     });

//     console.log(student);
//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: "Student profile not found.",
//       });
//     }

//     // Step 2: Get all attendance records for the student's class
//     const attendanceRecords = await prisma.attendance.findMany({
//       where: {
//         class_id: student.class_id,
//       },
//       include: {
//         subject: true,
//         teacher: {
//           include: {
//             user: true,
//           },
//         },
//       },
//     });

//     // Step 3: Build summary
//     const summaryMap = new Map();

//     for (const att of attendanceRecords) {
//       const records = att.student_records || {};
//       const studentData = records[student.id]; // object like { status: "present" }

//       const subjectId = att.subject.id;

//       if (!summaryMap.has(subjectId)) {
//         summaryMap.set(subjectId, {
//           id: subjectId,
//           name: att.subject.name,
//           subcode: att.subject.code,
//           professor: att.teacher.user.name,
//           total: 0,
//           present: 0,
//         });
//       }

//       const summary = summaryMap.get(subjectId);
//       summary.total += 1;
//       if (studentData?.status === "present") {
//         summary.present += 1;
//       }
//     }

//     const result = Array.from(summaryMap.values());

//     res.status(200).json({
//       success: true,
//       data: result,
//     });
//   } catch (err) {
//     console.error("getStudentAttendanceSummary error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

//{"0961c56a-be38-4d2a-aae3-2815fc9f6c9f":{"status":"present"},"23c9e118-63a3-4b39-9614-c275706fdaa6":{"status":"absent"},"33d4e74d-7ba5-4460-b6a3-3bf9263d8ac4":{"status":"present"},"babdaaca-16d6-4125-b7af-68fc64d4957a":{"status":"absent"},"ea89c8be-9597-49c5-8e0c-bc118389a0e3":{"status":"present"}}

//get data wise attendance record of subject
export const getSubjectWiseMonthlyAttendance = async (req, res) => {
  try {
    const userId = req.userId;
    const { month, year, subject_id } = req.query;

    // Validate input parameters
    if (!month || !year || !subject_id) {
      return res.status(400).json({
        success: false,
        message: "Month, year, and subject_id are required parameters",
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validate month and year ranges
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: "Month must be between 1 and 12",
      });
    }

    if (yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({
        success: false,
        message: "Year must be between 2000 and 2100",
      });
    }

    // Step 1: Get student by user ID
    const student = await prisma.student.findUnique({
      where: { id: userId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    // Step 2: Verify subject exists and is assigned to student's class
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        class_id_subject_id: {
          class_id: student.class_id,
          subject_id: subject_id,
        },
      },
      include: {
        subject: true,
      },
    });

    if (!classSubject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found for this student's class.",
      });
    }

    // Step 3: Calculate date range for the requested month
    const startDate = new Date(yearNum, monthNum - 2, 1); // previous month
    const endDate = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999); // end of next month

    // Step 4: Get attendance records for the specific subject, class, and date range
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        class_id: student.class_id,
        subject_id: subject_id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Step 5: Process attendance data
    const attendanceMap = {};

    for (const attendance of attendanceRecords) {
      const attendanceDate = new Date(attendance.date);
      const dateKey = attendanceDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD

      // Get student's attendance record from the JSON field
      const studentRecords = attendance.student_records || {};
      const studentData = studentRecords[student.id];

      if (studentData && studentData.status) {
        attendanceMap[dateKey] = studentData.status;
      }
    }

    // Step 6: Return the attendance data in the requested format
    res.status(200).json({
      success: true,
      data: attendanceMap,
      meta: {
        month: monthNum,
        year: yearNum,
        subject: {
          id: classSubject.subject.id,
          name: classSubject.subject.name,
          code: classSubject.subject.code,
        },
        totalDaysWithAttendance: Object.keys(attendanceMap).length,
      },
    });
  } catch (err) {
    console.error("getSubjectWiseMonthlyAttendance error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Additional controller for getting attendance summary stats for a subject in a month
export const getSubjectAttendanceSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const { month, year, subject_id } = req.query;

    // Validate input parameters
    if (!month || !year || !subject_id) {
      return res.status(400).json({
        success: false,
        message: "Month, year, and subject_id are required parameters",
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validate month and year ranges
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: "Month must be between 1 and 12",
      });
    }

    // Step 1: Get student by user ID
    const student = await prisma.student.findUnique({
      where: { id: userId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    // Step 2: Calculate date range for the requested month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);

    // Step 3: Get attendance records for the specific subject, class, and date range
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        class_id: student.class_id,
        subject_id: subject_id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        subject: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Step 4: Process attendance data for summary
    let totalClasses = 0;
    let presentCount = 0;
    let absentCount = 0;
    const attendanceMap = {};

    for (const attendance of attendanceRecords) {
      const attendanceDate = new Date(attendance.date);
      const dateKey = attendanceDate.toISOString().split("T")[0];

      const studentRecords = attendance.student_records || {};
      const studentData = studentRecords[student.id];

      if (studentData && studentData.status) {
        totalClasses++;
        attendanceMap[dateKey] = studentData.status;

        if (studentData.status === "present") {
          presentCount++;
        } else if (studentData.status === "absent") {
          absentCount++;
        }
      }
    }

    // Calculate attendance percentage
    const attendancePercentage =
      totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

    // Step 5: Return summary data
    res.status(200).json({
      success: true,
      data: attendanceMap,
      summary: {
        totalClasses,
        presentCount,
        absentCount,
        attendancePercentage,
        month: monthNum,
        year: yearNum,
        subject: {
          id: subject_id,
          name: attendanceRecords[0]?.subject?.name || "Unknown",
          code: attendanceRecords[0]?.subject?.code || "Unknown",
        },
      },
    });
  } catch (err) {
    console.error("getSubjectAttendanceSummary error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
