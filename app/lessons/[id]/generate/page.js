import Link from "next/link";
import { GenerationProgressClient } from "@/components/generation-progress-client";
import { ProductShell } from "@/components/product-shell";
import { getLessonById } from "@/lib/lessons";

export default async function GenerateLessonPage({ params }) {
  const { id } = await params;
  const lesson = await getLessonById(id);

  return (
    <ProductShell
      eyebrow="Generation Chamber"
      title={`Building: ${lesson.title}`}
      description="This route turns the saved lesson draft into facts, objectives, scenes, panels, verification records, and quizzes."
      actions={
        <Link className="button button--ghost" href={`/lessons/${lesson.id}/reader`}>
          View Comic
        </Link>
      }
    >
      <GenerationProgressClient
        lessonId={lesson.id}
        initialStatus={lesson.status}
        initialProgress={lesson.progressEvents}
      />
    </ProductShell>
  );
}
