// NexSchoola seed — creates test data for a Ghana secondary school
// Run: node prisma/seed.mjs
// Credentials controlled by env vars (see .env.local)
import { readFileSync } from "fs"
import { createRequire } from "module"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

// ── 1. Load .env.local ──────────────────────────────────────────
function loadEnv() {
  const files = [".env.local", ".env"]
  for (const f of files) {
    try {
      const lines = readFileSync(resolve(root, f), "utf-8").split("\n")
      for (const line of lines) {
        const t = line.trim()
        if (!t || t.startsWith("#")) continue
        const i = t.indexOf("=")
        if (i < 0) continue
        const k = t.slice(0, i).trim()
        const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "")
        if (k && !process.env[k]) process.env[k] = v
      }
    } catch { /* file not present */ }
  }
}
loadEnv()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error("❌ DATABASE_URL not set"); process.exit(1) }

const require = createRequire(import.meta.url)
const { neon } = require("@neondatabase/serverless")
const { hash } = require("bcryptjs")

const db = neon(DATABASE_URL)

function id() {
  return `c${Date.now()}${Math.random().toString(36).slice(2, 9)}`
}
function pause(ms) { return new Promise(r => setTimeout(r, ms)) }

/** Generate a random 16-char password */
function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

async function main() {
  console.log("🌱 NexSchoola seed starting…\n")

  // ── Check / create school ──────────────────────────────────────
  let [school] = await db`SELECT id, name, slug FROM schools WHERE slug = 'demo' LIMIT 1`

  if (!school) {
    const schoolId = id()
    await db`
      INSERT INTO schools (id, name, slug, country, currency, timezone, plan, "isActive", "createdAt", "updatedAt", language)
      VALUES (${schoolId}, 'Accra Academy', 'demo', 'GH', 'GHS', 'Africa/Accra', 'PRO', true, NOW(), NOW(), 'en')
    `
    school = { id: schoolId, name: "Accra Academy", slug: "demo" }
    console.log(`✅ School created: ${school.name}`)
  } else {
    // Update school name to something realistic
    await db`UPDATE schools SET name = 'Accra Academy', "updatedAt" = NOW() WHERE id = ${school.id}`
    school.name = "Accra Academy"
    console.log(`✅ School found: ${school.name} (slug: ${school.slug})`)
  }

  const schoolId = school.id

  // ── Admin user ────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@demo.com"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? generatePassword()
  const adminHash = await hash(adminPassword, 12)

  const [existingAdmin] = await db`SELECT id FROM users WHERE "schoolId" = ${schoolId} AND role = 'ADMIN' LIMIT 1`
  if (!existingAdmin) {
    const adminId = id()
    await db`
      INSERT INTO users (id, "schoolId", name, email, password, role, "isActive", "createdAt", "updatedAt")
      VALUES (${adminId}, ${schoolId}, 'School Admin', ${adminEmail}, ${adminHash}, 'ADMIN', true, NOW(), NOW())
    `
    console.log(`✅ Admin created: ${adminEmail}`)
  } else {
    await db`UPDATE users SET email = ${adminEmail}, password = ${adminHash}, "updatedAt" = NOW() WHERE id = ${existingAdmin.id}`
    console.log(`✅ Admin updated: ${adminEmail}`)
  }

  // ── Classes ────────────────────────────────────────────────────
  const classData = [
    { name: "JHS 1", section: "A" },
    { name: "JHS 1", section: "B" },
    { name: "JHS 2", section: "A" },
    { name: "JHS 2", section: "B" },
    { name: "JHS 3", section: "A" },
    { name: "SHS 1", section: "Science" },
    { name: "SHS 2", section: "Science" },
    { name: "SHS 3", section: "Science" },
  ]

  const classMap = {}
  for (const cls of classData) {
    const [existing] = await db`
      SELECT id FROM classes WHERE "schoolId" = ${schoolId} AND name = ${cls.name} AND section = ${cls.section} LIMIT 1
    `
    if (!existing) {
      const cid = id(); await pause(1)
      await db`
        INSERT INTO classes (id, "schoolId", name, section, capacity, "createdAt")
        VALUES (${cid}, ${schoolId}, ${cls.name}, ${cls.section}, 40, NOW())
      `
      classMap[`${cls.name}-${cls.section}`] = cid
      console.log(`  ✅ Class: ${cls.name} ${cls.section}`)
    } else {
      classMap[`${cls.name}-${cls.section}`] = existing.id
    }
  }

  // ── Subjects ────────────────────────────────────────────────────
  const subjectData = [
    { title: "Mathematics", code: "MATH", group: "GENERAL" },
    { title: "English Language", code: "ENG", group: "GENERAL" },
    { title: "Integrated Science", code: "SCI", group: "SCIENCE" },
    { title: "Social Studies", code: "SOC", group: "GENERAL" },
    { title: "Religious & Moral Education", code: "RME", group: "GENERAL" },
    { title: "Information Communication Technology", code: "ICT", group: "SCIENCE" },
    { title: "French", code: "FRE", group: "GENERAL" },
    { title: "Creative Arts", code: "ART", group: "ARTS" },
    { title: "Ghanaian Language", code: "GHL", group: "GENERAL" },
    { title: "Physical Education", code: "PE", group: "GENERAL" },
  ]

  const subjectMap = {}
  for (const sub of subjectData) {
    const [existing] = await db`
      SELECT id FROM subjects WHERE "schoolId" = ${schoolId} AND code = ${sub.code} LIMIT 1
    `
    if (!existing) {
      const sid = id(); await pause(1)
      await db`
        INSERT INTO subjects (id, "schoolId", title, code, "isOptional", "group")
        VALUES (${sid}, ${schoolId}, ${sub.title}, ${sub.code}, false, ${sub.group})
      `
      subjectMap[sub.code] = sid
    } else {
      subjectMap[sub.code] = existing.id
    }
  }
  console.log(`✅ Subjects: ${Object.keys(subjectMap).length} ready`)

  // ── Link subjects to JHS 1 A & B ──────────────────────────────
  const targetClassKeys = ["JHS 1-A", "JHS 1-B", "JHS 2-A", "JHS 3-A"]
  const coreCodes = ["MATH", "ENG", "SCI", "SOC", "RME", "ICT", "GHL"]
  for (const key of targetClassKeys) {
    const cid = classMap[key]
    if (!cid) continue
    for (const code of coreCodes) {
      const sid = subjectMap[code]
      if (!sid) continue
      try {
        await db`
          INSERT INTO class_subjects (id, "classId", "subjectId")
          VALUES (${id()}, ${cid}, ${sid})
          ON CONFLICT ("classId", "subjectId") DO NOTHING
        `
      } catch {}
      await pause(1)
    }
  }
  console.log("✅ Class-subject links set up")

  // ── Fee items ────────────────────────────────────────────────────
  const jhs1aId = classMap["JHS 1-A"]
  const feeData = [
    { title: "School Fees – Term 1", amount: 450, term: "Term 1", year: "2025" },
    { title: "School Fees – Term 2", amount: 450, term: "Term 2", year: "2025" },
    { title: "School Fees – Term 3", amount: 450, term: "Term 3", year: "2025" },
    { title: "PTA Levy", amount: 50, term: "Term 1", year: "2025" },
    { title: "Exam Fees (BECE)", amount: 120, term: "Term 3", year: "2025" },
    { title: "Sports & Cultural Levy", amount: 30, term: "Term 1", year: "2025" },
  ]
  for (const f of feeData) {
    const [existing] = await db`
      SELECT id FROM fee_items WHERE "schoolId" = ${schoolId} AND title = ${f.title} LIMIT 1
    `
    if (!existing) {
      const fid = id(); await pause(1)
      await db`
        INSERT INTO fee_items (id, "schoolId", "classId", title, amount, term, "academicYear", "isAnnual")
        VALUES (${fid}, ${schoolId}, ${null}, ${f.title}, ${f.amount}, ${f.term}, ${f.year}, false)
      `
    }
  }
  console.log("✅ Fee items created")

  // ── Students ────────────────────────────────────────────────────
  // roll = per-class roll number; sid = globally unique student ID code
  const studentData = [
    { name: "Kwame Asante",     email: "kwame@student.demo",  gender: "MALE",   roll: "001", sid: "ACA-2025-001", dob: "2009-03-15", classKey: "JHS 1-A" },
    { name: "Abena Mensah",     email: "abena@student.demo",  gender: "FEMALE", roll: "002", sid: "ACA-2025-002", dob: "2009-07-22", classKey: "JHS 1-A" },
    { name: "Kofi Boateng",     email: "kofi@student.demo",   gender: "MALE",   roll: "003", sid: "ACA-2025-003", dob: "2008-11-05", classKey: "JHS 1-A" },
    { name: "Ama Owusu",        email: "ama@student.demo",    gender: "FEMALE", roll: "004", sid: "ACA-2025-004", dob: "2009-01-30", classKey: "JHS 1-A" },
    { name: "Yaw Darko",        email: "yaw@student.demo",    gender: "MALE",   roll: "005", sid: "ACA-2025-005", dob: "2009-05-18", classKey: "JHS 1-A" },
    { name: "Akosua Frimpong",  email: "akosua@student.demo", gender: "FEMALE", roll: "001", sid: "ACA-2025-006", dob: "2009-08-12", classKey: "JHS 1-B" },
    { name: "Kweku Acheampong", email: "kweku@student.demo",  gender: "MALE",   roll: "002", sid: "ACA-2025-007", dob: "2008-12-03", classKey: "JHS 1-B" },
    { name: "Efua Quansah",     email: "efua@student.demo",   gender: "FEMALE", roll: "001", sid: "ACA-2025-008", dob: "2009-04-25", classKey: "JHS 2-A" },
    { name: "Nana Osei",        email: "nana@student.demo",   gender: "MALE",   roll: "002", sid: "ACA-2025-009", dob: "2008-02-14", classKey: "JHS 2-A" },
    { name: "Adwoa Amponsah",   email: "adwoa@student.demo",  gender: "FEMALE", roll: "001", sid: "ACA-2025-010", dob: "2008-09-09", classKey: "JHS 3-A" },
  ]

  const studentPassword = await hash("student123", 10)
  const createdStudents = []

  for (const s of studentData) {
    const [existingUser] = await db`SELECT id FROM users WHERE email = ${s.email} LIMIT 1`
    if (existingUser) {
      const [st] = await db`SELECT id FROM students WHERE "userId" = ${existingUser.id} LIMIT 1`
      if (st) createdStudents.push({ id: st.id, name: s.name })
      continue
    }

    const uid = id(); await pause(2)
    const sid = id(); await pause(2)
    const cid = classMap[s.classKey]
    const studentIdCode = s.sid

    await db`
      INSERT INTO users (id, "schoolId", name, email, password, role, "isActive", "createdAt", "updatedAt")
      VALUES (${uid}, ${schoolId}, ${s.name}, ${s.email}, ${studentPassword}, 'STUDENT', true, NOW(), NOW())
    `
    await db`
      INSERT INTO students (id, "schoolId", "userId", "classId", "rollNumber", "studentId", "dateOfBirth", gender, nationality, "isActive", "admissionDate")
      VALUES (${sid}, ${schoolId}, ${uid}, ${cid ?? null}, ${s.roll}, ${studentIdCode}, ${s.dob}, ${s.gender}, 'Ghanaian', true, NOW())
    `
    createdStudents.push({ id: sid, name: s.name })
    console.log(`  ✅ Student: ${s.name}`)
  }

  // ── Teacher ─────────────────────────────────────────────────────
  const teacherEmail = "teacher@demo.com"
  const [existingTeacher] = await db`SELECT id FROM users WHERE email = ${teacherEmail} LIMIT 1`
  if (!existingTeacher) {
    const tuid = id(); await pause(2)
    const tid = id(); await pause(2)
    const teacherHash = await hash("teacher123", 10)
    await db`
      INSERT INTO users (id, "schoolId", name, email, password, role, "isActive", "createdAt", "updatedAt")
      VALUES (${tuid}, ${schoolId}, 'Mr. Emmanuel Asante', ${teacherEmail}, ${teacherHash}, 'TEACHER', true, NOW(), NOW())
    `
    await db`
      INSERT INTO teachers (id, "schoolId", "userId", "teacherId", qualification, designation, department, "isActive", "joiningDate", "createdAt")
      VALUES (${tid}, ${schoolId}, ${tuid}, 'TCH-001', 'B.Ed Mathematics', 'Senior Teacher', 'Mathematics', true, NOW(), NOW())
    `
    console.log(`✅ Teacher created: ${teacherEmail} / teacher123`)
  }

  // ── Sample exam ─────────────────────────────────────────────────
  const [existingExam] = await db`SELECT id FROM exams WHERE "schoolId" = ${schoolId} AND title = 'Mid-Term Examination' LIMIT 1`
  let examId = existingExam?.id

  if (!existingExam) {
    examId = id(); await pause(1)
    await db`
      INSERT INTO exams (id, "schoolId", title, term, "academicYear", "startDate", "endDate", "isFinal", "isPublished", "createdAt")
      VALUES (${examId}, ${schoolId}, 'Mid-Term Examination', 'Term 1', '2025', '2025-03-10', '2025-03-14', false, true, NOW())
    `
    console.log("✅ Sample exam created: Mid-Term Examination")
  }

  // ── Sample marks for JHS 1 A students ────────────────────────────
  if (examId) {
    const jhs1aStudents = createdStudents.filter((_, i) => i < 5) // first 5 are JHS 1-A
    const markSubjects = ["MATH", "ENG", "SCI", "SOC", "RME"]
    const sampleScores = [
      [72, 85, 68, 79, 91],
      [88, 76, 82, 74, 89],
      [61, 70, 77, 83, 65],
      [94, 91, 88, 86, 92],
      [55, 63, 59, 71, 68],
    ]

    for (let si = 0; si < jhs1aStudents.length; si++) {
      const stu = jhs1aStudents[si]
      for (let subi = 0; subi < markSubjects.length; subi++) {
        const code = markSubjects[subi]
        const subjectId = subjectMap[code]
        if (!subjectId) continue
        const score = sampleScores[si]?.[subi] ?? 70
        const grade = score >= 80 ? "A+" : score >= 75 ? "A" : score >= 70 ? "B+" : score >= 65 ? "B" : score >= 60 ? "C+" : score >= 55 ? "C" : score >= 50 ? "D" : "F"
        try {
          await db`
            INSERT INTO subject_marks (id, "studentId", "subjectId", "examId", marks, grade)
            VALUES (${id()}, ${stu.id}, ${subjectId}, ${examId}, ${score}, ${grade})
            ON CONFLICT ("studentId", "subjectId", "examId") DO NOTHING
          `
        } catch {}
        await pause(1)
      }
    }
    console.log("✅ Sample exam marks entered")
  }

  // ── Platform config ─────────────────────────────────────────────
  const [existingConfig] = await db`SELECT id FROM platform_configs LIMIT 1`
  if (!existingConfig) {
    const cfgId = id()
    await db`
      INSERT INTO platform_configs (id, "feePerStudentTermly", "platformFeePercent", currency, "siteName", "updatedAt")
      VALUES (${cfgId}, 15, 0, 'GHS', 'NexSchoola', NOW())
    `
    console.log("✅ Platform config created (GH₵15/student/term)")
  }

  // ── Done ────────────────────────────────────────────────────────
  console.log("\n🎉 Seed complete!")
  console.log("════════════════════════════════════════")
  console.log("  SCHOOL ADMIN LOGIN")
  console.log("  School slug  : demo")
  console.log(`  Email        : ${adminEmail}`)
  console.log(`  Password     : ${adminPassword}`)
  console.log("  URL          : http://localhost:3000/login")
  console.log("────────────────────────────────────────")
  console.log("  TEACHER LOGIN")
  console.log("  School slug  : demo")
  console.log("  Email        : teacher@demo.com")
  console.log("  Password     : teacher123")
  console.log("────────────────────────────────────────")
  console.log("  SUPER ADMIN LOGIN")
  console.log(`  Email        : ${process.env.SEED_SUPER_ADMIN_EMAIL ?? "owner@nexschoola.com"}`)
  console.log(`  Password     : ${process.env.SEED_SUPER_ADMIN_PASSWORD ?? "(see server logs from /api/setup)"}`)
  console.log("  URL          : http://localhost:3000/login → Super Admin tab")
  console.log("════════════════════════════════════════")
  console.log("\n  DATA CREATED:")
  console.log("  • 8 classes (JHS 1-3, SHS 1-3)")
  console.log("  • 10 subjects (WAEC curriculum)")
  console.log("  • 10 students across JHS 1-3")
  console.log("  • 1 teacher (Mr. Emmanuel Asante)")
  console.log("  • 6 fee items (Term 1-3 fees + levies)")
  console.log("  • 1 exam with marks for JHS 1A students")
}

main().catch(e => { console.error("❌ Seed failed:", e.message); process.exit(1) })
