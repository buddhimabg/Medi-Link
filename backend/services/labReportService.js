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
};
// Service function to handle report upload and analysis
const createLabReportAnalysis = async ({ userId, file }) => {
  if (!file) {
    throw new Error("Report file is required.");
  }

  if (typeof parseAndAnalyzeMarkers !== "function") {
    throw new Error("labReportAnalysisService is missing parseAndAnalyzeMarkers export.");
  }

  const extractedText = await extractTextFromReport({
    filePath: file.path,
    mimeType: file.mimetype,
  });

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
  } = analysisResult;

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
};

// Fetch all reports for a user, with optional pagination
const getLabReportHistory = async (userId) => {
  const reports = await LabReport.find({ userId })
    .sort({ createdAt: -1 })
    .select("userId filePath originalFileName markers reportBiomarkers overallScore confidence summary analysisCoverage keyIssues recommendations explanation createdAt")
    .lean();

  return reports;
};

const getLabReportDetail = async (reportId) => {
  const report = await LabReport.findById(reportId).lean();
  return report;
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
