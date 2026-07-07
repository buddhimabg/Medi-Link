import React from "react";

interface EmptyStateProps {
  /** Bold heading, e.g. "No reminders yet" */
  title: string;
  /** Optional explanatory text below the heading */
  description?: string;
  /**
   * Custom icon to render at the top of the empty state.
   * Pass any ReactNode (an SVG, emoji span, etc.).
   * If omitted, a default folder/inbox icon is shown.
   */
  icon?: React.ReactNode;
  /** Label for the optional call-to-action button */
  actionLabel?: string;
  /** Called when the CTA button is clicked */
  onAction?: () => void;
}

/* Default icon — an inbox/tray shape with an arrow pointing into it */
const DefaultIcon: React.FC = () => (
  <svg
    className="w-10 h-10 text-gray-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
    />
  </svg>
);

/**
 * EmptyState
 *
 * A reusable empty-state block with an icon, heading, description, and an
 * optional call-to-action button. Designed to replace plain-text empty states.
 *
 * @example
 * // With custom icon and CTA
 * <EmptyState
 *   icon={<LabReportIcon className="w-10 h-10 text-gray-400" />}
 *   title="No reports yet"
 *   description="Upload a PDF or image of your lab report to get started."
 *   actionLabel="Upload Report"
 *   onAction={() => fileInputRef.current?.click()}
 * />
 *
 * // Minimal usage
 * <EmptyState title="No activities match this filter yet." />
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      {/* Icon wrapper */}
      <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
        {icon ?? <DefaultIcon />}
      </div>

      {/* Text */}
      <div>
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>

      {/* Optional CTA */}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 px-5 py-2 rounded-lg bg-[#0C5BD5] text-white text-sm font-medium hover:bg-[#0A4AB0] transition-colors duration-200 shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
