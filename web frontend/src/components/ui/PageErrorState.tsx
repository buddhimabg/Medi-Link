import React from "react";

interface PageErrorStateProps {
  /** Short heading, e.g. "Something went wrong" */
  title?: string;
  /** User-friendly error message (required) */
  message: string;
  /** Called when the user clicks the retry button */
  onRetry?: () => void;
  /** Label for the retry button (default: "Try again") */
  retryText?: string;
}

/**
 * PageErrorState
 *
 * A reusable page-level error state with a warning icon, friendly message and
 * an optional retry button. Matches the MediLink red-danger colour palette.
 *
 * Place this *inside* the page's <main> element so the Sidebar is always
 * preserved — the caller is responsible for rendering <Sidebar>.
 *
 * @example
 * if (error) return (
 *   <div className="flex min-h-screen bg-gray-50">
 *     <Sidebar ... />
 *     <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
 *       <PageErrorState
 *         message="We couldn't load your reports. Please try again."
 *         onRetry={loadHistory}
 *       />
 *     </main>
 *   </div>
 * );
 */
const PageErrorState: React.FC<PageErrorStateProps> = ({
  title = "Something went wrong",
  message,
  onRetry,
  retryText = "Try again",
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 w-full min-h-[60vh] px-6"
      role="alert"
    >
      {/* Icon container */}
      <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
        {/* Warning triangle icon — no external lib needed */}
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z"
          />
        </svg>
      </div>

      {/* Text */}
      <div className="text-center max-w-sm">
        <p className="text-base font-semibold text-gray-800">{title}</p>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{message}</p>
      </div>

      {/* Retry button */}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0C5BD5] text-white text-sm font-medium hover:bg-[#0A4AB0] transition-colors duration-200 shadow-sm"
        >
          {/* Refresh icon */}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {retryText}
        </button>
      )}
    </div>
  );
};

export default PageErrorState;
