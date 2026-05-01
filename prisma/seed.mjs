// NexSchoola seed — creates test data for a Ghana secondary school
// Uses Bimoba family names for cultural authenticity in northern Ghana
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

const SCHOOL_NAME = "Christ Foundation Academy"
const SCHOOL_SLUG = "demo"

function id() {
  return `c${Date.now()}${Math.random().toString(36).slice(2, 9)}`
}
function pause(ms) { return new Promise(r => setTimeout(r, ms)) }

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

async function main() {
  console.log("🌱 NexSchoola seed starting…\n")

  // ── Check / create school ──────────────────────────────────────
  let [school] = await db`SELECT id, name, slug FROM schools WHERE slug = ${SCHOOL_SLUG} LIMIT 1`

  if (!school) {
    const schoolId = id()
    await db`
      INSERT INTO schools (id, name, slug, country, currency, timezone, plan, "isActive", "createdAt", "updatedAt", language)
      VALUES (${schoolId}, ${SCHOOL_NAME}, ${SCHOOL_SLUG}, 'GH', 'GHS', 'Africa/Accra', 'PRO', true, NOW(), NOW(), 'en')
    `
    school = { id: schoolId, name: SCHOOL_NAME, slug: SCHOOL_SLUG }
    console.log(`✅ School created: ${school.name}`)
  } else {
    await db`UPDATE schools SET name = ${SCHOOL_NAME}, "updatedAt" = NOW() WHERE id = ${school.id}`
    school.name = SCHOOL_NAME
    console.log(`✅ School updated: ${school.name} (slug: ${school.slug})`)
  }

  const schoolId = school.id

  // ── Additional placeholder schools (for super-admin view) ──────
  // These are empty shells — only the main "demo" school is seeded with data.
  const additionalSchools = [
    { name: "Global Links Academy",     slug: "globallinks",   plan: "PRO" },
    { name: "First Class Academy",      slug: "firstclass",    plan: "BASIC" },
    { name: "Future Leaders Academy",   slug: "futureleaders", plan: "PRO" },
    { name: "Kingdom Stars Academy",    slug: "kingdomstars",  plan: "FREE" },
  ]
  for (const s of additionalSchools) {
    const [exists] = await db`SELECT id FROM schools WHERE slug = ${s.slug} LIMIT 1`
    if (!exists) {
      const sid = id()
      await db`
        INSERT INTO schools (id, name, slug, country, currency, timezone, plan, "isActive", "createdAt", "updatedAt", language)
        VALUES (${sid}, ${s.name}, ${s.slug}, 'GH', 'GHS', 'Africa/Accra', ${s.plan}, true, NOW(), NOW(), 'en')
      `
      console.log(`  ✅ Additional school: ${s.name} (${s.slug}.nexschoola.com)`)
    }
  }

  // ── Admin / Headmaster / Staff ────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@demo.com"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? generatePassword()
  const adminHash = await hash(adminPassword, 12)

  const [existingAdmin] = await db`SELECT id FROM users WHERE "schoolId" = ${schoolId} AND email = ${adminEmail} LIMIT 1`
  if (!existingAdmin) {
    const adminId = id()
    await db`
      INSERT INTO users (id, "schoolId", name, email, password, role, "isActive", phone, "createdAt", "updatedAt")
      VALUES (${adminId}, ${schoolId}, 'Mr. Joseph Duuti', ${adminEmail}, ${adminHash}, 'ADMIN', true, '+233244000001', NOW(), NOW())
    `
    console.log(`✅ Admin created: ${adminEmail}`)
  } else {
    await db`UPDATE users SET name = 'Mr. Joseph Duuti', email = ${adminEmail}, password = ${adminHash}, "updatedAt" = NOW() WHERE id = ${existingAdmin.id}`
    console.log(`✅ Admin updated: ${adminEmail}`)
  }

  // Additional staff
  const staffData = [
    { name: "Madam Mary Konlaan",   email: "asst.head@demo.com",  role: "HEADMASTER", phone: "+233244000002" },
    { name: "Miss Grace Babot",     email: "secretary@demo.com",  role: "ADMIN",      phone: "+233244000003" },
    { name: "Mr. Daniel Moika",     email: "accountant@demo.com", role: "ADMIN",      phone: "+233244000004" },
    { name: "Samuel Kinkong",       email: "it@demo.com",         role: "ADMIN",      phone: "+233244000005" },
  ]
  const staffPassword = await hash("staff123", 10)
  for (const s of staffData) {
    const [exists] = await db`SELECT id FROM users WHERE email = ${s.email} LIMIT 1`
    if (!exists) {
      const uid = id(); await pause(2)
      await db`
        INSERT INTO users (id, "schoolId", name, email, password, role, "isActive", phone, "createdAt", "updatedAt")
        VALUES (${uid}, ${schoolId}, ${s.name}, ${s.email}, ${staffPassword}, ${s.role}, true, ${s.phone}, NOW(), NOW())
      `
      console.log(`  ✅ Staff: ${s.name}`)
    }
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

  // ── Class-subject links ───────────────────────────────────────
  const targetClassKeys = ["JHS 1-A", "JHS 1-B", "JHS 2-A", "JHS 2-B", "JHS 3-A"]
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

  // ── Students (Bimoba names — northern Ghana cultural identity) ──
  // Distributed across JHS classes; 3 non-Bimoba (~3%) for diversity
  let counter = 1
  const stuId = () => `CFA-2025-${String(counter++).padStart(3, "0")}`
  const studentData = [
    // JHS 1-A
    { name: "David Duuti",       gender: "MALE",   roll: "001", dob: "2009-03-15", classKey: "JHS 1-A", phone: "+233244100001" },
    { name: "Mary Duuti",        gender: "FEMALE", roll: "002", dob: "2009-04-22", classKey: "JHS 1-A", phone: "+233244100002" },
    { name: "Samuel Duut",       gender: "MALE",   roll: "003", dob: "2009-01-08", classKey: "JHS 1-A", phone: "+233244100003" },
    { name: "Grace Duut",        gender: "FEMALE", roll: "004", dob: "2009-06-30", classKey: "JHS 1-A", phone: "+233244100004" },
    { name: "Michael Kombat",    gender: "MALE",   roll: "005", dob: "2009-02-18", classKey: "JHS 1-A", phone: "+233244100005" },
    { name: "Janet Kombat",      gender: "FEMALE", roll: "006", dob: "2009-08-11", classKey: "JHS 1-A", phone: "+233244100006" },

    // JHS 1-B
    { name: "Daniel Konlan",     gender: "MALE",   roll: "001", dob: "2009-05-10", classKey: "JHS 1-B", phone: "+233244100007" },
    { name: "Esther Konlan",     gender: "FEMALE", roll: "002", dob: "2009-07-04", classKey: "JHS 1-B", phone: "+233244100008" },
    { name: "Isaac Konlaan",     gender: "MALE",   roll: "003", dob: "2008-12-21", classKey: "JHS 1-B", phone: "+233244100009" },
    { name: "Ruth Konlaan",      gender: "FEMALE", roll: "004", dob: "2009-09-15", classKey: "JHS 1-B", phone: "+233244100010" },
    { name: "Joseph Langbong",   gender: "MALE",   roll: "005", dob: "2008-11-29", classKey: "JHS 1-B", phone: "+233244100011" },
    { name: "Lydia Langbong",    gender: "FEMALE", roll: "006", dob: "2009-10-08", classKey: "JHS 1-B", phone: "+233244100012" },

    // JHS 2-A
    { name: "Peter Bumbom",      gender: "MALE",   roll: "001", dob: "2008-03-19", classKey: "JHS 2-A", phone: "+233244100013" },
    { name: "Mavis Bumbom",      gender: "FEMALE", roll: "002", dob: "2008-04-25", classKey: "JHS 2-A", phone: "+233244100014" },
    { name: "John Yennuterin",   gender: "MALE",   roll: "003", dob: "2008-06-13", classKey: "JHS 2-A", phone: "+233244100015" },
    { name: "Priscilla Yennuterin",gender:"FEMALE",roll: "004", dob: "2008-08-02", classKey: "JHS 2-A", phone: "+233244100016" },
    { name: "Emmanuel Jampaat",  gender: "MALE",   roll: "005", dob: "2008-01-17", classKey: "JHS 2-A", phone: "+233244100017" },
    { name: "Patience Jampaat",  gender: "FEMALE", roll: "006", dob: "2008-07-23", classKey: "JHS 2-A", phone: "+233244100018" },

    // JHS 2-B
    { name: "Stephen Miitook",   gender: "MALE",   roll: "001", dob: "2008-02-10", classKey: "JHS 2-B", phone: "+233244100019" },
    { name: "Rebecca Miitook",   gender: "FEMALE", roll: "002", dob: "2008-09-05", classKey: "JHS 2-B", phone: "+233244100020" },
    { name: "Bright Yennuloonin",gender: "MALE",   roll: "003", dob: "2008-11-14", classKey: "JHS 2-B", phone: "+233244100021" },
    { name: "Sarah Yennuloonin", gender: "FEMALE", roll: "004", dob: "2008-12-01", classKey: "JHS 2-B", phone: "+233244100022" },
    { name: "Andrew Yennusakin", gender: "MALE",   roll: "005", dob: "2008-05-28", classKey: "JHS 2-B", phone: "+233244100023" },
    { name: "Comfort Yennusakin",gender: "FEMALE", roll: "006", dob: "2008-10-19", classKey: "JHS 2-B", phone: "+233244100024" },

    // JHS 3-A
    { name: "Paul Kong",         gender: "MALE",   roll: "001", dob: "2007-01-14", classKey: "JHS 3-A", phone: "+233244100025" },
    { name: "Deborah Kong",      gender: "FEMALE", roll: "002", dob: "2007-03-22", classKey: "JHS 3-A", phone: "+233244100026" },
    { name: "Victor Kinkong",    gender: "MALE",   roll: "003", dob: "2007-05-08", classKey: "JHS 3-A", phone: "+233244100027" },
    { name: "Anita Kinkong",     gender: "FEMALE", roll: "004", dob: "2007-07-16", classKey: "JHS 3-A", phone: "+233244100028" },
    { name: "James Juar",        gender: "MALE",   roll: "005", dob: "2007-09-30", classKey: "JHS 3-A", phone: "+233244100029" },
    { name: "Felicia Juar",      gender: "FEMALE", roll: "006", dob: "2007-11-11", classKey: "JHS 3-A", phone: "+233244100030" },
    { name: "Philip Moisob",     gender: "MALE",   roll: "007", dob: "2007-04-05", classKey: "JHS 3-A", phone: "+233244100031" },
    { name: "Gloria Moisob",     gender: "FEMALE", roll: "008", dob: "2007-08-19", classKey: "JHS 3-A", phone: "+233244100032" },
    { name: "Evans Moika",       gender: "MALE",   roll: "009", dob: "2007-02-27", classKey: "JHS 3-A", phone: "+233244100033" },
    { name: "Monica Moika",      gender: "FEMALE", roll: "010", dob: "2007-12-12", classKey: "JHS 3-A", phone: "+233244100034" },
    { name: "Richard Babot",     gender: "MALE",   roll: "011", dob: "2007-06-04", classKey: "JHS 3-A", phone: "+233244100035" },
    { name: "Helena Babot",      gender: "FEMALE", roll: "012", dob: "2007-10-25", classKey: "JHS 3-A", phone: "+233244100036" },
    { name: "Charles Babon",     gender: "MALE",   roll: "013", dob: "2007-07-09", classKey: "JHS 3-A", phone: "+233244100037" },
    { name: "Joyce Babon",       gender: "FEMALE", roll: "014", dob: "2007-08-31", classKey: "JHS 3-A", phone: "+233244100038" },
    { name: "Kelvin Suuk",       gender: "MALE",   roll: "015", dob: "2007-01-25", classKey: "JHS 3-A", phone: "+233244100039" },
    { name: "Abigail Suuk",      gender: "FEMALE", roll: "016", dob: "2007-09-13", classKey: "JHS 3-A", phone: "+233244100040" },

    // Non-Bimoba (~3%) for diversity
    { name: "Kwame Mensah",      gender: "MALE",   roll: "007", dob: "2009-02-08", classKey: "JHS 1-A", phone: "+233244100041" },
    { name: "Ama Owusu",         gender: "FEMALE", roll: "007", dob: "2008-04-14", classKey: "JHS 2-A", phone: "+233244100042" },
    { name: "Kofi Asare",        gender: "MALE",   roll: "017", dob: "2007-03-30", classKey: "JHS 3-A", phone: "+233244100043" },
  ]

  const studentPassword = await hash("student123", 10)
  const createdStudents = []

  for (const s of studentData) {
    const slug = s.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)
    const email = `${slug}${createdStudents.length + 1}@student.demo`
    const [existingUser] = await db`SELECT id FROM users WHERE "schoolId" = ${schoolId} AND name = ${s.name} LIMIT 1`
    if (existingUser) {
      const [st] = await db`SELECT id FROM students WHERE "userId" = ${existingUser.id} LIMIT 1`
      if (st) createdStudents.push({ id: st.id, name: s.name })
      continue
    }

    const uid = id(); await pause(2)
    const sid = id(); await pause(2)
    const cid = classMap[s.classKey]

    await db`
      INSERT INTO users (id, "schoolId", name, email, password, role, "isActive", phone, "createdAt", "updatedAt")
      VALUES (${uid}, ${schoolId}, ${s.name}, ${email}, ${studentPassword}, 'STUDENT', true, ${s.phone}, NOW(), NOW())
    `
    await db`
      INSERT INTO students (id, "schoolId", "userId", "classId", "rollNumber", "studentId", "dateOfBirth", gender, nationality, "isActive", "admissionDate")
      VALUES (${sid}, ${schoolId}, ${uid}, ${cid ?? null}, ${s.roll}, ${stuId()}, ${s.dob}, ${s.gender}, 'Ghanaian', true, NOW())
    `
    createdStudents.push({ id: sid, name: s.name })
  }
  console.log(`✅ Students: ${createdStudents.length} enrolled`)

  // ── Parents ─────────────────────────────────────────────────────
  const parentData = [
    { name: "Mr. Daniel Duuti",      email: "p.duuti@demo.com",       phone: "+233244200001", relation: "Father" },
    { name: "Mrs. Mary Duut",        email: "p.duut@demo.com",        phone: "+233244200002", relation: "Mother" },
    { name: "Mr. Isaac Kombat",      email: "p.kombat@demo.com",      phone: "+233244200003", relation: "Father" },
    { name: "Madam Ruth Konlan",     email: "p.konlan@demo.com",      phone: "+233244200004", relation: "Mother" },
    { name: "Mr. Joseph Konlaan",    email: "p.konlaan@demo.com",     phone: "+233244200005", relation: "Father" },
    { name: "Madam Lydia Langbong",  email: "p.langbong@demo.com",    phone: "+233244200006", relation: "Mother" },
    { name: "Mr. Stephen Bumbom",    email: "p.bumbom@demo.com",      phone: "+233244200007", relation: "Father" },
    { name: "Madam Janet Yennuterin",email: "p.yennuterin@demo.com",  phone: "+233244200008", relation: "Mother" },
    { name: "Mr. Paul Jampaat",      email: "p.jampaat@demo.com",     phone: "+233244200009", relation: "Father" },
    { name: "Madam Grace Miitook",   email: "p.miitook@demo.com",     phone: "+233244200010", relation: "Mother" },
    { name: "Mr. Andrew Yennuloonin",email: "p.yennuloonin@demo.com", phone: "+233244200011", relation: "Father" },
    { name: "Madam Esther Yennusakin",email: "p.yennusakin@demo.com", phone: "+233244200012", relation: "Mother" },
  ]
  const parentPassword = await hash("parent123", 10)
  for (const p of parentData) {
    const [exists] = await db`SELECT id FROM users WHERE email = ${p.email} LIMIT 1`
    if (!exists) {
      const uid = id(); await pause(2)
      const pid = id(); await pause(2)
      await db`
        INSERT INTO users (id, "schoolId", name, email, password, role, "isActive", phone, "createdAt", "updatedAt")
        VALUES (${uid}, ${schoolId}, ${p.name}, ${p.email}, ${parentPassword}, 'PARENT', true, ${p.phone}, NOW(), NOW())
      `
      await db`
        INSERT INTO parents (id, "schoolId", "userId", relation, "createdAt")
        VALUES (${pid}, ${schoolId}, ${uid}, ${p.relation}, NOW())
      `
    }
  }
  console.log(`✅ Parents: ${parentData.length} registered`)

  // ── Teachers ─────────────────────────────────────────────────────
  const teacherData = [
    { name: "Mr. David Kombat",      email: "teacher@demo.com",     phone: "+233244300001", department: "Mathematics", qual: "B.Ed Mathematics",  desig: "Senior Teacher",       tcode: "TCH-001" },
    { name: "Madam Grace Konlan",    email: "t.english@demo.com",   phone: "+233244300002", department: "English",     qual: "B.A English",        desig: "Subject Lead",         tcode: "TCH-002" },
    { name: "Mr. Samuel Langbong",   email: "t.science@demo.com",   phone: "+233244300003", department: "Science",     qual: "B.Sc Biology",       desig: "Teacher",              tcode: "TCH-003" },
    { name: "Madam Ruth Bumbom",     email: "t.primary@demo.com",   phone: "+233244300004", department: "Primary",     qual: "Cert. A",            desig: "Class Teacher",        tcode: "TCH-004" },
    { name: "Mr. Isaac Yennuterin",  email: "t.ict@demo.com",       phone: "+233244300005", department: "ICT",         qual: "B.Sc Computer Sci.", desig: "ICT Coordinator",      tcode: "TCH-005" },
    { name: "Madam Lydia Jampaat",   email: "t.arts@demo.com",      phone: "+233244300006", department: "Creative Arts",qual: "Dip. Creative Arts",desig: "Teacher",              tcode: "TCH-006" },
    { name: "Mr. Stephen Miitook",   email: "t.rme@demo.com",       phone: "+233244300007", department: "RME",         qual: "Dip. Religious Studies",desig: "Teacher",          tcode: "TCH-007" },
    { name: "Madam Janet Yennusakin",email: "t.classjhs@demo.com",  phone: "+233244300008", department: "JHS",         qual: "B.Ed Education",     desig: "JHS Class Teacher",   tcode: "TCH-008" },
  ]
  const teacherPassword = await hash("teacher123", 10)
  for (const t of teacherData) {
    const [exists] = await db`SELECT id FROM users WHERE email = ${t.email} LIMIT 1`
    if (!exists) {
      const uid = id(); await pause(2)
      const tid = id(); await pause(2)
      await db`
        INSERT INTO users (id, "schoolId", name, email, password, role, "isActive", phone, "createdAt", "updatedAt")
        VALUES (${uid}, ${schoolId}, ${t.name}, ${t.email}, ${teacherPassword}, 'TEACHER', true, ${t.phone}, NOW(), NOW())
      `
      await db`
        INSERT INTO teachers (id, "schoolId", "userId", "teacherId", qualification, designation, department, "isActive", "joiningDate", "createdAt")
        VALUES (${tid}, ${schoolId}, ${uid}, ${t.tcode}, ${t.qual}, ${t.desig}, ${t.department}, true, NOW(), NOW())
      `
    }
  }
  console.log(`✅ Teachers: ${teacherData.length} on staff`)

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

  // ── Sample marks for first 6 students (JHS 1-A) ─────────────────
  if (examId) {
    const jhs1aStudents = createdStudents.slice(0, 6)
    const markSubjects = ["MATH", "ENG", "SCI", "SOC", "RME"]
    const sampleScores = [
      [72, 85, 68, 79, 91],
      [88, 76, 82, 74, 89],
      [61, 70, 77, 83, 65],
      [94, 91, 88, 86, 92],
      [55, 63, 59, 71, 68],
      [78, 82, 75, 80, 84],
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
  console.log(`\n🎉 Seed complete — ${SCHOOL_NAME}`)
  console.log("════════════════════════════════════════")
  console.log("  SCHOOL ADMIN LOGIN")
  console.log(`  School slug  : ${SCHOOL_SLUG}`)
  console.log(`  Email        : ${adminEmail}`)
  console.log(`  Password     : ${adminPassword}`)
  console.log("  URL          : http://localhost:3000/login")
  console.log("────────────────────────────────────────")
  console.log("  TEACHER LOGIN")
  console.log(`  School slug  : ${SCHOOL_SLUG}`)
  console.log("  Email        : teacher@demo.com  /  password: teacher123")
  console.log("────────────────────────────────────────")
  console.log("  PARENT LOGIN")
  console.log(`  School slug  : ${SCHOOL_SLUG}`)
  console.log("  Email        : p.duuti@demo.com  /  password: parent123")
  console.log("────────────────────────────────────────")
  console.log("  SUPER ADMIN LOGIN")
  console.log(`  Email        : ${process.env.SEED_SUPER_ADMIN_EMAIL ?? "owner@nexschoola.com"}`)
  console.log(`  Password     : ${process.env.SEED_SUPER_ADMIN_PASSWORD ?? "(see server logs from /api/setup)"}`)
  console.log("  URL          : http://localhost:3000/login → Super Admin tab")
  console.log("════════════════════════════════════════")
  console.log(`\n  DATA CREATED:`)
  console.log(`  • School: ${SCHOOL_NAME}`)
  console.log(`  • 8 classes (JHS 1-3 + SHS 1-3)`)
  console.log(`  • 10 subjects (WAEC curriculum)`)
  console.log(`  • ${studentData.length} students (Bimoba names + diversity)`)
  console.log(`  • 8 teachers across departments`)
  console.log(`  • 12 parents linked to students`)
  console.log(`  • 4 admin/staff (Headmaster, Secretary, Accountant, IT)`)
  console.log(`  • 6 fee items (Term 1-3 fees + levies)`)
  console.log(`  • 1 exam with marks for JHS 1-A`)
}

main().catch(e => { console.error("❌ Seed failed:", e.message); process.exit(1) })
