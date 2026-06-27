function normalizeParagraphs(sourceText) {
  return sourceText
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function chunkSourceText(sourceText, options = {}) {
  const paragraphs = normalizeParagraphs(sourceText);
  const groupSize = options.groupSize || 1;
  const chunks = [];

  for (let index = 0; index < paragraphs.length; index += groupSize) {
    const grouped = paragraphs.slice(index, index + groupSize);
    chunks.push({
      chunkIndex: chunks.length + 1,
      text: grouped.join("\n\n"),
      pageNumber: options.pageNumberMap?.[index] || null
    });
  }

  return chunks;
}
