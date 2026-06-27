"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createLessonDraft } from "@/lib/pipeline";
import { extractTextFromPdfFile } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

const createLessonSchema = z.object({
  title: z.string().min(1, "Chapter title is required."),
  subject: z.string().min(1, "Subject is required."),
  gradeLevel: z.string().min(1, "Grade level is required."),
  pastedText: z.string().optional()
});

export async function createLessonAction(previousState, formData) {
  const title = String(formData.get("title") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const gradeLevel = String(formData.get("gradeLevel") || "").trim();
  const pastedText = String(formData.get("pastedText") || "").trim();
  const pdfFile = formData.get("pdf");

  const parsed = createLessonSchema.safeParse({
    title,
    subject,
    gradeLevel,
    pastedText
  });

  const errors = {};

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors[issue.path[0]] = issue.message;
    }
  }

  let sourceText = pastedText;

  if (!sourceText && pdfFile && typeof pdfFile === "object" && "size" in pdfFile && pdfFile.size > 0) {
    try {
      const extracted = await extractTextFromPdfFile(pdfFile);
      sourceText = extracted.text;
    } catch (error) {
      errors.pdf =
        error instanceof Error
          ? error.message
          : "We could not read text from that PDF. Try pasted text instead.";
    }
  }

  if (!sourceText) {
    errors.sourceText = "Provide pasted textbook content or upload a readable PDF.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
      values: { title, subject, gradeLevel, pastedText }
    };
  }

  const lesson = await createLessonDraft({
    title,
    subject,
    gradeLevel,
    sourceText
  });

  redirect(`/lessons/${lesson.id}/generate`);
}

export async function updateVerificationAction({ lessonId, targetType, targetId, status }) {
  await prisma.verificationResult.updateMany({
    where: {
      lessonId,
      targetType,
      targetId
    },
    data: {
      status
    }
  });

  if (targetType === "PANEL") {
    await prisma.panel.update({
      where: { id: targetId },
      data: { verificationStatus: status }
    });
  }

  if (targetType === "QUIZ") {
    await prisma.quizCard.update({
      where: { id: targetId },
      data: { verificationStatus: status }
    });
  }
}
