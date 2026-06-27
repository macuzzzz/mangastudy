import { getDemoPageImage } from "./demo-pages.js";

export function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function buildLessonPages(panels, panelsPerPage = 2) {
  const pages = [];

  for (let index = 0; index < panels.length; index += panelsPerPage) {
    const pagePanels = panels.slice(index, index + panelsPerPage);
    if (!pagePanels.length) {
      continue;
    }

    pages.push({
      id: `page-${pages.length + 1}`,
      pageNumber: pages.length + 1,
      title: pagePanels[0].scene?.title || `Page ${pages.length + 1}`,
      summary: pagePanels.map((panel) => panel.narration).join(" "),
      panels: pagePanels,
      factIds: [...new Set(pagePanels.flatMap((panel) => panel.factIds))]
    });
  }

  return pages;
}

export function formatLessonForUI(lesson) {
  const panels = lesson.panels
    .slice()
    .sort((a, b) => a.panelNumber - b.panelNumber)
    .map((panel) => ({
      ...panel,
      dialogue: parseJson(panel.dialogueJson, []),
      factIds: panel.factLinks.map((link) => link.fact.factCode),
      facts: panel.factLinks.map((link) => link.fact)
    }));

  const pages = buildLessonPages(panels).map((page) => ({
    ...page,
    imageSrc: getDemoPageImage(lesson.title, page.pageNumber)
  }));

  return {
    ...lesson,
    panels,
    pages,
    quizCards: lesson.quizCards.map((quiz) => ({
      ...quiz,
      options: parseJson(quiz.optionsJson, null),
      factIds: quiz.factLinks.map((link) => link.fact.factCode),
      facts: quiz.factLinks.map((link) => link.fact)
    }))
  };
}
