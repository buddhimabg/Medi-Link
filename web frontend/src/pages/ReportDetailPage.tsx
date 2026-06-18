import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { fetchReportById } from "../api/reportApi";
import LabReportIcon from "../assets/LabReportIcon";
// HealthScoreIcon unused after layout simplification
import {
  downloadReportAsText,
  getReportDisplayName,
  getVisibleReportMarkers,
  shareReport,
} from "../utils/reportPresentation";
import "./ReportDetailPage.css";

type ReportData = Record<string, any>;

const statusPillClass: Record<string, string> = {
  normal: "bg-[#ECFDF3] text-[#15803D] border-[#86EFAC]",
  low: "bg-[#FEFCE8] text-[#A16207] border-[#FDE68A]",
  high: "bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]",
  "not-found": "bg-[#F8FAFC] text-[#475569] border-[#CBD5E1]",
};

const statusLabel: Record<string, string> = {
  normal: "Normal",
  low: "Low",
  high: "High",
  "not-found": "Not Found",
};

const getNormalRangeText = (marker: any) => {
  const normalRange = marker.normalRange || marker.referenceRange || marker.range;
  if (typeof normalRange === "string" && normalRange.trim()) {
    return normalRange.trim();
  }

  const min = marker.normalMin ?? marker.ranges?.normalMin;
  const max = marker.normalMax ?? marker.ranges?.normalMax;
  if (min !== undefined && max !== undefined) {
    const unit = marker.unit ? ` ${marker.unit}` : "";
    return `${min} - ${max}${unit}`;
  }

  return "Unavailable";
};

const getRangeStatusText = (marker: any) => {
  const normalRange = getNormalRangeText(marker);
  const value = marker.value ?? marker.observedValue ?? marker.actualValue;
  const numericValue = Number(value);
  const min = marker.normalMin ?? marker.ranges?.normalMin;
  const max = marker.normalMax ?? marker.ranges?.normalMax;

  if (typeof min === "number" && !Number.isNaN(numericValue) && numericValue < min) {
    return "Below range";
  }
  if (typeof max === "number" && !Number.isNaN(numericValue) && numericValue > max) {
    return "Above range";
  }
  if (normalRange !== "Unavailable") {
    return "Within range";
  }
  return "Range unavailable";
};

// score band helper removed (not used in simplified layout)

// legacy summary function removed in favor of StatsCard UI

// removed getBiomarkerCounts helper; stats cards moved

const ReportDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [actionMessage, setActionMessage] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchReportById(reportId as string);
        setReport(response?.report || null);
      } catch (err: any) {
        setError(err.message || "Failed to load report details");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [reportId]);

  const handleShare = async () => {
    if (!report) return;
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

  const handleDownload = () => {
    if (!report) return;
    downloadReportAsText(report);
    setActionMessage("Report downloaded.");
  };

  const THEME_BLUE = "#0C5BD5";
  const THEME_BLUE_LIGHT = "rgba(12, 91, 213, 0.14)";
  const actionButtonClass =
    "px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-[#0C5BD5] hover:bg-[#F8FBFF] transition text-sm font-medium text-gray-700 flex items-center gap-2 shadow-sm hover:shadow-md";

  if (loading) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Report Analysis" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} flex items-center justify-center`}>
          <div className="text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#0C5BD5]"></div>
              <p className="text-gray-600 mt-4">Loading report details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Report Analysis" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} flex items-center justify-center p-8`}>
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
            </div>
            <p className="text-red-600 font-semibold text-lg">{error || "Report not found"}</p>
            <button
              onClick={() => navigate("/reports")}
              className="mt-6 px-6 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-900 font-medium transition"
            >
              Back to Reports
            </button>
          </div>
        </main>
      </div>
    );
  }

  const visibleMarkers = getVisibleReportMarkers(report);
  const scorePercent = Math.min(100, Math.round(Number(report.overallScore || 0)));

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Report Analysis" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="max-w-6xl mx-auto space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-[#0C5BD5]/20 bg-[#EFF6FF]">
                    <LabReportIcon className="w-7 h-7" style={{ color: THEME_BLUE }} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">{getReportDisplayName(report)}</h1>
                    <p className="text-gray-500 mt-1">Last Updated: {new Date(report.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <p className="max-w-2xl text-sm md:text-base text-gray-600 leading-relaxed">
                  A clear breakdown of the biomarkers in this report with the same simple card style used across the other pages.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="inline-flex px-4 py-2 rounded-full text-xs font-bold border border-[#0C5BD5]/20 bg-[#EFF6FF] text-[#0A4AB0]">Report Overview</span>
                  <span className="inline-flex px-4 py-2 rounded-full text-xs font-bold border border-gray-200 bg-white text-gray-600">Updated {new Date(report.createdAt).toLocaleDateString()}</span>
                  <span className="inline-flex px-4 py-2 rounded-full text-xs font-bold border border-blue-100 bg-blue-50 text-blue-700">Health Score: {scorePercent}%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={handleShare}
                  className={`${actionButtonClass} hover:-translate-y-0.5`}
                  title="Share report"
                  aria-label="Share report"
                >
                  <svg className="w-4 h-4 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className={`${actionButtonClass} hover:-translate-y-0.5`}
                  title="Download report"
                  aria-label="Download report"
                >
                  <svg className="w-4 h-4 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </div>

            <section className="mt-6 bg-[#EFF6FF] rounded-2xl p-5 border border-[#0C5BD533]">
              <div className="flex flex-wrap gap-3 mb-5">
                <span className="inline-flex px-4 py-2 rounded-full text-xs font-bold border border-[#0C5BD5]/20 bg-white text-[#0A4AB0]">Report</span>
                <span className="inline-flex px-4 py-2 rounded-full text-xs font-bold border border-gray-200 bg-white text-gray-600">Last Updated: {new Date(report.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="report-summary-card">
                <p className="text-xs uppercase tracking-wider text-[#0A4AB0] font-bold">Report Summary</p>
                <p className="text-base font-semibold text-gray-800 mt-2">{report.summary || "No summary available for this report."}</p>
              </div>
            </section>
          </section>

          {actionMessage ? (
            <div className="mb-8 bg-[#0C5BD5]/10 border border-[#0C5BD5]/30 rounded-lg p-4 flex items-center gap-3 text-sm text-[#0C5BD5] font-medium">
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10A8 8 0 11.001 10 8 8 0 0118 10zM9 7a1 1 0 112 0v3a1 1 0 11-2 0V7zm1 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
              <span>{actionMessage}</span>
            </div>
          ) : null}

          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-10 h-10 rounded-xl border border-white/80 shadow-sm  flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="4" y="13" width="3" height="7" rx="1.2" fill="#60A5FA" />
                  <rect x="9" y="9" width="3" height="11" rx="1.2" fill="#34D399" />
                  <rect x="14" y="11" width="3" height="9" rx="1.2" fill="#F59E0B" />
                  <rect x="19" y="7" width="1" height="13" rx="0.5" fill="#F472B6" />
                  <path d="M4 8.5C6.5 7 8.5 7.2 10.5 8.2C12.4 9.1 13.6 11.5 15.5 12.1C17.2 12.6 19 11.8 20 10.4" stroke="#0C5BD5" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="10.5" cy="8.2" r="1.05" fill="#0C5BD5" />
                  <circle cx="15.5" cy="12.1" r="1.05" fill="#22C55E" />
                  <circle cx="20" cy="10.4" r="1.05" fill="#F59E0B" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Biomarker Results</h2>
            </div>

            <div className="space-y-4">
              {visibleMarkers.length > 0 ? (
                visibleMarkers.map((marker: any, index: number) => {
                  const pillClass = statusPillClass[marker.status] || statusPillClass["not-found"];
                  const markerValue = marker.value ?? marker.observedValue ?? marker.actualValue ?? "—";
                  const markerUnit = marker.unit ? ` ${marker.unit}` : "";

                  return (
                    <article
                      key={`${marker.name || marker.id || index}`}
                      className="report-marker-card group rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-[#0C5BD5]/35 hover:shadow-md"
                    >
                      <div className="p-5 md:p-6">
                        <div className="flex items-start gap-3">
                          <div className="report-marker-icon">
                            <svg className="w-5 h-5 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 5h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 leading-tight">{marker.name || "Unknown Biomarker"}</h3>
                                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500 font-semibold">Biomarker</p>
                              </div>

                              <span className={`report-status-pill inline-flex w-fit items-center px-3 py-1 rounded-full text-xs font-semibold border ${pillClass}`}>
                                {statusLabel[marker.status] || statusLabel["not-found"]}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr] md:items-start">
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Reference Range</p>
                                <p className="mt-1 text-sm md:text-base text-gray-800 font-semibold leading-relaxed">{getNormalRangeText(marker)}</p>
                              </div>

                              <div className="md:text-right">
                                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Current Value</p>
                                <div className="mt-1 flex flex-wrap md:justify-end items-baseline gap-2">
                                  <p className="text-xl md:text-2xl font-bold text-[#0C5BD5] leading-none tracking-tight">
                                    {markerValue}
                                    <span className="text-sm ml-1.5 text-[#0C5BD5]/85 font-semibold">{markerUnit}</span>
                                  </p>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border border-[#BFDBFE] bg-[#F8FBFF] text-[#0A4AB0]">
                                    {getRangeStatusText(marker)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-gray-100 bg-[#FAFCFF] p-3">
                              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Explanation</p>
                              <p className="text-sm text-gray-600 leading-relaxed">{marker.explanation}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-500">
                  No biomarkers were detected in this report.
                </div>
              )}
            </div>
          </section>

          <section className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="report-recommendation-panel relative overflow-hidden bg-white rounded-2xl p-6 border border-[#0C5BD5]/15 shadow-sm">
              <div className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-linear-to-b from-[#0C5BD5] to-[#5FA0FF]"></div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: THEME_BLUE_LIGHT }}>
                  <svg className="w-4 h-4" style={{ color: THEME_BLUE }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.96a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.446a1 1 0 00-.364 1.118l1.286 3.96c.3.921-.755 1.688-1.54 1.118l-3.368-2.446a1 1 0 00-1.176 0l-3.368 2.446c-.784.57-1.838-.197-1.539-1.118l1.286-3.96a1 1 0 00-.364-1.118L2.08 9.387c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.96z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900">Care Recommendations</h3>
              </div>
              <div className="space-y-3">
                {report.recommendations?.immediate?.length ? (
                  report.recommendations.immediate.map((item: string, index: number) => (
                    <li key={`ia-${index}`} className="rounded-lg border border-[#0C5BD5]/20 bg-[#F8FBFF] p-3 flex items-start gap-3 list-none">
                      <span className="text-[#0C5BD5] font-bold text-lg shrink-0 leading-none">✓</span>
                      <span className="text-sm text-gray-700 font-medium">{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500 italic py-4 text-center list-none">No immediate actions needed</li>
                )}
              </div>
            </div>

            <div className="report-recommendation-panel relative overflow-hidden bg-white rounded-2xl p-6 border border-[#0C5BD5]/15 shadow-sm">
              <div className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-linear-to-b from-[#0C5BD5] to-[#5FA0FF]"></div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: THEME_BLUE_LIGHT }}>
                  <svg className="w-4 h-4" style={{ color: THEME_BLUE }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900">Daily Practices</h3>
              </div>
              <div className="space-y-3">
                {report.recommendations?.daily?.length ? (
                  report.recommendations.daily.map((item: string, index: number) => (
                    <li key={`dp-${index}`} className="rounded-lg border border-[#0C5BD5]/20 bg-[#F8FBFF] p-3 flex items-start gap-3 list-none">
                      <span className="text-[#0C5BD5] font-bold shrink-0 leading-none">→</span>
                      <span className="text-sm text-gray-700 font-medium">{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500 italic py-4 text-center list-none">Maintain current practices</li>
                )}
              </div>
            </div>
          </section>

          <section className="mt-8 bg-linear-to-r from-[#FFFBEB] to-white border border-[#FDE68A] rounded-2xl p-5 text-sm shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.257 3.099c.763-1.36 2.723-1.36 3.486 0l6.518 11.604C19.016 16.02 18.054 18 16.518 18H3.482c-1.536 0-2.498-1.98-1.743-3.297L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-6a1 1 0 00-.993.883L9 9v3a1 1 0 001.993.117L11 12V9a1 1 0 00-1-1z" />
              </svg>
              <div>
                <p className="font-bold text-[#92400E]">Medical Disclaimer</p>
                <p className="mt-2 text-[#78350F]">This analysis is not a medical diagnosis. Please consult a healthcare professional for medical advice or diagnosis. Always seek professional medical advice for health concerns.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ReportDetailPage;