import Link from "next/link";
import { ProductShell } from "@/components/product-shell";
import { QuizPlayer } from "@/components/quiz-player";
import { getLessonById } from "@/lib/lessons";

export default async function QuizPage({ params }) {
  const { id } = await params;
  const lesson = await getLessonById(id);

  return (
    <ProductShell
      eyebrow="Quiz Cards"
      title={`Quiz: ${lesson.title}`}
      description="Multiple choice, true/false, and short-answer checks remain tied to fact IDs so the assessment can be audited."
      actions={
        <Link className="button button--ghost" href={`/lessons/${lesson.id}/reader`}>
          Back to Comic
        </Link>
      }
    >
      <QuizPlayer quizCards={lesson.quizCards} />
    </ProductShell>
  );
}
