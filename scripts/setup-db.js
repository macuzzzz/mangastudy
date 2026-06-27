import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const prismaDir = path.join(process.cwd(), "prisma");
const databasePath = path.join(prismaDir, "dev.db");

fs.mkdirSync(prismaDir, { recursive: true });
if (fs.existsSync(databasePath)) {
  fs.rmSync(databasePath, { force: true });
}

const database = new DatabaseSync(databasePath);

database.exec(`
CREATE TABLE "Lesson" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "gradeLevel" TEXT NOT NULL,
  "sourceText" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "generationLocked" BOOLEAN NOT NULL DEFAULT false,
  "generationError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "GenerationProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "stepCode" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "stepOrder" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GenerationProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SourceChunk" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "pageNumber" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceChunk_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Fact" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "factCode" TEXT NOT NULL,
  "factText" TEXT NOT NULL,
  "sourceQuote" TEXT NOT NULL,
  "sourceChunkId" TEXT NOT NULL,
  "pageNumber" INTEGER,
  "importance" TEXT NOT NULL,
  "factType" TEXT NOT NULL,
  CONSTRAINT "Fact_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Fact_sourceChunkId_fkey" FOREIGN KEY ("sourceChunkId") REFERENCES "SourceChunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LearningObjective" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "objectiveCode" TEXT NOT NULL,
  "objectiveText" TEXT NOT NULL,
  CONSTRAINT "LearningObjective_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LearningObjectiveFact" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "objectiveId" TEXT NOT NULL,
  "factId" TEXT NOT NULL,
  CONSTRAINT "LearningObjectiveFact_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "LearningObjective" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LearningObjectiveFact_factId_fkey" FOREIGN KEY ("factId") REFERENCES "Fact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Character" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "visualDescription" TEXT NOT NULL,
  "personality" TEXT NOT NULL,
  "consistencyNotes" TEXT NOT NULL,
  "visualAnchor" TEXT NOT NULL,
  CONSTRAINT "Character_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StyleBible" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "styleName" TEXT NOT NULL,
  "lineStyle" TEXT NOT NULL,
  "shading" TEXT NOT NULL,
  "colorRules" TEXT NOT NULL,
  "mood" TEXT NOT NULL,
  "negativeRules" TEXT NOT NULL,
  CONSTRAINT "StyleBible_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StoryScene" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "sceneCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  CONSTRAINT "StoryScene_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Panel" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "sceneId" TEXT NOT NULL,
  "panelCode" TEXT NOT NULL,
  "panelNumber" INTEGER NOT NULL,
  "visualDescription" TEXT NOT NULL,
  "cameraAngle" TEXT NOT NULL,
  "characterActions" TEXT NOT NULL,
  "narration" TEXT NOT NULL,
  "dialogueJson" TEXT NOT NULL,
  "imagePrompt" TEXT NOT NULL,
  "placeholderPrompt" TEXT,
  "imageUrl" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'PASS',
  CONSTRAINT "Panel_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Panel_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "StoryScene" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PanelFact" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "panelId" TEXT NOT NULL,
  "factId" TEXT NOT NULL,
  CONSTRAINT "PanelFact_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "Panel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PanelFact_factId_fkey" FOREIGN KEY ("factId") REFERENCES "Fact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "QuizCard" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "quizType" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL,
  "optionsJson" TEXT,
  "correctAnswer" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "verificationStatus" TEXT NOT NULL DEFAULT 'PASS',
  CONSTRAINT "QuizCard_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "QuizFact" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quizId" TEXT NOT NULL,
  "factId" TEXT NOT NULL,
  CONSTRAINT "QuizFact_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "QuizCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuizFact_factId_fkey" FOREIGN KEY ("factId") REFERENCES "Fact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "VerificationResult" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "issuesJson" TEXT,
  "revisionInstruction" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "VerificationResult_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
`);

database.close();
console.log(`SQLite database created at ${databasePath}`);
