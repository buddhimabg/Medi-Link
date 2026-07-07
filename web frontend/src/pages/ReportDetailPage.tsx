import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { fetchReportById } from "../api/reportApi";
import LabReportIcon from "../assets/LabReportIcon";
import HealthScoreIcon from "../assets/HealthScoreIcon";
import {
  downloadReportAsText,
  getReportDisplayName,
  getVisibleReportMarkers,
  getUnmatchedReportMarkers,
  shareReport,
} from "../utils/reportPresentation";
import { PageLoadingSpinner, PageErrorState, InlineAlert, EmptyState } from "../components/ui";
import { getErrorMessage } from "../utils/errorHandler";
import "./ReportDetailPage.css";
import reportIllustration from "../assets/report_summary_illustration.png";

type ReportData = Record<string, any>;

/* ─── helpers ─────────────────────────────────────────────── */
const statusColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  normal:    { bg: "bg-[#ECFDF3]", text: "text-[#15803D]", border: "border-[#86EFAC]", dot: "bg-green-500" },
  low:       { bg: "bg-[#FEFCE8]", text: "text-[#A16207]", border: "border-[#FDE68A]", dot: "bg-amber-500" },
  high:      { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", border: "border-[#FCA5A5]", dot: "bg-rose-500" },
  "not-found": { bg: "bg-[#F8FAFC]", text: "text-[#475569]", border: "border-[#CBD5E1]", dot: "bg-gray-400" },
};
const statusLabel: Record<string, string> = {
  normal: "Normal", low: "Low", high: "High", "not-found": "Not Found",
};

const getNormalRangeText = (marker: any) => {
  const r = marker.normalRange || marker.referenceRange || marker.range;
  if (typeof r === "string" && r.trim()) return r.trim();
  const min = marker.normalMin ?? marker.ranges?.normalMin;
  const max = marker.normalMax ?? marker.ranges?.normalMax;
  if (min !== undefined && max !== undefined) return `${min} – ${max}`;
  return "Unavailable";
};

const getRangeIndicator = (marker: any) => {
  const value = Number(marker.value ?? marker.observedValue ?? marker.actualValue);
  const min   = Number(marker.normalMin ?? marker.ranges?.normalMin);
  const max   = Number(marker.normalMax ?? marker.ranges?.normalMax);
  if (isNaN(value) || isNaN(min) || isNaN(max) || min === max) return null;

  const delta      = (max - min) * 0.5;
  const scaleStart = min - delta;
  const scaleEnd   = max + delta;
  const scaleRange = scaleEnd - scaleStart;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - scaleStart) / scaleRange) * 100));

  return { valPct: pct(value), minPct: pct(min), maxPct: pct(max) };
};


/* ════════════════════════════════════════════════════════════ */
const ReportDetailPage: React.FC = () => {
  const navigate   = useNavigate();
  const { reportId } = useParams();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [report,    setReport]    = useState<ReportData | null>(null);
  const [loading,   setLoading]   = useState<boolean>(true);
  const [error,     setError]     = useState<string>("");
  const [actionMsg, setActionMsg] = useState<string>("");
  const [expandedMarkers, setExpandedMarkers] = useState<Set<number>>(new Set());
  const [showAllRecs, setShowAllRecs] = useState<boolean>(false);
  const [showAllDaily, setShowAllDaily] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError("");
        const res = await fetchReportById(reportId as string);
        setReport(res?.report || null);
      } catch (err: any) {
        setError(getErrorMessage(err, "Failed to load report details"));
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  const toggleMarker = (i: number) =>
    setExpandedMarkers(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const handleShare = async () => {
    if (!report) return;
    try {
      const url    = `${window.location.origin}/reports/${report.id}`;
      const result = await shareReport(report, url);
      if (result === "copied")      setActionMsg("Report link copied to clipboard.");
      if (result === "unsupported") setActionMsg("Sharing is not supported on this device.");
    } catch (e: any) {
      if (e?.name !== "AbortError") setActionMsg("Unable to share right now.");
    }
  };

  const handleDownload = () => {
    if (!report) return;
    downloadReportAsText(report);
    setActionMsg("Report downloaded.");
  };

  /* ── loading / error states ───────────────────────────────── */
  const shell = (children: React.ReactNode) => (
    <div className="flex report-shell min-h-screen">
      <Sidebar activePage="Report Analysis" collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8 flex items-center justify-center`}>
        {children}
      </main>
    </div>
  );

  if (loading) return shell(
    <div className="py-12 w-full">
      <PageLoadingSpinner message="Loading report details…" fullHeight={false} />
    </div>
  );

  if (error || !report) return shell(
    <div className="w-full h-full">
      <PageErrorState 
        message={error || "Report not found"} 
        onRetry={() => navigate("/reports")} 
        retryText="Back to Reports" 
      />
    </div>
  );

  /* ── derived values ─────────────────────────────────────── */
  const visibleMarkers  = getVisibleReportMarkers(report);
  const unmatchedMarkers = getUnmatchedReportMarkers(report);
  const score           = Math.min(100, Math.round(Number(report.overallScore || 0)));
  const needAttention   = visibleMarkers.filter((m: any) => m.status === "low" || m.status === "high").length;
  const scoreLabel      = score >= 80 ? "Good" : score >= 60 ? "Fair" : "Needs Attention";
  const scoreLabelColor = score >= 80 ? "text-green-500" : score >= 60 ? "text-amber-500" : "text-rose-500";
  const immediateActions = report.recommendations?.immediateActions || [];
  const dailyPractices   = report.recommendations?.dailyPractices   || [];

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="flex report-shell min-h-screen">
      <Sidebar activePage="Report Analysis" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ── Header ───────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#EFF6FF] border border-[#0C5BD5]/20 shrink-0">
                  <LabReportIcon className="w-6 h-6 text-[#0C5BD5]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{getReportDisplayName(report)}</h1>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Last updated: {new Date(report.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:border-[#0C5BD5] hover:bg-[#F8FBFF] text-sm font-medium text-gray-700 shadow-sm transition">
                  <svg className="w-4 h-4 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
                <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0C5BD5] text-white text-sm font-medium hover:bg-[#0A4AB0] shadow-sm transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </div>

            {actionMsg && (
              <div className="mt-4 animate-slide-in">
                <InlineAlert type="info" message={actionMsg} autoCloseMs={4000} onClose={() => setActionMsg("")} />
              </div>
            )}
          </div>

          {/* ── Stats Cards (StatsCard style) ──────────── */}
          <div className="grid sm:grid-cols-3 gap-5">
            {/* Health Score */}
            <div className="stats-card">
              <div className="stats-content">
                <div className="stats-icon-wrapper shrink-0" style={{ background: "rgba(12,91,213,0.14)" }}>
                  <div className="stats-icon-bg" />
                  <HealthScoreIcon className="stats-icon relative z-10 text-[#0C5BD5]" />
                </div>
                <div className="stats-text">
                  <p className="stats-title">Health Score</p>
                  <p className="stats-value text-[#0C5BD5]">{score} <span className="text-base font-semibold text-gray-400">/ 100</span></p>
                  <p className={`text-xs font-semibold mt-0.5 ${scoreLabelColor}`}>{scoreLabel}</p>
                </div>
              </div>
            </div>

            {/* Biomarkers Analyzed */}
            <div className="stats-card">
              <div className="stats-content">
                <div className="stats-icon-wrapper shrink-0" style={{ background: "rgba(16,185,129,0.14)" }}>
                  <div className="stats-icon-bg" />
                  <svg className="stats-icon relative z-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="stats-text">
                  <p className="stats-title">Biomarkers Analyzed</p>
                  <p className="stats-value text-gray-800">{visibleMarkers.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Matched with database</p>
                </div>
              </div>
            </div>

            {/* Need Attention */}
            <div className="stats-card">
              <div className="stats-content">
                <div className="stats-icon-wrapper shrink-0" style={{ background: "rgba(245,158,11,0.14)" }}>
                  <div className="stats-icon-bg" />
                  <svg className="stats-icon relative z-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
                  </svg>
                </div>
                <div className="stats-text">
                  <p className="stats-title">Need Attention</p>
                  <p className="stats-value text-gray-800">{needAttention}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Results out of normal range</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Report Summary ───────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-lg font-bold text-gray-800">Report Summary</h2>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {report.summary || "No summary available for this report."}
              </p>
            </div>
            <img
              src={reportIllustration}
              alt="Report illustration"
              className="w-36 h-36 object-contain shrink-0 opacity-90"
            />
          </div>

          {/* ── Biomarker Results Table ─────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#0C5BD5]" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="13" width="3" height="7" rx="1.2" fill="#60A5FA" />
                  <rect x="9" y="9" width="3" height="11" rx="1.2" fill="#34D399" />
                  <rect x="14" y="11" width="3" height="9" rx="1.2" fill="#F59E0B" />
                  <path d="M4 8.5C6.5 7 8.5 7.2 10.5 8.2C12.4 9.1 13.6 11.5 15.5 12.1C17.2 12.6 19 11.8 20 10.4" stroke="#0C5BD5" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <h2 className="text-lg font-bold text-gray-800">Biomarker Results</h2>
              </div>
              {/* Legend */}
              <div className="hidden md:flex items-center gap-4 text-xs text-gray-500 font-medium">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Normal</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Low</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />High</span>
              </div>
            </div>

            {visibleMarkers.length === 0 ? (
              <div className="p-8">
                <EmptyState title="No biomarkers found" description="No biomarkers were detected in this report." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F7FAFF] border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                      <th className="px-6 py-3 text-left">Biomarker</th>
                      <th className="px-4 py-3 text-left">Healthy Range</th>
                      <th className="px-4 py-3 text-left min-w-[160px]">Range</th>
                      <th className="px-4 py-3 text-right">Your Value</th>
                      <th className="px-6 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMarkers.map((marker: any, idx: number) => {
                      const sc        = statusColors[marker.status] || statusColors["not-found"];
                      const indicator = getRangeIndicator(marker);
                      const value     = marker.value ?? marker.observedValue ?? "—";
                      const unit      = marker.unit || "";
                      const isExpanded = expandedMarkers.has(idx);

                      return (
                        <React.Fragment key={`marker-${idx}`}>
                          <tr
                            className={`border-b border-gray-50 hover:bg-[#FAFCFF] transition cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-[#FAFBFF]"}`}
                            onClick={() => toggleMarker(idx)}
                          >
                            {/* Biomarker name */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`} />
                                <span className="font-semibold text-gray-800">{marker.name || "Unknown"}</span>
                              </div>
                            </td>

                            {/* Healthy range text */}
                            <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">
                              Normal: {getNormalRangeText(marker)} {unit && <span>{unit}</span>}
                            </td>

                            {/* Range slider */}
                            <td className="px-4 py-4 min-w-[160px]">
                              {indicator ? (
                                <div className="relative h-2 bg-gray-100 rounded-full w-full">
                                  <div
                                    className="absolute h-full bg-emerald-100 border-x border-emerald-300 rounded-sm"
                                    style={{ left: `${indicator.minPct}%`, width: `${indicator.maxPct - indicator.minPct}%` }}
                                  />
                                  <div
                                    className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 -ml-1.5 rounded-full border-2 border-white shadow ${sc.dot}`}
                                    style={{ left: `${indicator.valPct}%` }}
                                  />
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>

                            {/* Value */}
                            <td className="px-4 py-4 text-right">
                              <span className={`text-lg font-bold ${marker.status === "normal" ? "text-[#0C5BD5]" : marker.status === "low" ? "text-amber-600" : marker.status === "high" ? "text-rose-600" : "text-gray-500"}`}>
                                {value}
                              </span>
                              {unit && <span className="text-xs ml-1 text-gray-400">{unit}</span>}
                            </td>

                            {/* Status pill + expand arrow */}
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                                  {statusLabel[marker.status] || "—"}
                                </span>
                                <svg
                                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable explanation row */}
                          {isExpanded && (
                            <tr className="border-b border-gray-50">
                              <td colSpan={5} className="px-8 py-4 bg-[#F8FAFF]">
                                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">Explanation</p>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {marker.explanation || "No explanation available."}
                                </p>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Unmatched tests (if any) ─────────────── */}
          {unmatchedMarkers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
                <h2 className="text-base font-bold text-gray-800">Unmatched Extracted Tests</h2>
                <span className="ml-1 text-xs text-gray-500">— not yet in biomarker database</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {unmatchedMarkers.map((m: any, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 rounded-full text-xs font-semibold text-gray-700">
                    {m.name}
                    {m.value !== null && m.value !== undefined && (
                      <span className="text-amber-600">{m.value}{m.unit ? ` ${m.unit}` : ""}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Bottom: Recommendations ──────────────── */}
          <div className="grid md:grid-cols-2 gap-5 mb-5">

            {/* Care Recommendations */}
            <div className="report-recommendation-panel flex flex-col h-full relative overflow-hidden bg-[#F0FDF4] rounded-2xl p-6 border border-[#86EFAC] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0 text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-green-900">Care Recommendations</h3>
              </div>
              <ul className="space-y-2.5 mb-2">
                {immediateActions.length > 0 ? (
                  (showAllRecs ? immediateActions : immediateActions.slice(0, 3)).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-green-800">
                      <svg className="w-4 h-4 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-green-700 italic py-2">No immediate actions needed</li>
                )}
              </ul>
              {immediateActions.length > 3 && (
                <button
                  onClick={() => setShowAllRecs(!showAllRecs)}
                  className="mt-auto pt-4 text-sm font-semibold text-green-700 flex items-center gap-1 hover:text-green-800 transition"
                >
                  {showAllRecs ? "Show Less" : "View All Recommendations"} <span aria-hidden="true">&rarr;</span>
                </button>
              )}
            </div>

            {/* Daily Practices */}
            <div className="report-recommendation-panel flex flex-col h-full relative overflow-hidden bg-[#EFF6FF] rounded-2xl p-6 border border-[#BFDBFE] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shrink-0 text-white">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-blue-900">Daily Practices</h3>
              </div>
              <ul className="space-y-2.5 mb-2">
                {dailyPractices.length > 0 ? (
                  (showAllDaily ? dailyPractices : dailyPractices.slice(0, 3)).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-blue-800">
                      <span className="text-blue-600 font-bold shrink-0 leading-none mt-0.5">&rarr;</span>
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-blue-700 italic py-2">Maintain current practices</li>
                )}
              </ul>
              {dailyPractices.length > 3 && (
                <button
                  onClick={() => setShowAllDaily(!showAllDaily)}
                  className="mt-auto pt-4 text-sm font-semibold text-blue-700 flex items-center gap-1 hover:text-blue-800 transition"
                >
                  {showAllDaily ? "Show Less" : "View All Daily Practices"} <span aria-hidden="true">&rarr;</span>
                </button>
              )}
            </div>

          </div>

          {/* ── Medical Disclaimer (New Line) ──────────────── */}
          <div className="rounded-2xl p-6 border border-[#FDE68A] bg-[#FFFBEB] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-transparent flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-amber-700">Medical Disclaimer</h3>
            </div>
            <p className="text-sm text-amber-700 leading-relaxed font-medium">
              This analysis is not a medical diagnosis. Please consult a healthcare professional for medical advice or diagnosis. Always seek professional medical advice for health concerns.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ReportDetailPage;