import bcrypt from "bcrypt";
import { storage } from "./storage";

export async function seedTestData() {
  console.log("Seeding test data...");

  // Admin user
  const adminPassword = "admin123";
  const hashed = await bcrypt.hash(adminPassword, 10);

  try {
    const existing = await storage.getUserByEmail("admin@ai-tutor.com");
    if (!existing) {
      const adminUser = await storage.createUser({
        email: "admin@ai-tutor.com",
        username: "admin",
        password: hashed,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      console.log("Created admin user: admin@ai-tutor.com / admin123");
    } else {
      console.log("Admin user already exists");
    }

    // Sample questions
    const sampleQuestions = [
      {
        title: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: 2,
        difficulty: "easy",
        category: "Geography",
        mode: "practice",
        createdBy: existing?.id || "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "2 + 2 = ?",
        options: ["3", "4", "5", "6"],
        correctAnswer: 1,
        difficulty: "easy",
        category: "Math",
        mode: "practice",
        createdBy: existing?.id || "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const q of sampleQuestions) {
      await storage.createQuestion(q as any);
    }

    // Sample competition
    const comp = await storage.createCompetition({
      name: "Test Competition",
      description: "A test competition",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      registrationFee: 0,
      createdBy: existing?.id || "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    console.log("✅ Test data seeded successfully");
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
