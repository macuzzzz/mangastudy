import { PrismaClient } from "@prisma/client";
import { blackDeathChapter } from "../lib/sample-chapter.js";
import { seedSampleLesson } from "../lib/pipeline.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  await seedSampleLesson(blackDeathChapter);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
