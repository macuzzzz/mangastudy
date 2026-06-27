import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request, { params }) {
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      progressEvents: {
        orderBy: { stepOrder: "asc" }
      }
    }
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: lesson.id,
    status: lesson.status,
    generationError: lesson.generationError,
    progressEvents: lesson.progressEvents
  });
}
