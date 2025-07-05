import prisma from "../db/db.config.js";

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

export { getSubjects };
