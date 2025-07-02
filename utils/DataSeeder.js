import {
  Department,
  Gender,
  Role,
  Semester,
} from "../generated/prisma/index.js";

import prisma from "../db/db.config.js";

async function seedExtendedData() {
  console.log("🌱 Starting extended database seeding...");

  try {
    // 1. Create more subjects
    const subjectData = [
      { code: "CS102", name: "Data Structures" },
      { code: "CS103", name: "Operating Systems" },
      { code: "MA101", name: "Calculus" },
      { code: "PH101", name: "Physics" },
      { code: "EC101", name: "Basic Electronics" },
    ];

    const subjects = [];
    for (const sub of subjectData) {
      const s = await prisma.subject.create({ data: sub });
      subjects.push(s);
    }
    console.log(`✓ Created ${subjects.length} subjects`);

    // 2. Create more classes
    const classData = [
      { code: "CSE-2", branch: Department.CSE, semester: Semester.II },
      { code: "ECE-1", branch: Department.ECE, semester: Semester.I },
      { code: "ME-1", branch: Department.ME, semester: Semester.I },
    ];

    const classes = [];
    for (const cls of classData) {
      const c = await prisma.class.create({ data: cls });
      classes.push(c);
    }
    console.log(`✓ Created ${classes.length} classes`);

    // 3. Link subjects to new classes
    for (const cls of classes) {
      for (const subject of subjects) {
        await prisma.classSubject.create({
          data: {
            class_id: cls.id,
            subject_id: subject.id,
          },
        });
      }
    }
    console.log("✓ Linked subjects to new classes");

    // 4. Create more teachers
    const teachers = [];
    for (let i = 2; i <= 4; i++) {
      const user = await prisma.user.create({
        data: {
          name: `Teacher ${i}`,
          email: `teacher${i}@test.com`,
          department: Department.CSE,
          role: Role.teacher,
          gender: i % 2 === 0 ? Gender.male : Gender.female,
        },
      });

      const teacher = await prisma.teacher.create({
        data: {
          id: user.id,
          teacher_id_no: `T00${i}`,
        },
      });

      teachers.push({ ...teacher, user });
    }
    console.log(`✓ Created ${teachers.length} teachers`);

    // 5. Assign teachers randomly to classes and subjects
    for (const teacher of teachers) {
      for (const cls of classes) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        await prisma.teacherClass.create({
          data: {
            teacher_id: teacher.id,
            class_id: cls.id,
            subject_id: subject.id,
          },
        });
      }
    }
    console.log("✓ Assigned teachers to classes and subjects");

    // 6. Create more students
    const allStudents = [];
    for (const cls of classes) {
      for (let i = 1; i <= 5; i++) {
        const user = await prisma.user.create({
          data: {
            name: `Student_${cls.code}_${i}`,
            email: `student_${cls.code}_${i}@test.com`,
            department: cls.branch,
            role: Role.student,
            gender: i % 2 === 0 ? Gender.female : Gender.male,
          },
        });

        const student = await prisma.student.create({
          data: {
            id: user.id,
            class_id: cls.id,
            year: 1,
            reg_no: `${cls.code.toUpperCase()}${100 + i}`,
          },
        });

        allStudents.push({ ...student, user });
      }
    }
    console.log(`✓ Created ${allStudents.length} students`);

    console.log(
      "✅ Extended seeding completed without attendance or notifications"
    );
  } catch (err) {
    console.error("❌ Error during extended seeding:", err);
  } finally {
    await prisma.$disconnect();
  }
}

seedExtendedData();

// import {
//   Department,
//   Gender,
//   Role,
//   AttendanceStatus,
//   Semester,
// } from "../generated/prisma/index.js";

// import prisma from "../db/db.config.js";

// /**
//  * Seed minimal test data for the attendance management system
//  */
// async function seedMinimalData() {
//   console.log("🌱 Starting minimal database seeding for testing...");

//   try {
//     // 1. Create one subject
//     const subject = await prisma.subject.create({
//       data: {
//         code: "CS101",
//         name: "Introduction to Computer Science",
//       },
//     });
//     console.log("✓ Created subject:", subject.name);

//     // 2. Create one class
//     const classObj = await prisma.class.create({
//       data: {
//         code: "CSE-1",
//         branch: Department.CSE,
//         semester: Semester.I,
//       },
//     });
//     console.log("✓ Created class:", classObj.code);

//     // 3. Connect subject to class
//     await prisma.classSubject.create({
//       data: {
//         class_id: classObj.id,
//         subject_id: subject.id,
//       },
//     });
//     console.log("✓ Connected subject to class");

//     // 4. Create admin user
//     const admin = await prisma.user.create({
//       data: {
//         name: "Admin User",
//         email: "admin@test.com",
//         department: Department.CSE,
//         role: Role.admin,
//         gender: Gender.other,
//       },
//     });
//     console.log("✓ Created admin user:", admin.email);

//     // 5. Create one teacher
//     const teacherUser = await prisma.user.create({
//       data: {
//         name: "Test Teacher",
//         email: "teacher@test.com",
//         department: Department.CSE,
//         role: Role.teacher,
//         gender: Gender.male,
//       },
//     });

//     const teacher = await prisma.teacher.create({
//       data: {
//         id: teacherUser.id,
//         teacher_id_no: "T001",
//       },
//     });
//     console.log("✓ Created teacher:", teacherUser.name);

//     // 6. Assign teacher to class and subject
//     await prisma.teacherClass.create({
//       data: {
//         teacher_id: teacher.id,
//         class_id: classObj.id,
//         subject_id: subject.id,
//       },
//     });
//     console.log("✓ Assigned teacher to class and subject");

//     // 7. Create three students
//     const students = [];

//     for (let i = 1; i <= 3; i++) {
//       const studentUser = await prisma.user.create({
//         data: {
//           name: `Student ${i}`,
//           email: `student${i}@test.com`,
//           department: Department.CSE,
//           role: Role.student,
//           gender: i % 2 === 0 ? Gender.female : Gender.male,
//         },
//       });

//       const student = await prisma.student.create({
//         data: {
//           id: studentUser.id,
//           class_id: classObj.id,
//           year: 1,
//           reg_no: `CSE${1000 + i}`,
//         },
//       });

//       students.push({ ...student, user: studentUser });
//     }
//     console.log("✓ Created 3 test students");

//     // 8. Create one attendance record
//     const today = new Date();

//     // Create records for student attendance (using JSONB)
//     const studentRecords = students.map((student, index) => ({
//       student_id: student.id,
//       status: index === 0 ? AttendanceStatus.absent : AttendanceStatus.present, // First student absent, rest present
//     }));

//     const attendance = await prisma.attendance.create({
//       data: {
//         class_id: classObj.id,
//         subject_id: subject.id,
//         teacher_id: teacher.id,
//         date: today,
//         session_start: new Date(today.setHours(9, 0, 0)), // 9:00 AM
//         session_end: new Date(today.setHours(10, 0, 0)), // 10:00 AM
//         student_records: studentRecords,
//       },
//     });
//     console.log(
//       "✓ Created attendance record with",
//       studentRecords.length,
//       "student records"
//     );

//     // Return created data for reference
//     return {
//       admin,
//       teacher: { ...teacher, user: teacherUser },
//       class: classObj,
//       subject,
//       students,
//       attendance,
//     };
//   } catch (error) {
//     console.error("❌ Error seeding data:", error);
//     throw error;
//   }
// }

// // Run the seeder
// seedMinimalData()
//   .then((data) => {
//     console.log("✅ Database seeding completed successfully!");
//     console.log("Summary of created data:");
//     console.log(`- Admin: ${data.admin.email}`);
//     console.log(
//       `- Teacher: ${data.teacher.user.name} (${data.teacher.teacher_id_no})`
//     );
//     console.log(
//       `- Class: ${data.class.code} (${data.class.branch} - ${data.class.semester})`
//     );
//     console.log(`- Subject: ${data.subject.name} (${data.subject.code})`);
//     console.log(`- Students: ${data.students.length}`);
//     console.log(`- Attendance Records: 1`);
//   })
//   .catch((e) => {
//     console.error("Error during seeding:", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
