export async function extractTextFromPdfFile(file) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = pdfParseModule.default || pdfParseModule;
  const parsed = await pdfParse(buffer);
  const text = parsed.text?.replace(/\r/g, "").trim();

  if (!text) {
    throw new Error("The uploaded PDF did not contain readable text.");
  }

  return {
    text,
    pageCount: parsed.numpages || null
  };
}
