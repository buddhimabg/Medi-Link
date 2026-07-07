const path = require("path");
const LabReport = require("../models/labReport.js");
const Biomarker = require("../models/biomarker.js");
const { extractTextFromReport } = require("./labReportOcrService.js");
const labReportAnalysisService = require("./labReportAnalysisService.js");

const parseAndAnalyzeMarkers =
  labReportAnalysisService.parseAndAnalyzeMarkers ||
  labReportAnalysisService.default?.parseAndAnalyzeMarkers ||
  labReportAnalysisService.default;

const formatNormalRange = (normalMin, normalMax, unit = "") => {
  if (normalMin === undefined || normalMax === undefined) {
    return "";
  }
  const unitText = unit ? ` ${unit}` : "";
  return `${normalMin} - ${normalMax}${unitText}`;
};
//get biomarker details for each marker in the report and add normal range info
const hydrateReportMarkerRanges = async (report) => {
  try {
    if (!report || !Array.isArray(report.markers) || report.markers.length === 0) {
      return report;
    }

  const markerNames = [...new Set(report.markers.map((marker) => marker?.name).filter(Boolean))];
  if (!markerNames.length) {
    return report;
  }

  const biomarkerDocs = await Biomarker.find({ name: { $in: markerNames }, isActive: true })
    .select("name unit ranges")
    .lean();

  const biomarkerByName = new Map(biomarkerDocs.map((item) => [item.name, item]));

  const markers = report.markers.map((marker) => {
    const biomarker = biomarkerByName.get(marker?.name);
    const normalMin = biomarker?.ranges?.normalMin;
    const normalMax = biomarker?.ranges?.normalMax;

    if (normalMin === undefined || normalMax === undefined) {
      return marker;
    }

    const unit = marker?.unit || biomarker?.unit || "";

    return {
      ...marker,
      normalMin,
      normalMax,
      normalRange: formatNormalRange(normalMin, normalMax, unit),
    };
  });

    return {
      ...report,
      markers,
    };
  } catch (err) {
    console.error("hydrateReportMarkerRanges error:", err);
    throw new Error("Failed to hydrate report marker ranges.");
  }
};
// Service function to handle report upload and analysis
const createLabReportAnalysis = async ({ userId, file }) => {
  try {
    if (!file) {
      const err = new Error("Report file is required.");
      err.statusCode = 400;
      throw err;
    }

    if (typeof parseAndAnalyzeMarkers !== "function") {
      throw new Error("labReportAnalysisService is missing parseAndAnalyzeMarkers export.");
    }

    let extractedText;
    try {
      extractedText = await extractTextFromReport({
        filePath: file.path,
        mimeType: file.mimetype,
      });
    } catch (ocrErr) {
      const err = new Error(ocrErr.message || "Could not extract readable text from the uploaded report.");
      err.statusCode = 400;
      throw err;
    }

    const analysisResult = await parseAndAnalyzeMarkers(extractedText);
    const {
      overallScore,
      summary,
      analysisCoverage,
      reportBiomarkers,
      keyIssues,
      markers,
      recommendations,
      confidence,
    } = analysisResult || {};

    if (!reportBiomarkers || reportBiomarkers.length === 0) {
      const err = new Error("The uploaded document does not appear to be a valid lab report. No recognized biomarkers were found.");
      err.statusCode = 400;
      throw err;
    }

    const reportDoc = await LabReport.create({
      userId,
      filePath: file.path,
      originalFileName: file.originalname,
      extractedText,
      markers,
      overallScore,
      confidence,
      summary,
      analysisCoverage,
      reportBiomarkers,
      keyIssues,
      recommendations,
      explanation: "This is not a medical diagnosis. Please consult a doctor.",
    });

    return reportDoc;
  } catch (err) {
    console.error("createLabReportAnalysis error:", err);
    if (err.statusCode) {
      throw err;
    }
    throw new Error("Failed to create lab report analysis.");
  }
};

// Fetch all reports for a user, with optional pagination
const getLabReportHistory = async (userId) => {
  try {
    const reports = await LabReport.find({ userId })
      .sort({ createdAt: -1 })
      .select("userId filePath originalFileName markers reportBiomarkers overallScore confidence summary analysisCoverage keyIssues recommendations explanation createdAt")
      .lean();

    return reports;
  } catch (err) {
    console.error("getLabReportHistory error:", err);
    throw new Error("Failed to fetch lab report history.");
  }
};

const getLabReportDetail = async (reportId) => {
  try {
    const report = await LabReport.findById(reportId).lean();
    return report;
  } catch (err) {
    console.error("getLabReportDetail error:", err);
    throw new Error("Failed to fetch lab report detail.");
  }
};
//
const toClientReport = (report) => {
  if (!report) return null;

  const relativeFilePath = report.filePath
    ? report.filePath.split(path.sep).join("/")
    : "";

  return {
    id: String(report._id),
    userId: report.userId,
    filePath: relativeFilePath,
    originalFileName: report.originalFileName,
    overallScore: report.overallScore || 0,
    summary: report.summary || "",
    analysisCoverage: report.analysisCoverage || { analyzed: 0, available: 0, percentage: 0 },
    reportBiomarkers: report.reportBiomarkers || [],
    keyIssues: report.keyIssues || [],
    markers: report.markers || [],
    recommendations: report.recommendations || { immediateActions: [], dailyPractices: [] },
    confidence: report.confidence || 0,
    explanation: report.explanation || "",
    createdAt: report.createdAt,
  };
};

module.exports = {
  createLabReportAnalysis,
  getLabReportHistory,
  getLabReportDetail,
  toClientReport,
  hydrateReportMarkerRanges,
  formatNormalRange,
};
