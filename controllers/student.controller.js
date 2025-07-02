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
