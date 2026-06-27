import Link from "next/link";
import { ProductShell } from "@/components/product-shell";
import { VerificationActions } from "@/components/verification-actions";
import { getLessonById } from "@/lib/lessons";

function verificationFor(lesson, targetId) {
  return lesson.verificationItems.find((item) => item.targetId === targetId);
}

export default async function TeacherPage({ params }) {
  const { id } = await params;
  const lesson = await getLessonById(id);

  return (
    <ProductShell
      eyebrow="Teacher Verification"
      title={`Verify: ${lesson.title}`}
      description="Inspect source chunks, extracted facts, panel mappings, quiz grounding, and approval status before using the lesson."
      actions={
        <div className="product-actions">
          <Link className="button button--ghost" href={`/lessons/${lesson.id}/reader`}>
            View Comic
          </Link>
          <Link className="button button--ghost" href={`/lessons/${lesson.id}/prompts`}>
            View Prompt Export
          </Link>
        </div>
      }
    >
      <div className="teacher-layout">
        <article className="panel-surface">
          <h2>Lesson Info</h2>
          <p>{lesson.subject} // {lesson.gradeLevel}</p>
          <p>Status: {lesson.status}</p>
          <p>Source chunks: {lesson.sourceChunks.length}</p>
        </article>

        <article className="panel-surface">
          <h2>Source Chunks</h2>
          <div className="stack-list">
            {lesson.sourceChunks.map((chunk) => (
              <div key={chunk.id} className="stack-card">
                <p className="character-panel__tag">Chunk {chunk.chunkIndex}</p>
                <p>{chunk.text}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-surface">
          <h2>Extracted Facts</h2>
          <div className="stack-list">
            {lesson.facts.map((fact) => (
              <div key={fact.id} className="stack-card">
                <p className="character-panel__tag">
                  {fact.factCode} // {fact.importance}
                </p>
                <p>{fact.factText}</p>
                <blockquote>{fact.sourceQuote}</blockquote>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-surface">
          <h2>Panel Verification</h2>
          <div className="stack-list">
            {lesson.panels.map((panel) => {
              const verification = verificationFor(lesson, panel.id);
              return (
                <div key={panel.id} className="stack-card">
                  <div className="stack-card__header">
                    <div>
                      <p className="character-panel__tag">{panel.panelCode}</p>
                      <h3>{panel.visualDescription}</h3>
                    </div>
                    <VerificationActions
                      lessonId={lesson.id}
                      targetType="PANEL"
                      targetId={panel.id}
                      initialStatus={verification?.status || panel.verificationStatus}
                    />
                  </div>
                  <p>{panel.narration}</p>
                  <div className="fact-chip-row">
                    {panel.facts.map((fact) => (
                      <span key={fact.id} className="fact-chip">
                        {fact.factCode}
                      </span>
                    ))}
                  </div>
                  <ul>
                    {panel.facts.map((fact) => (
                      <li key={fact.id}>
                        {fact.sourceQuote}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel-surface">
          <h2>Quiz Verification</h2>
          <div className="stack-list">
            {lesson.quizCards.map((quiz) => {
              const verification = verificationFor(lesson, quiz.id);
              return (
                <div key={quiz.id} className="stack-card">
                  <div className="stack-card__header">
                    <div>
                      <p className="character-panel__tag">{quiz.quizType}</p>
                      <h3>{quiz.question}</h3>
                    </div>
                    <VerificationActions
                      lessonId={lesson.id}
                      targetType="QUIZ"
                      targetId={quiz.id}
                      initialStatus={verification?.status || quiz.verificationStatus}
                    />
                  </div>
                  <p>Answer: {quiz.correctAnswer}</p>
                  <p>{quiz.explanation}</p>
                  <ul>
                    {quiz.facts.map((fact) => (
                      <li key={fact.id}>
                        <strong>{fact.factCode}</strong>: {fact.sourceQuote}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </ProductShell>
  );
}
