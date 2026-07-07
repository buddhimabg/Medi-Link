export type ReportMarker = {
  name?: string;
  value?: string | number | null;
  unit?: string | null;
  status?: string | null;
  score?: number | null;
  confidence?: string | number | null;
  reviewNote?: string | null;
  explanation?: string | null;
  weight?: number | null;
  recommendations?: any;
  normalMin?: number | null;
  normalMax?: number | null;
  normalRange?: string | null;
  [key: string]: any;
};

export type ReportData = {
  originalFileName?: string | null;
  createdAt?: string | number | Date | null;
  markers?: ReportMarker[] | null;
  reportBiomarkers?: string[] | null;
  overallScore?: number | null;
  summary?: string | null;
  dataQuality?: any;
  analysisCoverage?: any;
  keyIssues?: any[];
  recommendations?: any;
  confidence?: number | null;
  unmatchedMarkers?: ReportMarker[] | null;
  [key: string]: any;
};

const toTitleCase = (value = ""): string => {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const stripExtension = (fileName = ""): string => {
  return fileName.replace(/\.[^/.]+$/, "");
};

export const getReportDisplayName = (report?: ReportData | null): string => {
  const originalFileName = report?.originalFileName || "";
  if (originalFileName) {
    const cleanName = stripExtension(originalFileName).replace(/[_-]+/g, " ").trim();
    if (cleanName) {
      return toTitleCase(cleanName);
    }
  }

  const createdAt = report?.createdAt ? new Date(report.createdAt) : null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    return `Lab Analysis ${createdAt.toLocaleDateString()}`;
  }

  return "Lab Analysis";
};

export const getVisibleReportMarkers = (report?: ReportData | null): ReportMarker[] => {
  const markers = Array.isArray(report?.markers) ? report.markers : [];
  const reportBiomarkers = Array.isArray(report?.reportBiomarkers) ? report.reportBiomarkers : [];

  if (reportBiomarkers.length > 0) {
    // Only show DB-matched markers in the main biomarker results section
    return markers.filter(
      (marker) => !!marker?.name && reportBiomarkers.includes(marker.name)
    );
  }

  // Legacy reports: exclude obvious not-configured entries
  return markers.filter(
    (m) =>
      !!m?.name &&
      m.status !== "not-found" &&
      m.reviewNote !== "This biomarker is not yet configured in the database."
  );
};

/**
 * Returns markers that were extracted from the report but are NOT in the DB.
 * These are shown in a separate "Unmatched tests" section on the UI.
 */
export const getUnmatchedReportMarkers = (report?: ReportData | null): ReportMarker[] => {
  const markers = Array.isArray(report?.markers) ? report.markers : [];
  const reportBiomarkers = Array.isArray(report?.reportBiomarkers) ? report.reportBiomarkers : [];

  if (reportBiomarkers.length > 0) {
    return markers.filter(
      (m) =>
        !!m?.name &&
        !reportBiomarkers.includes(m.name) &&
        m.status === "not-found"
    );
  }

  return markers.filter(
    (m) =>
      m?.status === "not-found" &&
      m.reviewNote === "This biomarker is not yet configured in the database."
  );
};

const buildReportText = (report?: ReportData | null): string => {
  const title = getReportDisplayName(report);
  const date = report?.createdAt ? new Date(report.createdAt).toLocaleString() : "Unknown";
  const score = report?.overallScore ?? 0;
  const summary = report?.summary || "No summary available.";
  const filteredMarkers = getVisibleReportMarkers(report);
  const markerRows = filteredMarkers.length
    ? filteredMarkers
        .map((marker) => {
          const valueText = marker?.value !== null && marker?.value !== undefined ? marker.value : "N/A";
          const unitText = marker?.unit ? ` ${marker.unit}` : "";
          const statusText = marker?.status || "not-found";
          return `- ${marker?.name || "Unknown"}: ${valueText}${unitText} (${statusText})`;
        })
        .join("\n")
    : "- No biomarkers were detected";

  return [
    title,
    "",
    `Date: ${date}`,
    `Overall Score: ${score}`,
    "",
    "Summary:",
    summary,
    "",
    "Biomarkers:",
    markerRows,
  ].join("\n");
};

export const downloadReportAsText = (report?: ReportData | null): void => {
  const textContent = buildReportText(report);
  const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const fileNameBase = getReportDisplayName(report).replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "lab-analysis";

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileNameBase}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const shareReport = async (
  report?: ReportData | null,
  reportUrl?: string,
): Promise<"shared" | "copied" | "unsupported"> => {
  const shareTitle = getReportDisplayName(report);
  const shareText = report?.summary || "Lab report analysis";

  if (navigator.share) {
    await navigator.share({
      title: shareTitle,
      text: shareText,
      url: reportUrl,
    });
    return "shared";
  }

  if (navigator.clipboard && reportUrl) {
    await navigator.clipboard.writeText(reportUrl);
    return "copied";
  }

  return "unsupported";
};
