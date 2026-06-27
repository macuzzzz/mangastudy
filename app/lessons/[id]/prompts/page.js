import Link from "next/link";
import { CopyButton, PromptExportActions } from "@/components/prompt-actions";
import { ProductShell } from "@/components/product-shell";
import { getLessonById } from "@/lib/lessons";

export default async function PromptPage({ params }) {
  const { id } = await params;
  const lesson = await getLessonById(id);
  const combined = lesson.panels
    .map((panel) => `${panel.panelCode}\n${panel.imagePrompt}\nFacts: ${panel.factIds.join(", ")}`)
    .join("\n\n");

  return (
    <ProductShell
      eyebrow="Prompt Export"
      title={`Prompt Pack: ${lesson.title}`}
      description="Export panel prompts for later external image generation workflows. This MVP stops at prompt-ready placeholder output."
      actions={
        <Link className="button button--ghost" href={`/lessons/${lesson.id}/reader`}>
          Back to Reader
        </Link>
      }
    >
      <div className="content-grid content-grid--single">
        <article className="panel-surface">
          <PromptExportActions lessonId={lesson.id} allPrompts={combined} />
        </article>
        {lesson.panels.map((panel) => (
          <article key={panel.id} className="panel-surface">
            <p className="character-panel__tag">{panel.panelCode}</p>
            <h2>{panel.visualDescription}</h2>
            <p>{panel.imagePrompt}</p>
            <p className="quiz-card__facts">Facts: {panel.factIds.join(", ")}</p>
            <CopyButton value={panel.imagePrompt} label="Copy Image Prompt" />
          </article>
        ))}
      </div>
    </ProductShell>
  );
}
