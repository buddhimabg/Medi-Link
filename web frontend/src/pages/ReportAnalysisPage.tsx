// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./ReportAnalysisPage.css";
import { getCurrentUserId, UI_ALERT_TIMEOUT_MS } from "../config";
import { fetchReportHistory, uploadAndAnalyzeReport } from "../api/reportApi";
import LabReportIcon from "../assets/LabReportIcon";
import HealthScoreIcon from "../assets/HealthScoreIcon";
import TrendIcon from "../assets/TrendIcon";
import UploadIcon from "../assets/UploadIcon";
import {
  downloadReportAsText,
  getReportDisplayName,
  getVisibleReportMarkers,
  shareReport,
} from "../utils/reportPresentation";
import { PageLoadingSpinner, InlineAlert, LoadingButton, EmptyState } from "../components/ui";
import { getErrorMessage } from "../utils/errorHandler";

const statusClassMap = {
  normal: "bg-green-100 text-green-700",
  low: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
  "not-found": "bg-gray-100 text-gray-600",
};

const RECENT_REPORTS_LIMIT = 3;

const calculateAvgScore = (reports = []) => {
  if (!reports.length) return 0;
  const total = reports.reduce((sum, report) => sum + (report.overallScore || 0), 0);
  return Math.round(total / reports.length);
};

const ReportAnalysisPage = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [reports, setReports] = useState([]);
  const [latestReport, setLatestReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [showAllReports, setShowAllReports] = useState(false);
  const fileInputRef = useRef(null);

  const userId = getCurrentUserId();

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetchReportHistory(userId);
      const nextReports = response?.reports || [];
      setReports(nextReports);
      if (nextReports.length > 0) {
        setLatestReport(nextReports[0]);
      }
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load report history"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const stats = useMemo(() => {
    return {
      totalReports: reports.length,
      latestScore: reports[0]?.overallScore ?? 0,
      avgScore: calculateAvgScore(reports),
      lastUploaded: reports[0]?.createdAt
        ? new Date(reports[0].createdAt).toLocaleDateString()
        : "No uploads",
    };
  }, [reports]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");

      const response = await uploadAndAnalyzeReport({ userId, file });
      const report = response?.report;

      if (report) {
        setLatestReport(report);
        setActionMessage("Report uploaded and analyzed successfully.");
      }

      await loadHistory();
    } catch (err: any) {
      setError(getErrorMessage(err, "Upload failed. Please try a PDF or image file and try again."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const visibleReports = useMemo(() => {
    return showAllReports ? reports : reports.slice(0, RECENT_REPORTS_LIMIT);
  }, [reports, showAllReports]);

  const handleShare = async (report) => {
    try {
      const reportUrl = `${window.location.origin}/reports/${report.id}`;
      const result = await shareReport(report, reportUrl);
      if (result === "copied") {
        setActionMessage("Report link copied to clipboard.");
      }
      if (result === "unsupported") {
        setActionMessage("Sharing is not supported on this device.");
      }
    } catch (shareError: any) {
      if (shareError?.name !== "AbortError") {
        setActionMessage("Unable to share this report right now.");
      }
    }
  };

  const handleDownload = (report) => {
    downloadReportAsText(report);
    setActionMessage("Report downloaded.");
  };

  const iconButtonClass =
    "p-2.5 bg-white/90 rounded-xl shadow-sm border border-[#BFD4FF] hover:border-[#0C5BD5] hover:bg-white transition-all duration-300 group";

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Report Analysis" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Lab Report Analysis</h1>
              <p className="text-gray-500 mt-1">Upload and analyze mental health biomarkers</p>
            </div>

            {/* Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <LoadingButton
                isLoading={uploading}
                loadingText="Analyzing…"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 rounded-lg"
              >
                <UploadIcon className="w-4 h-4 mr-2 inline-block" />
                Upload Report
              </LoadingButton>
            </div>
          </div>

          {loading ? (
            <div className="py-12">
              <PageLoadingSpinner message="Loading your reports…" fullHeight={false} />
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="mb-6">
                  <InlineAlert type="error" message={error} onClose={() => setError("")} />
                </div>
              )}

              {actionMessage && !error && (
                <div className="mb-6 animate-slide-in">
                  <InlineAlert type="success" message={actionMessage} autoCloseMs={UI_ALERT_TIMEOUT_MS} onClose={() => setActionMessage("")} />
                </div>
              )}

          {/* Stats Cards - Simple style like mood tracker */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-[#DCE8FF]">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(12, 91, 213, 0.14)' }}
                >
                  <LabReportIcon className="w-5 h-5 text-[#0C5BD5]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-medium">Total Reports</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">{stats.totalReports}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-[#DCE8FF]">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(12, 91, 213, 0.14)' }}
                >
                  <HealthScoreIcon className="w-5 h-5 text-[#0C5BD5]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-medium">Latest Score</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">{stats.latestScore}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-[#DCE8FF]">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(12, 91, 213, 0.14)' }}
                >
                  <TrendIcon className="w-5 h-5 text-[#0C5BD5]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-medium">Avg Score</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">{stats.avgScore}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-[#DCE8FF]">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(12, 91, 213, 0.14)' }}
                >
                  <span className="text-lg">📅</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-medium">Last Upload</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5 truncate">{stats.lastUploaded}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reports Section */}
          <div className="mb-8 bg-[#DCE6F6] rounded-2xl p-5 shadow-sm border border-[#6BB5FF]">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  {showAllReports ? "All Analysis Reports" : "Recent Analysis Reports"}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {showAllReports
                    ? `${reports.length} total reports available`
                    : `Showing latest ${Math.min(reports.length, RECENT_REPORTS_LIMIT)} reports`}
                </p>
              </div>
              {reports.length > RECENT_REPORTS_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAllReports((prev) => !prev)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-[#0C5BD5] hover:text-[#0C5BD5] transition"
                >
                  {showAllReports ? "Show Recent" : "View All"}
                </button>
              )}
            </div>

            {/* Reports List */}
            <div className="space-y-3">
              {reports.length === 0 ? (
                <EmptyState title="No reports yet" description="Upload a PDF or image of your lab report to get started." />
              ) : (
                visibleReports.map((report) => {
                  const visibleMarkers = getVisibleReportMarkers(report);
                  const previewMarkers = visibleMarkers.slice(0, 4);

                  return (
                    <article
                      key={report.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/reports/${report.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/reports/${report.id}`);
                        }
                      }}
                      className="group w-full bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0C5BD5]/30"
                    >
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                        <div className="flex-1 min-w-0">
                          <div className="inline-flex items-center rounded-full border border-[#BCD0F5] bg-[#F6FAFF] px-2.5 py-1 text-xs font-semibold text-[#34507F] mb-3">
                            Mental Health Analysis
                          </div>

                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[#0C5BD511] border border-[#0C5BD533] flex items-center justify-center flex-shrink-0">
                              <LabReportIcon className="w-5 h-5 text-[#0C5BD5]" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-lg text-gray-900 leading-tight truncate">{getReportDisplayName(report)}</p>
                              <p className="text-sm text-gray-600">Date: {new Date(report.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <p className="text-sm text-gray-700 leading-relaxed mt-2 line-clamp-2 max-w-3xl">
                            {report.summary || "No summary available for this report."}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {previewMarkers.length > 0 ? (
                              <>
                                {previewMarkers.map((marker) => (
                                  <span
                                    key={`${report.id}-${marker.name}`}
                                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusClassMap[marker.status] || statusClassMap["not-found"]}`}
                                  >
                                    {marker.name}
                                  </span>
                                ))}
                                {visibleMarkers.length > 4 && (
                                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                                    +{visibleMarkers.length - 4} more
                                  </span>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-gray-600">No biomarkers were detected in this report</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 xl:min-w-[26px]">
                          <div className="grid grid-cols-1 gap-2.5">
                            <div className="rounded-xl border border-[#BCD0F5] bg-white p-5 text-right">
                              <p className="text-[11px] font-semibold text-gray-600">Health Score</p>
                              <p className="text-2xl font-bold text-gray-900 leading-tight">{report.overallScore || 0}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleShare(report);
                              }}
                              className={iconButtonClass}
                              title="Share report"
                              aria-label="Share report"
                            >
                              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDownload(report);
                              }}
                              className={iconButtonClass}
                              title="Download report"
                              aria-label="Download report"
                            >
                              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          {/* Latest Markers Table */}
          {latestReport && (
            <div className="mb-8 bg-white rounded-lg border border-[#DCE8FF] overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-[#DCE8FF] bg-[#F7FAFF]">
                <h3 className="text-sm font-semibold text-gray-800">Latest Biomarkers</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F7FAFF] border-b border-[#DCE8FF]">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Biomarker</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Value</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getVisibleReportMarkers(latestReport).map((marker, idx) => (
                      <tr key={marker.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FBFF]'}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{marker.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{marker.value ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-medium px-2 py-1 rounded ${statusClassMap[marker.status] || statusClassMap["not-found"]}`}>
                            {marker.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{marker.explanation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-gradient-to-r from-[#EEF3FF] to-[#F0F5FF] border border-[#D9E4FF] rounded-lg p-4 text-sm text-gray-700">
            <p className="font-medium text-gray-900">ⓘ Medical Disclaimer</p>
            <p className="mt-1 text-xs">This analysis is not a medical diagnosis. Please consult a healthcare professional.</p>
          </div>
          </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportAnalysisPage;
