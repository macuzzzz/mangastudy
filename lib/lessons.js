import { notFound } from "next/navigation";
import { prisma } from "./prisma.js";
import { formatLessonForUI } from "./lesson-format.js";

const lessonInclude = {
  sourceChunks: {
    orderBy: { chunkIndex: "asc" }
  },
  facts: {
    include: {
      sourceChunk: true
    },
    orderBy: { factCode: "asc" }
  },
  objectives: {
    include: {
      factLinks: {
        include: {
          fact: true
        }
      }
    },
    orderBy: { objectiveCode: "asc" }
  },
  characters: true,
  styleBibles: true,
  scenes: {
    orderBy: { sceneCode: "asc" }
  },
  panels: {
    include: {
      scene: true,
      factLinks: {
        include: {
          fact: true
        }
      }
    },
    orderBy: { panelNumber: "asc" }
  },
  quizCards: {
    include: {
      factLinks: {
        include: {
          fact: true
        }
      }
    }
  },
  verificationItems: true,
  progressEvents: {
    orderBy: { stepOrder: "asc" }
  }
};

export async function getLessonById(id) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: lessonInclude
  });

  if (!lesson) {
    notFound();
  }

  return formatLessonForUI(lesson);
}

export async function getLessonByIdRaw(id) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: lessonInclude
  });

  if (!lesson) {
    notFound();
  }

  return lesson;
}

export async function getFeaturedLesson() {
  const lesson = await prisma.lesson.findFirst({
    where: { status: "READY" },
    orderBy: { createdAt: "desc" }
  });

  return lesson;
}
