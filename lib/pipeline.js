import { Prisma, VerificationStatus } from "@prisma/client";
import {
  activeProvider,
  exportImagePromptsForExternalAgents,
  extractFacts,
  generateCharacterBible,
  generateImagePrompts,
  generatePanelPlaceholders,
  generatePanelScripts,
  generateQuizCards,
  generateStoryPlan,
  generateStyleBible,
  mapLearningObjectives,
  renderPanelImage,
  verifyPanelScripts,
  verifyQuizCards
} from "./ai/index.js";
import { chunkSourceText } from "./chunking.js";
import { generationSteps, verificationStatuses } from "./constants.js";
import { prisma } from "./prisma.js";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Real panel art is only rendered when the OpenAI provider is active AND
// GENERATE_IMAGES is explicitly enabled. This keeps the default (mock) flow
// free and avoids surprise image-generation costs.
function imageRenderingEnabled() {
  return activeProvider === "openai" && process.env.GENERATE_IMAGES === "true";
}

async function ensureProgressRows(lessonId) {
  const existing = await prisma.generationProgress.findMany({
    where: { lessonId }
  });

  if (existing.length) {
    return;
  }

  await prisma.generationProgress.createMany({
    data: generationSteps.map((step, index) => ({
      lessonId,
      stepCode: step.code,
      label: step.label,
      status: "PENDING",
      stepOrder: index + 1
    }))
  });
}

async function updateProgress(lessonId, stepCode, status, message) {
  await prisma.generationProgress.updateMany({
    where: { lessonId, stepCode },
    data: { status, message }
  });
}

async function resetDerivedLessonData(lessonId) {
  await prisma.quizFact.deleteMany({ where: { quiz: { lessonId } } });
  await prisma.panelFact.deleteMany({ where: { panel: { lessonId } } });
  await prisma.learningObjectiveFact.deleteMany({ where: { objective: { lessonId } } });
  await prisma.verificationResult.deleteMany({ where: { lessonId } });
  await prisma.quizCard.deleteMany({ where: { lessonId } });
  await prisma.panel.deleteMany({ where: { lessonId } });
  await prisma.storyScene.deleteMany({ where: { lessonId } });
  await prisma.styleBible.deleteMany({ where: { lessonId } });
  await prisma.character.deleteMany({ where: { lessonId } });
  await prisma.learningObjective.deleteMany({ where: { lessonId } });
  await prisma.fact.deleteMany({ where: { lessonId } });
  await prisma.sourceChunk.deleteMany({ where: { lessonId } });
  await prisma.generationProgress.deleteMany({ where: { lessonId } });
}

export async function createLessonDraft(input) {
  const lesson = await prisma.lesson.create({
    data: {
      title: input.title,
      subject: input.subject,
      gradeLevel: input.gradeLevel,
      sourceText: input.sourceText,
      status: "DRAFT"
    }
  });

  await ensureProgressRows(lesson.id);
  return lesson;
}

export async function generateLesson(lessonId) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId }
  });

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  if (lesson.status === "READY") {
    return lesson;
  }

  if (lesson.generationLocked) {
    return lesson;
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      generationLocked: true,
      status: "PROCESSING",
      generationError: null
    }
  });

  await prisma.generationProgress.deleteMany({ where: { lessonId } });
  await ensureProgressRows(lessonId);

  try {
    const lessonContext = {
      title: lesson.title,
      subject: lesson.subject,
      gradeLevel: lesson.gradeLevel
    };

    await updateProgress(lessonId, "CREATE_LESSON", "RUNNING", "Preparing lesson context.");
    await sleep(250);
    await updateProgress(lessonId, "CREATE_LESSON", "COMPLETE", "Lesson shell created.");

    await updateProgress(lessonId, "SOURCE_CHUNKS", "RUNNING", "Splitting source text into study chunks.");
    const chunkInputs = chunkSourceText(lesson.sourceText, { groupSize: 1 });
    const chunkRecords = [];
    for (const chunk of chunkInputs) {
      const record = await prisma.sourceChunk.create({
        data: { lessonId, ...chunk }
      });
      chunkRecords.push(record);
    }
    await sleep(250);
    await updateProgress(lessonId, "SOURCE_CHUNKS", "COMPLETE", `${chunkRecords.length} source chunks saved.`);

    await updateProgress(lessonId, "FACTS", "RUNNING", "Extracting grounded facts.");
    const facts = await extractFacts(chunkInputs, lessonContext);
    const factRecords = [];
    for (const fact of facts) {
      const sourceChunk = chunkRecords.find((chunk) => chunk.chunkIndex === fact.sourceChunkIndex);
      const record = await prisma.fact.create({
        data: {
          lessonId,
          factCode: fact.factCode,
          factText: fact.factText,
          sourceQuote: fact.sourceQuote,
          sourceChunkId: sourceChunk.id,
          pageNumber: fact.pageNumber,
          importance: fact.importance,
          factType: fact.factType
        }
      });
      factRecords.push(record);
    }
    await sleep(250);
    await updateProgress(lessonId, "FACTS", "COMPLETE", `${factRecords.length} facts extracted.`);

    await updateProgress(lessonId, "OBJECTIVES", "RUNNING", "Mapping learning objectives.");
    const objectives = await mapLearningObjectives(facts, lessonContext);
    const objectiveRecords = [];
    for (const objective of objectives) {
      const record = await prisma.learningObjective.create({
        data: {
          lessonId,
          objectiveCode: objective.objectiveCode,
          objectiveText: objective.objectiveText
        }
      });
      objectiveRecords.push(record);
    }
    for (const objective of objectives) {
      const objectiveRecord = objectiveRecords.find(
        (record) => record.objectiveCode === objective.objectiveCode
      );
      for (const factCode of objective.factCodes) {
        const factRecord = factRecords.find((factRecord) => factRecord.factCode === factCode);
        if (factRecord) {
          await prisma.learningObjectiveFact.create({
            data: {
              objectiveId: objectiveRecord.id,
              factId: factRecord.id
            }
          });
        }
      }
    }
    await sleep(250);
    await updateProgress(
      lessonId,
      "OBJECTIVES",
      "COMPLETE",
      `${objectiveRecords.length} learning objectives linked to facts.`
    );

    await updateProgress(lessonId, "STORY", "RUNNING", "Planning the manga story arc.");
    const storyPlan = await generateStoryPlan(facts, objectives, lessonContext);
    const sceneRecords = [];
    for (const scene of storyPlan) {
      const record = await prisma.storyScene.create({
        data: {
          lessonId,
          sceneCode: scene.sceneCode,
          title: scene.title,
          summary: scene.summary,
          purpose: scene.purpose
        }
      });
      sceneRecords.push(record);
    }
    await sleep(250);
    await updateProgress(lessonId, "STORY", "COMPLETE", `${sceneRecords.length} scenes planned.`);

    await updateProgress(lessonId, "CHARACTERS", "RUNNING", "Generating character bible.");
    const characters = await generateCharacterBible(storyPlan, lessonContext);
    const characterRecords = [];
    for (const character of characters) {
      const record = await prisma.character.create({
        data: {
          lessonId,
          ...character
        }
      });
      characterRecords.push(record);
    }
    await sleep(250);
    await updateProgress(
      lessonId,
      "CHARACTERS",
      "COMPLETE",
      `${characterRecords.length} characters defined.`
    );

    await updateProgress(lessonId, "STYLE", "RUNNING", "Building style bible.");
    const styleBible = await generateStyleBible();
    const styleRecord = await prisma.styleBible.create({
      data: {
        lessonId,
        ...styleBible
      }
    });
    await sleep(250);
    await updateProgress(lessonId, "STYLE", "COMPLETE", `Style bible ready: ${styleRecord.styleName}.`);

    await updateProgress(lessonId, "PANELS", "RUNNING", "Writing panel scripts.");
    const panelDrafts = await generatePanelScripts(storyPlan, characters, facts, objectives);
    await sleep(250);
    await updateProgress(lessonId, "PANELS", "COMPLETE", `${panelDrafts.length} panel scripts created.`);

    await updateProgress(
      lessonId,
      "VERIFY_PANELS",
      "RUNNING",
      "Checking that every panel stays source-grounded."
    );
    const panelVerifications = await verifyPanelScripts(panelDrafts, facts);
    await sleep(250);
    await updateProgress(lessonId, "VERIFY_PANELS", "COMPLETE", "Panel grounding checks complete.");

    await updateProgress(lessonId, "PROMPTS", "RUNNING", "Creating image-ready prompts and placeholders.");
    const imagePrompts = await generateImagePrompts(panelDrafts, characters, styleBible);
    const completedPanels = await generatePanelPlaceholders(panelDrafts, imagePrompts);
    const panelRecords = [];
    for (const panel of completedPanels) {
      const scene = sceneRecords.find((sceneRecord) => sceneRecord.sceneCode === panel.sceneCode);
      const verification = panelVerifications.find(
        (item) => item.targetCode === panel.panelCode
      );
      const panelRecord = await prisma.panel.create({
        data: {
          lessonId,
          sceneId: scene.id,
          panelCode: panel.panelCode,
          panelNumber: panel.panelNumber,
          visualDescription: panel.visualDescription,
          cameraAngle: panel.cameraAngle,
          characterActions: panel.characterActions,
          narration: panel.narration,
          dialogueJson: JSON.stringify(panel.dialogue),
          imagePrompt: panel.imagePrompt,
          placeholderPrompt: panel.placeholderPrompt,
          verificationStatus: verification?.status || VerificationStatus.PASS
        }
      });
      panelRecords.push(panelRecord);
      for (const factCode of panel.factCodes) {
        const factRecord = factRecords.find((record) => record.factCode === factCode);
        if (factRecord) {
          await prisma.panelFact.create({
            data: {
              panelId: panelRecord.id,
              factId: factRecord.id
            }
          });
        }
      }
      await prisma.verificationResult.create({
        data: {
          lessonId,
          targetType: "PANEL",
          targetId: panelRecord.id,
          status: verification?.status || VerificationStatus.PASS,
          issuesJson: JSON.stringify(verification?.issues || []),
          revisionInstruction: verification?.revisionInstruction || null
        }
      });
    }
    await sleep(250);
    await updateProgress(lessonId, "PROMPTS", "COMPLETE", "Panel prompts and placeholders are ready.");

    if (imageRenderingEnabled()) {
      await updateProgress(lessonId, "IMAGES", "RUNNING", "Rendering panel art with OpenAI.");
      let renderedCount = 0;
      for (const panelRecord of panelRecords) {
        const draft = completedPanels.find((item) => item.panelCode === panelRecord.panelCode);
        try {
          const imageUrl = await renderPanelImage({
            prompt: draft?.imagePrompt || panelRecord.imagePrompt,
            styleBible,
            lessonId,
            panelCode: panelRecord.panelCode,
            characterActions: panelRecord.characterActions
          });
          await prisma.panel.update({
            where: { id: panelRecord.id },
            data: { imageUrl }
          });
          renderedCount += 1;
          await updateProgress(
            lessonId,
            "IMAGES",
            "RUNNING",
            `Rendered ${renderedCount}/${panelRecords.length} panels.`
          );
        } catch (imageError) {
          await updateProgress(
            lessonId,
            "IMAGES",
            "RUNNING",
            `Panel ${panelRecord.panelCode} art failed: ${
              imageError instanceof Error ? imageError.message : "unknown error"
            }`
          );
        }
      }
      await updateProgress(
        lessonId,
        "IMAGES",
        "COMPLETE",
        `Rendered art for ${renderedCount}/${panelRecords.length} panels.`
      );
    } else {
      await updateProgress(
        lessonId,
        "IMAGES",
        "COMPLETE",
        "Skipped panel art. Set OPENAI_API_KEY and GENERATE_IMAGES=true to render real images."
      );
    }

    await updateProgress(lessonId, "QUIZ", "RUNNING", "Generating quiz cards.");
    const quizDrafts = await generateQuizCards(facts, objectives, lessonContext);
    const quizVerifications = await verifyQuizCards(quizDrafts, facts);
    for (let index = 0; index < quizDrafts.length; index += 1) {
      const quizDraft = quizDrafts[index];
      const verification = quizVerifications[index];
      const quizRecord = await prisma.quizCard.create({
        data: {
          lessonId,
          question: quizDraft.question,
          quizType: quizDraft.quizType,
          difficulty: quizDraft.difficulty,
          optionsJson: quizDraft.options ? JSON.stringify(quizDraft.options) : null,
          correctAnswer: quizDraft.correctAnswer,
          explanation: quizDraft.explanation,
          verificationStatus: verification?.status || VerificationStatus.PASS
        }
      });
      for (const factCode of quizDraft.factCodes) {
        const factRecord = factRecords.find((record) => record.factCode === factCode);
        if (factRecord) {
          await prisma.quizFact.create({
            data: {
              quizId: quizRecord.id,
              factId: factRecord.id
            }
          });
        }
      }
      await prisma.verificationResult.create({
        data: {
          lessonId,
          targetType: "QUIZ",
          targetId: quizRecord.id,
          status: verification?.status || VerificationStatus.PASS,
          issuesJson: JSON.stringify(verification?.issues || []),
          revisionInstruction: verification?.revisionInstruction || null
        }
      });
    }
    await sleep(250);
    await updateProgress(lessonId, "QUIZ", "COMPLETE", `${quizDrafts.length} quiz cards created.`);

    await updateProgress(lessonId, "FINALIZE", "RUNNING", "Building final export bundle.");
    await exportImagePromptsForExternalAgents(
      lesson.title,
      styleBible,
      characters,
      completedPanels
    );

    const hasNeedsReview =
      panelVerifications.some((item) => item.status !== verificationStatuses.pass) ||
      quizVerifications.some((item) => item.status !== verificationStatuses.pass);

    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        status: hasNeedsReview ? "NEEDS_REVIEW" : "READY",
        generationLocked: false
      }
    });
    await sleep(250);
    await updateProgress(lessonId, "FINALIZE", "COMPLETE", "Lesson is ready to review.");
  } catch (error) {
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        status: "ERROR",
        generationLocked: false,
        generationError: error instanceof Error ? error.message : "Unknown generation error."
      }
    });

    const lastPending = generationSteps.find((step) => step.code === "FINALIZE");
    if (lastPending) {
      await updateProgress(
        lessonId,
        lastPending.code,
        "ERROR",
        error instanceof Error ? error.message : "Unknown generation error."
      );
    }

    throw error;
  }
}

export async function seedSampleLesson({ title, subject, gradeLevel, sourceText }) {
  const existing = await prisma.lesson.findFirst({
    where: { title, subject, gradeLevel }
  });

  if (existing) {
    await resetDerivedLessonData(existing.id);
    await prisma.lesson.update({
      where: { id: existing.id },
      data: {
        sourceText,
        status: "DRAFT",
        generationError: null,
        generationLocked: false
      }
    });
    await ensureProgressRows(existing.id);
    await generateLesson(existing.id);
    return existing.id;
  }

  const lesson = await createLessonDraft({
    title,
    subject,
    gradeLevel,
    sourceText
  });
  await generateLesson(lesson.id);
  return lesson.id;
}
