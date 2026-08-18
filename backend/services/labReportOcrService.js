const { readFile } = require("fs/promises");
const { PDFParse } = require("pdf-parse");
const Tesseract = require("tesseract.js");

// Minimum text length to trust direct PDF text extraction
const MIN_TEXT_LENGTH = 40;

// OCR only first few pages for better performance
const MAX_OCR_PAGES = 4;

// OCR language
const OCR_LANGUAGE = "eng";

// Clean extracted text by removing extra horizontal spaces while preserving line breaks
const normalizeText = (text = "") =>
  String(text)
    .replace(/\r\n|\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Run OCR on image/page buffer
const runOcr = async (input) => {
  const { data } = await Tesseract.recognize(input, OCR_LANGUAGE);
  return {
    text: normalizeText(data?.text),
    confidence: typeof data?.confidence === "number" ? Math.round(data.confidence) : 80,
  };
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
  let totalConfidence = 0;
  let pageCount = 0;

  // OCR each page one by one
  for (const page of pages) {
    const ocrResult = await runOcr(page);
    if (ocrResult.text) {
      textParts.push(ocrResult.text);
      totalConfidence += ocrResult.confidence;
      pageCount++;
    }
  }

  const averageConfidence = pageCount > 0 ? Math.round(totalConfidence / pageCount) : 50;

  return {
    text: normalizeText(textParts.join("\n")),
    confidence: averageConfidence,
  };
};

// Extract text directly from an image file (JPG, PNG, WEBP, etc.)
const extractImageText = async (filePath) => {
  try {
    const fileBuffer = await readFile(filePath);
    const result = await runOcr(fileBuffer);
    return {
      text: result.text || "",
      confidence: result.confidence || 70,
    };
  } catch (err) {
    const error = new Error("The uploaded PDF could not be read. Please upload a valid PDF.");
    error.code = "INVALID_PDF";
    error.statusCode = 400;
    throw error;
  }
};

// Main PDF extraction logic
const extractPdfText = async (filePath) => {
  let fileBuffer;
  try {
    fileBuffer = await readFile(filePath);
  } catch (err) {
    const error = new Error("The uploaded PDF could not be read. Please upload a valid PDF.");
    error.code = "INVALID_PDF";
    error.statusCode = 400;
    throw error;
  }

  let parser;
  try {
    parser = new PDFParse({ data: fileBuffer });
  } catch (err) {
    const error = new Error("The uploaded PDF could not be read. Please upload a valid PDF.");
    error.code = "INVALID_PDF";
    error.statusCode = 400;
    throw error;
  }

  try {
    // Try normal text extraction first
    const directText = await extractDirectPdfText(parser);

    // If enough text found, return direct text with 100% confidence
    if (directText && directText.length >= MIN_TEXT_LENGTH) {
      return { text: directText, confidence: 100 };
    }

    // If scanned PDF, fallback to OCR
    const ocrResult = await extractScannedPdfText(parser);

    return {
      text: ocrResult.text || directText || "",
      confidence: ocrResult.confidence || (directText ? 80 : 0),
    };
  } catch (err) {
    const error = new Error("The uploaded PDF could not be read. Please upload a valid PDF.");
    error.code = "INVALID_PDF";
    error.statusCode = 400;
    throw error;
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
};

// Exported function used by controller/service
const extractTextFromReport = async ({ filePath, mimeType }) => {
  if (!filePath) {
    const err = new Error("Unsupported file type. Please upload a PDF lab report.");
    err.code = "UNSUPPORTED_FILE_TYPE";
    err.statusCode = 400;
    throw err;
  }

  const isPdf =
    mimeType === "application/pdf" ||
    /\.pdf$/i.test(filePath);

  if (!isPdf) {
    const err = new Error("Unsupported file type. Please upload a PDF lab report.");
    err.code = "UNSUPPORTED_FILE_TYPE";
    err.statusCode = 400;
    throw err;
  }

  const extractionResult = await extractPdfText(filePath);

  const text = typeof extractionResult === "string" ? extractionResult : extractionResult?.text || "";
  const confidence = typeof extractionResult === "object" ? extractionResult.confidence : 100;

  if (!text || text.trim().length === 0) {
    const err = new Error("No readable text was found in this PDF. Please upload a clearer lab report.");
    err.code = "NO_READABLE_TEXT";
    err.statusCode = 400;
    throw err;
  }

  return { text, confidence };
};

module.exports = {
  extractTextFromReport,
};