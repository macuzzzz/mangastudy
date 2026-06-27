import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request, { params }) {
  const { id } = await params;
  const panels = await prisma.panel.findMany({
    where: { lessonId: id },
    include: {
      scene: true,
      factLinks: {
        include: {
          fact: true
        }
      }
    },
    orderBy: { panelNumber: "asc" }
  });

  return NextResponse.json(panels);
}
