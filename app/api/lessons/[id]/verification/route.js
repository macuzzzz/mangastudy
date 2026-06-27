import { NextResponse } from "next/server";
import { updateVerificationAction } from "@/app/actions/lesson-actions";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  await updateVerificationAction({
    lessonId: id,
    targetType: body.targetType,
    targetId: body.targetId,
    status: body.status
  });

  return NextResponse.json({ ok: true });
}
