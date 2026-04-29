import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Check if a school already exists
  const existing = await prisma.school.findFirst()
  if (existing) {
    console.log(`✅ School already exists: "${existing.name}" (slug: ${existing.slug})`)
    console.log("   Skipping seed — delete existing records to re-seed.")
    return
  }

  // Create the demo school
  const school = await prisma.school.create({
    data: {
      name: "NexSchoola Demo",
      slug: "demo",
      country: "GH",
      currency: "GHS",
      timezone: "Africa/Accra",
      plan: "PRO",
      isActive: true,
    },
  })
  console.log(`✅ School created: "${school.name}" (id: ${school.id})`)

  // Create the admin user
  const hashedPassword = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: "School Admin",
      email: "admin@nexschoola.com",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  })
  console.log(`✅ Admin user created: ${admin.email}`)

  console.log("\n🎉 Seed complete!")
  console.log("─────────────────────────────────")
  console.log("  School slug : demo")
  console.log("  Email       : admin@nexschoola.com")
  console.log("  Password    : admin123")
  console.log("─────────────────────────────────")
  console.log("  Login at http://localhost:3000/login")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
