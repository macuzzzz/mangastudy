import { quizTypes, verificationStatuses } from "../constants.js";

function firstSentence(text) {
  return text.split(/(?<=[.!?])\s+/)[0]?.trim() || text.trim();
}

function toFactCode(index) {
  return `F${String(index + 1).padStart(3, "0")}`;
}

function toObjectiveCode(index) {
  return `LO${String(index + 1).padStart(2, "0")}`;
}

function toSceneCode(index) {
  return `S${String(index + 1).padStart(2, "0")}`;
}

function toPanelCode(index) {
  return `P${String(index + 1).padStart(3, "0")}`;
}

function buildSourceQuote(text) {
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

export async function extractFacts(sourceChunks, lessonContext) {
  const facts = sourceChunks.slice(0, 10).map((chunk, index) => {
    const primarySentence = firstSentence(chunk.text);
    return {
      factCode: toFactCode(index),
      factText: primarySentence,
      sourceQuote: buildSourceQuote(chunk.text),
      sourceChunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      importance: index < 3 ? "HIGH" : index < 7 ? "MEDIUM" : "SUPPORTING",
      factType:
        lessonContext.subject.toLowerCase().includes("history") ? "HISTORICAL" : "CORE_CONCEPT"
    };
  });

  return facts;
}

export async function mapLearningObjectives(facts, lessonContext) {
  const templates = [
    `Explain the most important turning points in ${lessonContext.title}.`,
    `Connect inventions, people, and social changes in ${lessonContext.subject}.`,
    `Evaluate how the topic changed daily life and why those changes mattered.`
  ];

  return templates.map((objectiveText, index) => ({
    objectiveCode: toObjectiveCode(index),
    objectiveText,
    factCodes: facts
      .filter((_, factIndex) => factIndex % 3 === index % 3 || factIndex === index)
      .slice(0, 4)
      .map((fact) => fact.factCode)
  }));
}

export async function generateStoryPlan(facts, objectives, lessonContext) {
  const pivotFacts = [facts[0], facts[Math.floor(facts.length / 2)], facts[facts.length - 1]].filter(
    Boolean
  );
  return pivotFacts.map((fact, index) => ({
    sceneCode: toSceneCode(index),
    title: index === 0 ? "Origins" : index === 1 ? "The Spread" : "The Aftermath",
    summary: `${fact.factText} This scene translates the source into a clear narrative beat for learners.`,
    purpose:
      index === 0
        ? `Introduce how ${lessonContext.title} began and why it mattered.`
        : index === 1
          ? "Show how events escalated and affected ordinary people."
          : "Examine the consequences and how people responded.",
    anchorFactCodes: [fact.factCode]
  }));
}

export async function generateCharacterBible(storyPlan, lessonContext) {
  return [
    {
      name: "Aiko",
      role: "Student narrator",
      visualDescription:
        "A sharp-eyed learner in a dark school coat with a notebook full of diagrams and marginalia.",
      personality: "Curious, observant, eager to connect facts into a bigger picture.",
      consistencyNotes: "Use her to ask plain-language questions that keep the lesson accessible.",
      visualAnchor: "Ribboned notebook, white gloves, silver pen."
    },
    {
      name: "Mr. Kuroda",
      role: "Historical guide",
      visualDescription:
        "A composed mentor in a dark scholar's coat, lantern light across one side of the face, and a worn satchel of source documents.",
      personality: "Calm, precise, dramatic only when emphasizing cause and effect.",
      consistencyNotes: "Ground each scene in verified facts instead of fantasy embellishment.",
      visualAnchor: "Pocket watch, charcoal scarf, ink-dark lantern."
    }
  ];
}

export async function generateStyleBible() {
  return {
    styleName: "Black Rain Classroom",
    lineStyle: "Heavy ink lines with distressed manga textures and selective motion slashes.",
    shading: "High-contrast halftone shading with dense shadows and pale rim-light on focal subjects.",
    colorRules: "Primarily black, bone, and charcoal with a restrained crimson accent for emphasis only.",
    mood: "Cinematic, serious, source-grounded, and slightly storm-lit.",
    negativeRules:
      "No fully rendered final manga artwork, no inconsistent costumes, no neon palettes, and no text embedded into generated images."
  };
}

export async function generatePanelScripts(storyPlan, characters, facts, objectives) {
  const cameraAngles = [
    "Wide establishing shot",
    "Medium two-shot",
    "Low-angle dramatic shot",
    "Over-the-shoulder shot",
    "Close-up on a key detail",
    "High-angle crowd shot"
  ];
  const narratorPrompts = [
    "What should we notice here?",
    "Why did this matter so much?",
    "How did people react to this?",
    "What changed because of this?",
    "Who was affected the most?",
    "What can we take away from this?"
  ];
  const guideLines = [
    "Keep your eyes on the evidence, not the rumor.",
    "Every claim here traces straight back to the source.",
    "This is one of the turning points to remember.",
    "Notice how one change pushes the next.",
    "History rarely moves in a straight line.",
    "Hold onto this — the quiz will return to it."
  ];

  const narrator = characters[0]?.name || "Aiko";
  const guide = characters[1]?.name || "Mr. Kuroda";
  const panelFacts = facts.slice(0, 6);
  const scenesPerThird = Math.max(1, Math.ceil(panelFacts.length / Math.max(storyPlan.length, 1)));

  return panelFacts.map((fact, index) => {
    const scene = storyPlan[Math.min(Math.floor(index / scenesPerThird), storyPlan.length - 1)] || storyPlan[0];
    const mappedFacts = facts
      .slice(index, index + 2)
      .map((item) => item.factCode)
      .filter(Boolean);
    const groundedFacts = mappedFacts.length ? mappedFacts : [fact.factCode];
    const characterActions = `${narrator} and ${guide} study the moment described in fact ${fact.factCode}.`;

    return {
      panelCode: toPanelCode(index),
      panelNumber: index + 1,
      sceneCode: scene.sceneCode,
      visualDescription: `${scene.title}: ${characterActions}`,
      cameraAngle: cameraAngles[index % cameraAngles.length],
      characterActions,
      narration: fact.factText,
      dialogue: [
        { speaker: narrator, text: narratorPrompts[index % narratorPrompts.length] },
        { speaker: guide, text: guideLines[index % guideLines.length] }
      ],
      factCodes: groundedFacts,
      learningObjectiveCodes: objectives
        .filter((objective) => objective.factCodes.some((code) => groundedFacts.includes(code)))
        .map((objective) => objective.objectiveCode)
    };
  });
}

export async function verifyPanelScripts(panels, facts) {
  return panels.map((panel) => ({
    targetType: "PANEL",
    targetCode: panel.panelCode,
    status: panel.factCodes.length ? verificationStatuses.pass : verificationStatuses.needsReview,
    issues:
      panel.factCodes.length > 0
        ? []
        : ["Panel is missing source-grounding fact links."],
    revisionInstruction:
      panel.factCodes.length > 0
        ? "No revision needed."
        : "Attach at least one supporting fact before approval."
  }));
}

export async function generateImagePrompts(panels, characters, styleBible) {
  return panels.map((panel) => ({
    panelCode: panel.panelCode,
    imagePrompt: `Create a placeholder manga composition for ${panel.panelCode}. Scene: ${panel.visualDescription}. Camera: ${panel.cameraAngle}. Characters: ${characters.map((character) => character.name).join(", ")}. Style: ${styleBible.styleName}. Line style: ${styleBible.lineStyle}. Shading: ${styleBible.shading}. Mood: ${styleBible.mood}. Keep dialogue and narration out of the artwork.`,
    placeholderPrompt: `Placeholder frame for ${panel.panelCode}: ${panel.narration}`
  }));
}

export async function generatePanelPlaceholders(panels, imagePrompts) {
  return panels.map((panel) => {
    const prompt = imagePrompts.find((item) => item.panelCode === panel.panelCode);
    return {
      ...panel,
      imagePrompt: prompt?.imagePrompt || "",
      placeholderPrompt: prompt?.placeholderPrompt || ""
    };
  });
}

export async function generateQuizCards(facts, objectives, lessonContext) {
  const selectedFacts = facts.slice(0, 5);

  return selectedFacts.map((fact, index) => {
    if (index === 1) {
      return {
        question: `True or false: ${fact.factText}`,
        quizType: quizTypes.trueFalse,
        difficulty: "Medium",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation: `This statement matches the source quote: ${fact.sourceQuote}`,
        factCodes: [fact.factCode]
      };
    }

    if (index === 4) {
      return {
        question: `In one or two sentences, explain why this mattered: ${fact.factText}`,
        quizType: quizTypes.shortAnswer,
        difficulty: "Hard",
        options: null,
        correctAnswer: "Answers should explain the historical significance using the lesson facts.",
        explanation: `Strong responses should connect the fact to change in work, society, or technology.`,
        factCodes: [fact.factCode]
      };
    }

    return {
      question: `Which statement best matches this lesson fact: ${fact.factText}`,
      quizType: quizTypes.multipleChoice,
      difficulty: index === 0 ? "Easy" : "Medium",
      options: [
        fact.factText,
        `It happened mainly because entertainment became cheaper.`,
        `It only affected one small village and nowhere else.`,
        `It completely ended all social inequality right away.`
      ],
      correctAnswer: fact.factText,
      explanation: `The correct answer restates the source-grounded fact used in the lesson.`,
      factCodes: [fact.factCode]
    };
  });
}

export async function verifyQuizCards(quizCards) {
  return quizCards.map((quiz, index) => ({
    targetType: "QUIZ",
    targetCode: `Q${String(index + 1).padStart(3, "0")}`,
    status: quiz.factCodes.length ? verificationStatuses.pass : verificationStatuses.needsReview,
    issues: quiz.factCodes.length ? [] : ["Quiz is missing supporting fact links."],
    revisionInstruction:
      quiz.factCodes.length > 0
        ? "No revision needed."
        : "Link this quiz card to at least one extracted fact."
  }));
}

export async function exportImagePromptsForExternalAgents(lessonTitle, styleBible, characters, panels) {
  return {
    lessonTitle,
    styleBible,
    characters,
    panels: panels.map((panel) => ({
      panelCode: panel.panelCode,
      visualDescription: panel.visualDescription,
      imagePrompt: panel.imagePrompt,
      narration: panel.narration,
      dialogue: panel.dialogue,
      factIds: panel.factCodes
    }))
  };
}
