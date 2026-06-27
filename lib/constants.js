export const generationSteps = [
  { code: "CREATE_LESSON", label: "Creating lesson" },
  { code: "SOURCE_CHUNKS", label: "Extracting source chunks" },
  { code: "FACTS", label: "Extracting facts" },
  { code: "OBJECTIVES", label: "Mapping learning objectives" },
  { code: "STORY", label: "Planning manga story" },
  { code: "CHARACTERS", label: "Building character bible" },
  { code: "STYLE", label: "Building style bible" },
  { code: "PANELS", label: "Writing panel scripts" },
  { code: "VERIFY_PANELS", label: "Verifying source grounding" },
  { code: "PROMPTS", label: "Creating image-ready prompts" },
  { code: "IMAGES", label: "Rendering panel art" },
  { code: "QUIZ", label: "Creating quiz cards" },
  { code: "FINALIZE", label: "Finalizing lesson" }
];

export const quizTypes = {
  multipleChoice: "MULTIPLE_CHOICE",
  trueFalse: "TRUE_FALSE",
  shortAnswer: "SHORT_ANSWER"
};

export const verificationStatuses = {
  pass: "PASS",
  needsReview: "NEEDS_REVIEW",
  fail: "FAIL"
};
