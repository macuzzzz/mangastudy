import fs from "node:fs";
import path from "node:path";
import { quizTypes } from "../constants.js";

/**
 * Real generation backed by OpenAI (ChatGPT) for text and gpt-image-1 for art.
 *
 * Text uses the Chat Completions API in JSON mode. To keep the cross-references
 * between facts / objectives / panels / quizzes consistent, the model only ever
 * refers to facts by their 1-based number; this module assigns the stable codes
 * (F001, LO01, S01, P001 ...) and validates every reference before returning.
 */

const TEXT_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations";

function apiKey() {
  return process.env.OPENAI_API_KEY;
}

function textModel() {
  return process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
}

function imageModel() {
  return process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
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

async function openaiJson({ system, user, maxTokens = 2500 }) {
  const key = apiKey();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const response = await fetch(TEXT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: textModel(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI text request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned text that was not valid JSON.");
  }
}

function clampFactIndex(value, factCount) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number) || number < 1 || number > factCount) {
    return null;
  }
  return number - 1;
}

export async function extractFacts(sourceChunks, lessonContext) {
  const chunks = sourceChunks.slice(0, 12);
  const numbered = chunks
    .map((chunk, index) => `Chunk ${index + 1} (chunkIndex ${chunk.chunkIndex}): ${chunk.text}`)
    .join("\n\n");

  const result = await openaiJson({
    system:
      "You are a careful history/curriculum assistant. You only state facts that are explicitly supported by the supplied source text. You never invent information.",
    user: `Lesson: "${lessonContext.title}" (subject: ${lessonContext.subject}, level: ${lessonContext.gradeLevel}).
From the numbered source chunks below, extract the most important teachable facts (one clear fact per chunk where possible, up to ${chunks.length}).

Return JSON: { "facts": [ { "fromChunk": <chunk number 1-${chunks.length}>, "factText": "one sentence, grounded in that chunk", "sourceQuote": "a short verbatim quote (<=180 chars) from that chunk", "importance": "HIGH" | "MEDIUM" | "SUPPORTING" } ] }

Source chunks:
${numbered}`
  });

  const rawFacts = Array.isArray(result.facts) ? result.facts : [];
  const isHistory = lessonContext.subject.toLowerCase().includes("history");

  return rawFacts.slice(0, chunks.length).map((fact, index) => {
    const chunkPos = clampFactIndex(fact.fromChunk, chunks.length);
    const chunk = chunks[chunkPos ?? index % chunks.length];
    return {
      factCode: toFactCode(index),
      factText: String(fact.factText || "").trim() || chunk.text.slice(0, 120),
      sourceQuote: String(fact.sourceQuote || chunk.text).slice(0, 180),
      sourceChunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber ?? null,
      importance: ["HIGH", "MEDIUM", "SUPPORTING"].includes(fact.importance)
        ? fact.importance
        : index < 3
          ? "HIGH"
          : index < 7
            ? "MEDIUM"
            : "SUPPORTING",
      factType: isHistory ? "HISTORICAL" : "CORE_CONCEPT"
    };
  });
}

export async function mapLearningObjectives(facts, lessonContext) {
  const factList = facts.map((fact, index) => `${index + 1}. ${fact.factText}`).join("\n");
  const result = await openaiJson({
    system: "You design clear, measurable learning objectives grounded in the provided facts.",
    user: `Lesson: "${lessonContext.title}" (${lessonContext.subject}, ${lessonContext.gradeLevel}).
Write 3 learning objectives. Each must reference the facts that support it by number.

Return JSON: { "objectives": [ { "objectiveText": "...", "factNumbers": [<fact numbers>] } ] }

Facts:
${factList}`
  });

  const raw = Array.isArray(result.objectives) ? result.objectives : [];
  return raw.slice(0, 3).map((objective, index) => ({
    objectiveCode: toObjectiveCode(index),
    objectiveText:
      String(objective.objectiveText || "").trim() ||
      `Explain the key ideas in ${lessonContext.title}.`,
    factCodes: (Array.isArray(objective.factNumbers) ? objective.factNumbers : [])
      .map((number) => clampFactIndex(number, facts.length))
      .filter((value) => value !== null)
      .map((value) => facts[value].factCode)
      .slice(0, 4)
  }));
}

export async function generateStoryPlan(facts, objectives, lessonContext) {
  const factList = facts.map((fact, index) => `${index + 1}. ${fact.factText}`).join("\n");
  const result = await openaiJson({
    system:
      "You are a manga story editor turning factual lessons into a clear three-beat narrative arc. Stay grounded in the facts.",
    user: `Lesson: "${lessonContext.title}". Plan exactly 3 scenes (beginning, middle, end) that carry the facts as a story.

Return JSON: { "scenes": [ { "title": "short title", "summary": "1-2 sentences", "purpose": "what this scene teaches", "anchorFactNumber": <fact number> } ] }

Facts:
${factList}`
  });

  const raw = Array.isArray(result.scenes) ? result.scenes : [];
  const scenes = raw.slice(0, 3).map((scene, index) => {
    const anchor = clampFactIndex(scene.anchorFactNumber, facts.length);
    return {
      sceneCode: toSceneCode(index),
      title: String(scene.title || "").trim() || ["Origins", "The Spread", "The Aftermath"][index],
      summary: String(scene.summary || "").trim() || facts[anchor ?? 0]?.factText || "",
      purpose: String(scene.purpose || "").trim() || "Advance the lesson's story.",
      anchorFactCodes: anchor !== null ? [facts[anchor].factCode] : []
    };
  });

  return scenes.length ? scenes : [];
}

export async function generateCharacterBible(storyPlan, lessonContext) {
  const result = await openaiJson({
    system:
      "You design a small, consistent cast for an educational manga. Keep it to a curious student narrator and a knowledgeable guide.",
    user: `Lesson: "${lessonContext.title}" (${lessonContext.subject}). Define exactly 2 recurring characters: a student narrator and a subject-matter guide.

Return JSON: { "characters": [ { "name": "...", "role": "...", "visualDescription": "...", "personality": "...", "consistencyNotes": "...", "visualAnchor": "..." } ] }`,
    maxTokens: 1200
  });

  const raw = Array.isArray(result.characters) ? result.characters : [];
  const characters = raw.slice(0, 2).map((character) => ({
    name: String(character.name || "Narrator").trim(),
    role: String(character.role || "Student narrator").trim(),
    visualDescription: String(character.visualDescription || "A focused young student.").trim(),
    personality: String(character.personality || "Curious and observant.").trim(),
    consistencyNotes: String(character.consistencyNotes || "Keep design consistent across panels.").trim(),
    visualAnchor: String(character.visualAnchor || "Notebook and pen.").trim()
  }));

  return characters.length ? characters : [];
}

export async function generatePanelScripts(storyPlan, characters, facts, objectives) {
  const factList = facts.map((fact, index) => `${index + 1}. ${fact.factText}`).join("\n");
  const sceneList = storyPlan
    .map((scene, index) => `${index + 1}. [${scene.sceneCode}] ${scene.title} — ${scene.purpose}`)
    .join("\n");
  const cast = characters.map((character) => character.name).join(" and ");

  const result = await openaiJson({
    system:
      "You write manga panel scripts for an educational comic. Every panel must be grounded in at least one numbered fact. Keep narration short and dialogue natural.",
    user: `Cast: ${cast}. Write exactly 6 panels that move through the scenes in order and teach the facts.

Return JSON: { "panels": [ { "sceneNumber": <scene number 1-${storyPlan.length}>, "cameraAngle": "...", "characterActions": "what is happening visually", "narration": "1 short sentence", "dialogue": [ { "speaker": "<character name>", "text": "..." } ], "factNumbers": [<fact numbers this panel teaches>] } ] }

Scenes:
${sceneList}

Facts:
${factList}`,
    maxTokens: 3000
  });

  const raw = Array.isArray(result.panels) ? result.panels : [];
  return raw.slice(0, 6).map((panel, index) => {
    const scenePos = clampFactIndex(panel.sceneNumber, storyPlan.length);
    const scene = storyPlan[scenePos ?? Math.min(index, storyPlan.length - 1)] || storyPlan[0];
    const factCodes = (Array.isArray(panel.factNumbers) ? panel.factNumbers : [])
      .map((number) => clampFactIndex(number, facts.length))
      .filter((value) => value !== null)
      .map((value) => facts[value].factCode);
    const groundedFacts = factCodes.length ? factCodes : [facts[index % facts.length].factCode];
    const dialogue = (Array.isArray(panel.dialogue) ? panel.dialogue : [])
      .map((line) => ({
        speaker: String(line.speaker || characters[0]?.name || "Narrator").trim(),
        text: String(line.text || "").trim()
      }))
      .filter((line) => line.text);

    const characterActions =
      String(panel.characterActions || "").trim() || `${cast} examine ${scene.title}.`;

    return {
      panelCode: toPanelCode(index),
      panelNumber: index + 1,
      sceneCode: scene.sceneCode,
      visualDescription: `${scene.title}: ${characterActions}`,
      cameraAngle: String(panel.cameraAngle || "Medium shot").trim(),
      characterActions,
      narration: String(panel.narration || "").trim() || facts[index % facts.length].factText,
      dialogue: dialogue.length ? dialogue : [{ speaker: cast, text: "Let's look closer." }],
      factCodes: groundedFacts,
      learningObjectiveCodes: objectives
        .filter((objective) => objective.factCodes.some((code) => groundedFacts.includes(code)))
        .map((objective) => objective.objectiveCode)
    };
  });
}

export async function generateQuizCards(facts, objectives, lessonContext) {
  const factList = facts.map((fact, index) => `${index + 1}. ${fact.factText}`).join("\n");
  const result = await openaiJson({
    system:
      "You write source-grounded quiz cards. Correct answers must come straight from the facts. Distractors must be clearly wrong but plausible.",
    user: `Lesson: "${lessonContext.title}". Write 5 quiz cards mixing multiple choice, one true/false, and one short answer.

Return JSON: { "quizzes": [ { "question": "...", "quizType": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER", "difficulty": "Easy" | "Medium" | "Hard", "options": ["..."] | null, "correctAnswer": "...", "explanation": "...", "factNumbers": [<fact numbers>] } ] }

Facts:
${factList}`,
    maxTokens: 2500
  });

  const raw = Array.isArray(result.quizzes) ? result.quizzes : [];
  const validTypes = Object.values(quizTypes);

  return raw.slice(0, 5).map((quiz, index) => {
    const quizType = validTypes.includes(quiz.quizType) ? quiz.quizType : quizTypes.multipleChoice;
    const factCodes = (Array.isArray(quiz.factNumbers) ? quiz.factNumbers : [])
      .map((number) => clampFactIndex(number, facts.length))
      .filter((value) => value !== null)
      .map((value) => facts[value].factCode);

    return {
      question: String(quiz.question || "").trim() || `What does fact ${index + 1} describe?`,
      quizType,
      difficulty: ["Easy", "Medium", "Hard"].includes(quiz.difficulty) ? quiz.difficulty : "Medium",
      options:
        quizType === quizTypes.multipleChoice
          ? (Array.isArray(quiz.options) ? quiz.options : []).map(String).slice(0, 4)
          : quizType === quizTypes.trueFalse
            ? ["True", "False"]
            : null,
      correctAnswer: String(quiz.correctAnswer || "").trim(),
      explanation: String(quiz.explanation || "").trim() || "Grounded in the lesson facts.",
      factCodes: factCodes.length ? factCodes : [facts[index % facts.length].factCode]
    };
  });
}

export async function renderPanelImage({ prompt, styleBible, lessonId, panelCode, characterActions }) {
  const key = apiKey();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const artDirection = styleBible
    ? `Art style: ${styleBible.lineStyle} ${styleBible.shading} Mood: ${styleBible.mood}.`
    : "High-contrast black-and-white manga ink style.";

  const fullPrompt = `Black-and-white manga comic panel. ${characterActions || ""} ${prompt} ${artDirection} No text, no speech bubbles, no lettering, no watermark.`.trim();

  const response = await fetch(IMAGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: imageModel(),
      prompt: fullPrompt.slice(0, 3800),
      n: 1,
      size: process.env.OPENAI_IMAGE_SIZE || "1024x1536"
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI image request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const item = data.data?.[0];
  let buffer;
  if (item?.b64_json) {
    buffer = Buffer.from(item.b64_json, "base64");
  } else if (item?.url) {
    const imageResponse = await fetch(item.url);
    buffer = Buffer.from(await imageResponse.arrayBuffer());
  } else {
    throw new Error("OpenAI image response contained no image data.");
  }

  const directory = path.join(process.cwd(), "public", "assets", "generated", lessonId);
  fs.mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, `${panelCode}.png`);
  fs.writeFileSync(filePath, buffer);

  return `/assets/generated/${lessonId}/${panelCode}.png`;
}
