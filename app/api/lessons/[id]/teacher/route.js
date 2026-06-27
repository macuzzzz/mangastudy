import { NextResponse } from "next/server";
import { getLessonByIdRaw } from "@/lib/lessons";

export async function GET(_request, { params }) {
  const { id } = await params;
  const lesson = await getLessonByIdRaw(id);
  return NextResponse.json(lesson);
}
