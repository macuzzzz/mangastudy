import * as mock from "./mock-service.js";
import * as openai from "./openai-service.js";

/**
 * AI service dispatcher.
 *
 * The OpenAI service implements the *generative* steps (facts, objectives,
 * story, characters, panels, quizzes) plus real image rendering. The mock
 * service implements those too, plus the deterministic helpers OpenAI does not
 * cover (style bible, image prompts, placeholders, verification, export).
 *
 * Provider selection:
 *   - AI_PROVIDER=openai|mock forces a provider explicitly.
 *   - Otherwise OpenAI is used when OPENAI_API_KEY is set, mock otherwise.
 *
 * With no key configured this resolves to the pure mock path, so the app keeps
 * working out of the box; adding OPENAI_API_KEY (and restarting) switches the
 * generative steps to real model calls with no other code changes.
 */
export const activeProvider =
  process.env.AI_PROVIDER === "mock"
    ? "mock"
    : process.env.AI_PROVIDER === "openai" || process.env.OPENAI_API_KEY
      ? "openai"
      : "mock";

const generative = activeProvider === "openai" ? openai : mock;

// Generative steps — real model when active, deterministic mock otherwise.
export const extractFacts = generative.extractFacts;
export const mapLearningObjectives = generative.mapLearningObjectives;
export const generateStoryPlan = generative.generateStoryPlan;
export const generateCharacterBible = generative.generateCharacterBible;
export const generatePanelScripts = generative.generatePanelScripts;
export const generateQuizCards = generative.generateQuizCards;

// Deterministic helpers with no OpenAI implementation — always from the mock.
export const generateStyleBible = mock.generateStyleBible;
export const generateImagePrompts = mock.generateImagePrompts;
export const generatePanelPlaceholders = mock.generatePanelPlaceholders;
export const verifyPanelScripts = mock.verifyPanelScripts;
export const verifyQuizCards = mock.verifyQuizCards;
export const exportImagePromptsForExternalAgents = mock.exportImagePromptsForExternalAgents;

// Real panel-art rendering (OpenAI only; returns a public path under /assets/generated).
export const renderPanelImage = openai.renderPanelImage;
