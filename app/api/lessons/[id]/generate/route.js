import { NextResponse } from "next/server";
import { generateLesson } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";

export async function POST(_request, { params }) {
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id }
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  if (lesson.status === "READY" || lesson.status === "NEEDS_REVIEW") {
    return NextResponse.json({ ok: true, status: lesson.status });
  }

  try {
    await generateLesson(id);
    const refreshed = await prisma.lesson.findUnique({ where: { id } });
    return NextResponse.json({ ok: true, status: refreshed.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Lesson generation failed."
      },
      { status: 500 }
    );
  }
}
