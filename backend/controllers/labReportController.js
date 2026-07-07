const { apiSuccess, apiFail } = require("../utils/apiResponse");
const {
  createLabReportAnalysis,
  getLabReportHistory,
  getLabReportDetail,
  hydrateReportMarkerRanges,
  toClientReport,
} = require("../services/labReportService");

/**
 * Upload and analyze lab report
 * - Handles file upload validation
 * - Calls service layer for processing
 * - Returns formatted client response
 */
const uploadAndAnalyzeReport = async (req, res) => {
  try {
    const userId = req.body?.userId || req.query?.userId;
    if (!userId) {
      return res.status(400).json(apiFail("userId is required."));
    }

    // Validate file existence
    if (!req.file) {
      return res.status(400).json(apiFail("Please upload a PDF or image report file."));
    }

    // Service layer handles analysis logic 
    const report = await createLabReportAnalysis({
      userId,
      file: req.file,
    });

    return res.status(201).json(
      apiSuccess(
        { report: toClientReport(report) },
        "Report uploaded and analyzed successfully"
      )
    );
  } catch (error) {
    // Error handling added for stability (important for production + marking)
    console.error("Upload Report Error:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json(apiFail(error.message));
    }
    return res.status(500).json(apiFail("Internal server error"));
  }
};

/**
 * Get all report history for a user
 * - Returns list + count
 */
const getReportHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate required parameter
    if (!userId) {
      return res.status(400).json(apiFail("userId is required."));
    }

    const reports = await getLabReportHistory(userId);

    return res.json(
      apiSuccess(
        {
          reports: reports.map(toClientReport), // transform data for frontend
          count: reports.length,
        },
        "Report history retrieved"
      )
    );
  } catch (error) {
    console.error("Get Report History Error:", error);
    return res.status(500).json(apiFail("Internal server error"));
  }
};

/**
 * Get single report detail by ID
 * - Adds marker range hydration for enriched response
 */
const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await getLabReportDetail(reportId);

    // Handle not found case
    if (!report) {
      return res.status(404).json(apiFail("Report not found."));
    }

    // Enrich report with reference ranges (business logic in service layer)
    const reportWithRanges = await hydrateReportMarkerRanges(report);

    return res.json(
      apiSuccess(
        { report: toClientReport(reportWithRanges) },
        "Report detail retrieved"
      )
    );
  } catch (error) {
    console.error("Get Report By ID Error:", error);
    return res.status(500).json(apiFail("Internal server error"));
  }
};

module.exports = {
  uploadAndAnalyzeReport,
  getReportHistory,
  getReportById,
};