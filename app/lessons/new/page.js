import { LessonForm } from "@/components/lesson-form";
import { ProductShell } from "@/components/product-shell";

export default function NewLessonPage() {
  return (
    <ProductShell
      eyebrow="Lesson Intake"
      title="Create a grounded manga lesson"
      description="Paste a textbook chapter or upload a readable PDF. We will chunk the source, extract facts, plan scenes, and build placeholders without generating final comic art."
    >
      <div className="content-grid content-grid--single">
        <article className="panel-surface">
          <LessonForm />
        </article>
      </div>
    </ProductShell>
  );
}
