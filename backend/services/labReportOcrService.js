const { readFile } = require("fs/promises");
const { PDFParse } = require("pdf-parse");
const Tesseract = require("tesseract.js");

// Minimum text length to trust direct PDF text extraction
const MIN_TEXT_LENGTH = 40;

// OCR only first few pages for better performance
const MAX_OCR_PAGES = 4;

// OCR language
const OCR_LANGUAGE = "eng";

// Clean extracted text by removing extra spaces/new lines
const normalizeText = (text = "") =>
  String(text)
    .replace(/\s+/g, " ")
    .trim();

// Run OCR on image/page buffer
const runOcr = async (input) => {
  const { data } = await Tesseract.recognize(input, OCR_LANGUAGE);
  return normalizeText(data?.text);
};

// Extract selectable text from PDF
const extractDirectPdfText = async (parser) => {
  const result = await parser.getText();
  return normalizeText(result?.text);
};

// Convert scanned PDF pages to images and run OCR
const extractScannedPdfText = async (parser) => {
  const screenshot = await parser.getScreenshot({
    scale: 1.8,                 // Better image quality for OCR
    first: MAX_OCR_PAGES,       // Only first pages
    imageDataUrl: false,
    imageBuffer: true,
  });

  // Get valid page image buffers
  const pages = (screenshot?.pages || [])
    .map((page) => page?.data)
    .filter(Boolean);

  const textParts = [];

  // OCR each page one by one
  for (const page of pages) {
    const text = await runOcr(page);
    if (text) textParts.push(text);
  }

  return normalizeText(textParts.join(" "));
};

// Main PDF extraction logic
const extractPdfText = async (filePath) => {
  const fileBuffer = await readFile(filePath);
  const parser = new PDFParse({ data: fileBuffer });

  try {
    // Try normal text extraction first
    const directText = await extractDirectPdfText(parser);

    // If enough text found, return it
    if (directText.length >= MIN_TEXT_LENGTH) {
      return directText;
    }

    // If scanned PDF, fallback to OCR
    const ocrText = await extractScannedPdfText(parser);

    return ocrText || directText;
  } finally {
    // Always release parser resources
    await parser.destroy();
  }
};

// Exported function used by controller/service
const extractTextFromReport = async ({ filePath }) => {
  if (!filePath) {
    throw new Error("Missing PDF file path.");
  }

  const extractedText = await extractPdfText(filePath);

  if (!extractedText) {
    throw new Error(
      "Could not extract readable text from the uploaded PDF."
    );
  }

  return extractedText;
};

module.exports = {
  extractTextFromReport,
};