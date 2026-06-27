import { blackDeathChapter } from "./sample-chapter.js";

/**
 * Pre-rendered full-page manga art for specific demo lessons.
 *
 * The reader normally builds each page out of structured panels (narration +
 * dialogue + placeholder frames). When a lesson appears here, the matching page
 * is shown as a single full-bleed manga image instead, with the structured
 * panel data kept in the notes below the spread.
 *
 * Drop the image files in `public/assets/demo/` using the paths below. If a file
 * is missing the reader falls back to the structured panels automatically.
 */
const demoPageImagesByTitle = {
  [blackDeathChapter.title]: [
    "/assets/demo/black-death-1.png",
    "/assets/demo/black-death-2.png",
    "/assets/demo/black-death-3.png"
  ]
};

export function getDemoPageImage(lessonTitle, pageNumber) {
  const images = demoPageImagesByTitle[lessonTitle];
  if (!images) {
    return null;
  }

  return images[pageNumber - 1] || null;
}
