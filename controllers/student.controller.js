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

    // Step 2: Get all attendance records for the student's class
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        class_id: student.class_id,
      },
      include: {
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    // Step 3: Build summary
    const summaryMap = new Map();

    for (const att of attendanceRecords) {
      const records = att.student_records || {};
      const studentData = records[student.id]; // object like { status: "present" }

      const subjectId = att.subject.id;

      if (!summaryMap.has(subjectId)) {
        summaryMap.set(subjectId, {
          id: subjectId,
          name: att.subject.name,
          subcode: att.subject.code,
          professor: att.teacher.user.name,
          total: 0,
          present: 0,
        });
      }

      const summary = summaryMap.get(subjectId);
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
    console.error("getStudentAttendanceSummary error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
