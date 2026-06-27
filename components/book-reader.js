"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CopyButton, PromptExportActions } from "@/components/prompt-actions";

function buildSpreads(lesson) {
  const introPage = {
    id: "intro-page",
    pageNumber: 0,
    title: lesson.title,
    summary:
      "A short manga-sized lesson paced to finish in one sitting, with source-grounded notes living outside the page itself.",
    panels: [],
    factIds: lesson.facts.slice(0, 3).map((fact) => fact.factCode),
    type: "intro"
  };

  const spreads = [];
  const contentPages = lesson.pages || [];

  if (contentPages.length > 0) {
    spreads.push({
      id: "spread-0",
      left: introPage,
      right: contentPages[0]
    });
  } else {
    spreads.push({
      id: "spread-0",
      left: introPage,
      right: null
    });
  }

  for (let index = 1; index < contentPages.length; index += 2) {
    spreads.push({
      id: `spread-${spreads.length}`,
      left: contentPages[index] || null,
      right: contentPages[index + 1] || null
    });
  }

  return spreads;
}

function PageSurface({ page, side, onFlip, canFlip, directionHint }) {
  const [artFailed, setArtFailed] = useState(false);

  if (!page) {
    return <div className={clsx("book-page", "book-page--empty", `book-page--${side}`)} />;
  }

  const pageLabel = page.type === "intro" ? "Chapter Intro" : `Page ${page.pageNumber}`;
  const showPageArt = page.type !== "intro" && page.imageSrc && !artFailed;

  return (
    <article
      className={clsx(
        "book-page",
        `book-page--${side}`,
        page.type === "intro" && "book-page--intro",
        canFlip && "book-page--clickable"
      )}
      onClick={canFlip ? onFlip : undefined}
      role={canFlip ? "button" : undefined}
      tabIndex={canFlip ? 0 : undefined}
      onKeyDown={
        canFlip
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onFlip();
              }
            }
          : undefined
      }
      aria-label={
        canFlip
          ? directionHint === "forward"
            ? "Flip to next pages"
            : "Flip to previous pages"
          : pageLabel
      }
    >
      <div className="book-page__paper">
        <div className="book-page__header">
          <p className="book-page__eyebrow">{pageLabel}</p>
          <p className="book-page__scene">
            {page.type === "intro" ? "Demo Lesson" : page.title}
          </p>
        </div>

        {page.type === "intro" ? (
          <div className="intro-page__content">
            <h2>{page.title}</h2>
            <p>{page.summary}</p>
            <div className="fact-chip-row">
              {page.factIds.map((factId) => (
                <span key={factId} className="fact-chip">
                  {factId}
                </span>
              ))}
            </div>
            <div className="intro-page__notes">
              <p>Click the right page to flip deeper into the lesson.</p>
              <p>Click the left page on later spreads to turn back like a real book.</p>
            </div>
          </div>
        ) : showPageArt ? (
          <div className="book-page__art">
            <img
              src={page.imageSrc}
              alt={`${page.title} — manga page ${page.pageNumber}`}
              className="book-page__art-image"
              onError={() => setArtFailed(true)}
            />
          </div>
        ) : (
          <div className="book-page__panel-stack">
            {page.panels.map((panel, panelIndex) => (
              <section
                key={panel.id}
                className={clsx(
                  "book-panel",
                  panelIndex === 0 ? "book-panel--primary" : "book-panel--secondary"
                )}
              >
                <div className="book-panel__frame">
                  <p className="placeholder-frame__number">
                    {panel.panelCode} // Panel {panel.panelNumber}
                  </p>
                  {panel.imageUrl ? (
                    <img
                      src={panel.imageUrl}
                      alt={panel.visualDescription}
                      className="book-panel__image"
                    />
                  ) : (
                    <p className="placeholder-frame__visual">{panel.visualDescription}</p>
                  )}
                  <div className="narration-box">{panel.narration}</div>
                  <div className="speech-bubble-stack">
                    {panel.dialogue.map((line, lineIndex) => (
                      <div key={`${panel.id}-${lineIndex}`} className="speech-bubble">
                        <strong>{line.speaker}</strong>
                        <span>{line.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="book-page__footer">
          <span>{page.type === "intro" ? "Inside Cover" : `Pg. ${page.pageNumber}`}</span>
          {canFlip ? <span>{directionHint === "forward" ? "Flip next" : "Flip back"}</span> : <span>Read</span>}
        </div>
      </div>
    </article>
  );
}

function PageNotes({ page }) {
  if (!page) {
    return null;
  }

  if (page.type === "intro") {
    return (
      <article className="page-notes-card">
        <p className="character-panel__tag">Chapter Setup</p>
        <h3>{page.title}</h3>
        <p>{page.summary}</p>
        <ul>
          <li>3-page lesson structure</li>
          <li>2 comic panels per page</li>
          <li>Facts and prompts live below the spread, not inside the flip surface</li>
        </ul>
      </article>
    );
  }

  return (
    <article className="page-notes-card">
      <p className="character-panel__tag">
        Page {page.pageNumber} // {page.title}
      </p>
      <h3>What this page teaches</h3>
      <p>{page.summary}</p>
      <div className="page-notes-card__panels">
        {page.panels.map((panel) => (
          <section key={panel.id} className="page-note-panel">
            <div className="page-note-panel__header">
              <div>
                <p className="character-panel__tag">{panel.panelCode}</p>
                <h4>{panel.visualDescription}</h4>
              </div>
              <CopyButton value={panel.imagePrompt} label="Copy Prompt" />
            </div>
            <p>{panel.characterActions}</p>
            <div className="fact-chip-row">
              {panel.factIds.map((factId) => (
                <span key={factId} className="fact-chip">
                  {factId}
                </span>
              ))}
            </div>
            <details className="teaches-panel">
              <summary>View facts and image prompt</summary>
              <div className="page-note-panel__details">
                <ul>
                  {panel.facts.map((fact) => (
                    <li key={fact.id}>
                      <strong>{fact.factCode}</strong>: {fact.factText}
                    </li>
                  ))}
                </ul>
                <pre>{panel.imagePrompt}</pre>
              </div>
            </details>
          </section>
        ))}
      </div>
    </article>
  );
}

export function BookReader({ lesson, allPrompts }) {
  const spreads = useMemo(() => buildSpreads(lesson), [lesson]);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isAnimating) {
      return undefined;
    }

    const timer = window.setTimeout(() => setIsAnimating(false), 700);
    return () => window.clearTimeout(timer);
  }, [isAnimating]);

  const currentSpread = spreads[spreadIndex];
  const canGoBack = spreadIndex > 0;
  const canGoForward = spreadIndex < spreads.length - 1;
  const visiblePages = [currentSpread.left, currentSpread.right].filter(Boolean);

  function flipNext() {
    if (!canGoForward || isAnimating) {
      return;
    }

    setDirection("forward");
    setSpreadIndex((value) => value + 1);
    setIsAnimating(true);
  }

  function flipBack() {
    if (!canGoBack || isAnimating) {
      return;
    }

    setDirection("backward");
    setSpreadIndex((value) => value - 1);
    setIsAnimating(true);
  }

  return (
    <div className="book-reader-layout">
      <div className="status-banner">
        <strong>{lesson.facts.length} facts extracted</strong>
        <span>{lesson.objectives.length} objectives</span>
        <span>{lesson.pages.length} reading pages</span>
        <span>
          Spread {spreadIndex + 1} / {spreads.length}
        </span>
      </div>

      <div className="book-toolbar">
        <PromptExportActions lessonId={lesson.id} allPrompts={allPrompts} />
      </div>

      <section className="book-reader-stage">
        <div className="book-reader-stage__chrome" />
        <div
          className={clsx(
            "book-spread",
            direction === "forward" ? "book-spread--forward" : "book-spread--backward",
            isAnimating && "book-spread--animating"
          )}
        >
          <PageSurface
            page={currentSpread.left}
            side="left"
            onFlip={flipBack}
            canFlip={canGoBack}
            directionHint="backward"
          />
          <div className="book-spine" aria-hidden="true" />
          <PageSurface
            page={currentSpread.right}
            side="right"
            onFlip={flipNext}
            canFlip={canGoForward}
            directionHint="forward"
          />
        </div>
      </section>

      <div className="book-navigation">
        <button
          type="button"
          className="button button--ghost"
          onClick={flipBack}
          disabled={!canGoBack || isAnimating}
        >
          Previous Spread
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={flipNext}
          disabled={!canGoForward || isAnimating}
        >
          Next Spread
        </button>
      </div>

      <section className="page-notes-grid">
        {visiblePages.map((page) => (
          <PageNotes key={page.id} page={page} />
        ))}
      </section>
    </div>
  );
}
