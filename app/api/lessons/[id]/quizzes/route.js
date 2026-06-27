import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request, { params }) {
  const { id } = await params;
  const quizzes = await prisma.quizCard.findMany({
    where: { lessonId: id },
    include: {
      factLinks: {
        include: {
          fact: true
        }
      }
    }
  });

  return NextResponse.json(quizzes);
}
