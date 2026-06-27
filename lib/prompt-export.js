import { formatLessonForUI } from "./lesson-format.js";

export function buildPromptExport(lesson) {
  const formatted = formatLessonForUI(lesson);
  const styleBible = formatted.styleBibles[0]
    ? {
        styleName: formatted.styleBibles[0].styleName,
        lineStyle: formatted.styleBibles[0].lineStyle,
        shading: formatted.styleBibles[0].shading,
        colorRules: formatted.styleBibles[0].colorRules,
        mood: formatted.styleBibles[0].mood,
        negativeRules: formatted.styleBibles[0].negativeRules
      }
    : null;

  const data = {
    lessonTitle: formatted.title,
    styleBible,
    characters: formatted.characters.map((character) => ({
      name: character.name,
      role: character.role,
      visualDescription: character.visualDescription,
      personality: character.personality,
      consistencyNotes: character.consistencyNotes,
      visualAnchor: character.visualAnchor
    })),
    panels: formatted.panels.map((panel) => ({
      panelCode: panel.panelCode,
      visualDescription: panel.visualDescription,
      imagePrompt: panel.imagePrompt,
      narration: panel.narration,
      dialogue: panel.dialogue,
      factIds: panel.factIds
    }))
  };

  const markdown = [
    `# ${data.lessonTitle}`,
    "",
    "## Style Bible",
    styleBible
      ? Object.entries(styleBible)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join("\n")
      : "- None",
    "",
    "## Characters",
    ...data.characters.map(
      (character) =>
        `- ${character.name} (${character.role}): ${character.visualDescription} | ${character.personality}`
    ),
    "",
    "## Panels",
    ...data.panels.flatMap((panel) => [
      `### ${panel.panelCode}`,
      `Visual: ${panel.visualDescription}`,
      `Prompt: ${panel.imagePrompt}`,
      `Narration: ${panel.narration}`,
      `Dialogue: ${panel.dialogue.map((line) => `${line.speaker}: ${line.text}`).join(" / ")}`,
      `Facts: ${panel.factIds.join(", ")}`,
      ""
    ])
  ].join("\n");

  return {
    data,
    markdown
  };
}
