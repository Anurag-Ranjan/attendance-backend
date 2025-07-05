import prisma from "../db/db.config.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import ExcelJS from "exceljs";

const getSubjects = async (req, res) => {
  try {
    const userId = req.userId;

    const teacher = await prisma.teacher.findUnique({
      where: { id: userId },
      include: {
        teacherClasses: {
          include: {
            class: true,
            subject: true,
          },
        },
      },
    });

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    }

    const semesterOrder = {
      I: 1,
      II: 2,
      III: 3,
      IV: 4,
      V: 5,
      VI: 6,
      VII: 7,
      VIII: 8,
    };

    const semesterMap = new Map();

    teacher.teacherClasses.forEach(({ class: cls, subject }) => {
      const semesterKey = `Sem ${cls.semester}`;
      if (!semesterMap.has(semesterKey)) {
        semesterMap.set(semesterKey, []);
      }

      semesterMap.get(semesterKey).push({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        branch: cls.branch,
      });
    });

    const result = Array.from(semesterMap.entries())
      .sort(([a], [b]) => {
        const semA = a.split(" ")[1];
        const semB = b.split(" ")[1];
        return semesterOrder[semA] - semesterOrder[semB];
      })
      .map(([semester, subjects]) => ({
        semester,
        subjects,
      }));

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Error in getTeacherSubjectsFromDB:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getStudentAnalytics = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { subjectId, semester } = req.body;

    if (!teacherId || !subjectId || !semester) {
      throw new ApiError(400, "Missing required parameters");
    }

    const teacherClasses = await prisma.teacherClass.findMany({
      where: {
        teacher_id: teacherId,
        subject_id: subjectId,
        class: {
          semester: semester,
        },
      },
      select: {
        class_id: true,
      },
    });

    const classIds = teacherClasses.map((tc) => tc.class_id);

    if (!classIds.length) {
      throw new ApiError(
        404,
        "No matching classes found for given subject and semester"
      );
    }

    const students = await prisma.student.findMany({
      where: {
        class_id: { in: classIds },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    // Step 3: Get all attendance records for that subject and classes
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        class_id: { in: classIds },
        subject_id: subjectId,
      },
    });

    // Step 4: Aggregate attendance per student
    const summaryMap = {};

    students.forEach((student) => {
      summaryMap[student.id] = {
        name: student.user.name,
        regNo: student.reg_no,
        present: 0,
        absent: 0,
      };
    });

    attendanceRecords.forEach((record) => {
      const studentRecords = record.student_records;

      for (const studentId in studentRecords) {
        const status = studentRecords[studentId]?.status;
        if (summaryMap[studentId]) {
          if (status === "present") summaryMap[studentId].present++;
          else if (status === "absent") summaryMap[studentId].absent++;
        }
      }
    });

    const summary = Object.values(summaryMap);

    return res
      .status(200)
      .json(
        new ApiResponse(200, summary, "Attendance summary fetched successfully")
      );
  } catch (err) {
    console.error("Error fetching attendance summary:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const getAttendanceSheet = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { subjectId, semester } = req.body;

    if (!teacherId || !subjectId || !semester) {
      throw new ApiError(400, "Missing required parameters");
    }

    // Step 1: Find relevant class_ids
    const teacherClasses = await prisma.teacherClass.findMany({
      where: {
        teacher_id: teacherId,
        subject_id: subjectId,
        class: {
          semester: semester,
        },
      },
      select: {
        class_id: true,
      },
    });

    const classIds = teacherClasses.map((tc) => tc.class_id);
    if (!classIds.length) {
      throw new ApiError(404, "No matching classes found");
    }

    // Step 2: Fetch students
    const students = await prisma.student.findMany({
      where: {
        class_id: { in: classIds },
      },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    const studentMap = {};
    students.forEach((student) => {
      studentMap[student.id] = {
        name: student.user.name,
        registrationNumber: student.reg_no,
        attendance: {},
      };
    });

    // Step 3: Get attendance records for that subject
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        subject_id: subjectId,
        class_id: { in: classIds },
      },
      orderBy: { date: "asc" }, // ensures columns are sorted by date
    });

    // Step 4: Map attendance by student & date
    attendanceRecords.forEach((record) => {
      const dateStr = record.date.toISOString().split("T")[0]; // YYYY-MM-DD

      const studentRecords = record.student_records;
      for (const studentId in studentRecords) {
        const status = studentRecords[studentId]?.status;
        if (studentMap[studentId]) {
          studentMap[studentId].attendance[dateStr] =
            status === "present" ? "P" : "A";
        }
      }
    });

    // Step 5: Return final array format
    const attendanceData = Object.values(studentMap);

    // Step 1: Create a workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance");

    // Step 2: Define columns
    const dateKeys = Object.keys(attendanceData[0].attendance);
    const columns = [
      { header: "Name", key: "name", width: 20 },
      { header: "Reg No.", key: "registrationNumber", width: 20 },
      ...dateKeys.map((date) => ({
        header: date,
        key: date,
        width: 15,
      })),
    ];

    worksheet.columns = columns;

    // Step 3: Add rows
    attendanceData.forEach((student) => {
      const row = {
        name: student.name,
        registrationNumber: student.registrationNumber,
        ...student.attendance, // keys are the dates
      };
      worksheet.addRow(row);
    });

    // Step 4: Set headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=attendance.xlsx"
    );

    // Step 5: Write the Excel file to the response
    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (err) {
    console.error("Failed to export attendance:", err);
    res.status(500).json(new ApiError(500, "Failed to export attendance"));
  }
};

export { getSubjects, getStudentAnalytics, getAttendanceSheet };
