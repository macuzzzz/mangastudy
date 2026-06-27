import { NextResponse } from "next/server";
import { getLessonByIdRaw } from "@/lib/lessons";
import { buildPromptExport } from "@/lib/prompt-export";

export async function GET(request, { params }) {
  const { id } = await params;
  const lesson = await getLessonByIdRaw(id);
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";
  const exportPayload = buildPromptExport(lesson);

  if (format === "md" || format === "txt") {
    return new NextResponse(exportPayload.markdown, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${lesson.title.replace(/\s+/g, "-").toLowerCase()}-prompts.${format === "md" ? "md" : "txt"}"`
      }
    });
  }

  return NextResponse.json(exportPayload.data, {
    headers: {
      "Content-Disposition": `attachment; filename="${lesson.title.replace(/\s+/g, "-").toLowerCase()}-prompts.json"`
    }
  });
}
