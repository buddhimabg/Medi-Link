import React from "react";

interface PageLoadingSpinnerProps {
  /** Primary loading message shown below the spinner */
  message?: string;
  /** Optional secondary message shown below the primary message */
  subMessage?: string;
  /**
   * When true the spinner fills the remaining viewport height (default).
   * When false it renders as a compact centred block (useful inside panels).
   */
  fullHeight?: boolean;
}

/**
 * PageLoadingSpinner
 *
 * A reusable full-area loading state that matches the MediLink blue theme.
 * Place this *inside* the page's <main> element so the Sidebar is always
 * preserved — the caller is responsible for rendering <Sidebar>.
 *
 * @example
 * if (loading) return (
 *   <div className="flex min-h-screen bg-gray-50">
 *     <Sidebar ... />
 *     <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
 *       <PageLoadingSpinner message="Loading report details…" />
 *     </main>
 *   </div>
 * );
 */
const PageLoadingSpinner: React.FC<PageLoadingSpinnerProps> = ({
  message = "Loading…",
  subMessage,
  fullHeight = true,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 w-full ${
        fullHeight ? "min-h-[60vh]" : "py-16"
      }`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Spinner ring */}
      <div
        className="w-12 h-12 rounded-full border-4 border-[#DCE8FF] border-t-[#0C5BD5] animate-spin"
        aria-hidden="true"
      />

      {/* Primary message */}
      <p className="text-sm font-medium text-gray-600 text-center">{message}</p>

      {/* Optional sub-message */}
      {subMessage && (
        <p className="text-xs text-gray-400 text-center max-w-xs">{subMessage}</p>
      )}
    </div>
  );
};

export default PageLoadingSpinner;
