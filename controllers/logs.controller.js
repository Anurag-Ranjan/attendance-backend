import prisma from "../db/db.config.js";

export const getTeacherLogs = async (req, res) => {
  try {
    const teacherId = req.userId;

    const records = await prisma.attendance.findMany({
      where: {
        teacher_id: teacherId,
      },
      include: {
        subject: true,
        class: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    const logs = records.map((record) => {
      const studentMap = record.student_records ?? {};
      const present = Object.values(studentMap).filter(
        (val) => val.status === "present"
      ).length;
      const total = Object.keys(studentMap).length;

      return {
        subject: record.subject.name,
        branch: record.class.branch,
        semester: record.class.semester,
        total,
        present,
        absent: total - present,
        time: record.session_start?.toTimeString().slice(0, 8) || "00:00:00",
        date: record.date.toISOString().slice(0, 10),
      };
    });

    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    console.error("Error fetching teacher logs:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getStudentLogs = async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Get student info
    const student = await prisma.student.findUnique({
      where: { id: userId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    // 2. Fetch attendance records for the student's class
    const records = await prisma.attendance.findMany({
      where: {
        class_id: student.class_id,
      },
      include: {
        subject: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    // 3. Format into logs
    const logs = [];

    for (const record of records) {
      const studentData = record.student_records?.[student.id];

      // If student was marked, include the log
      if (studentData) {
        logs.push({
          subject: record.subject.name,
          status: studentData.status === "present" ? "SUCCESS" : "FAILED",
          time: record.session_start
            ? record.session_start.toTimeString().slice(0, 8)
            : "00:00:00",
          date: record.date.toISOString().slice(0, 10),
        });
      }
    }

    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    console.error("Error in getStudentAttendanceLogs:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
