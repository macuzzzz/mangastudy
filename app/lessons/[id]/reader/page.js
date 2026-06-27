import Link from "next/link";
import { BookReader } from "@/components/book-reader";
import { ProductShell } from "@/components/product-shell";
import { getLessonById } from "@/lib/lessons";

export default async function ReaderPage({ params }) {
  const { id } = await params;
  const lesson = await getLessonById(id);
  const allPrompts = lesson.panels
    .map((panel) => `${panel.panelCode}\n${panel.imagePrompt}`)
    .join("\n\n");

  return (
    <ProductShell
      eyebrow="Comic Reader"
      title={lesson.title}
      description={`Subject: ${lesson.subject} // ${lesson.gradeLevel} // Status: ${lesson.status}`}
      actions={
        <div className="product-actions">
          <Link className="button button--ghost" href={`/lessons/${lesson.id}/quiz`}>
            Start Quiz
          </Link>
          <Link className="button button--ghost" href={`/lessons/${lesson.id}/teacher`}>
            View Teacher Mode
          </Link>
        </div>
      }
    >
      <BookReader lesson={lesson} allPrompts={allPrompts} />
    </ProductShell>
  );
}
