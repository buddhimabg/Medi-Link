import React, { useEffect, useRef } from "react";

export type AlertType = "success" | "error" | "warning" | "info";

interface InlineAlertProps {
  /** Semantic type — drives colour and icon */
  type: AlertType;
  /** Main body message (required) */
  message: string;
  /** Optional bold title rendered above the message */
  title?: string;
  /** Called when the user clicks the ✕ close button */
  onClose?: () => void;
  /**
   * If provided, the alert automatically calls onClose after this many
   * milliseconds. Requires onClose to be provided to actually hide the alert.
   */
  autoCloseMs?: number;
}

/* ─── per-type visual config ─────────────────────────────────────────────── */
const VARIANTS: Record<
  AlertType,
  { bg: string; border: string; text: string; iconPath: string; iconColor: string }
> = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    iconColor: "text-green-500",
    // Checkmark circle
    iconPath:
      "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    iconColor: "text-red-500",
    // Warning triangle
    iconPath:
      "M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    iconColor: "text-amber-500",
    // Warning triangle (same shape, amber colour)
    iconPath:
      "M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z",
  },
  info: {
    bg: "bg-[#EEF4FF]",
    border: "border-[#CFE0FF]",
    text: "text-[#12459A]",
    iconColor: "text-[#0C5BD5]",
    // Info circle
    iconPath:
      "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

/**
 * InlineAlert
 *
 * A reusable inline banner for success, error, warning and info states.
 * Supports optional auto-dismissal via `autoCloseMs`.
 *
 * @example
 * // Success — auto-dismisses after 4 seconds
 * <InlineAlert
 *   type="success"
 *   message="Reminder created successfully."
 *   autoCloseMs={4000}
 *   onClose={() => setActionMessage("")}
 * />
 *
 * // Persistent error
 * <InlineAlert
 *   type="error"
 *   message="We couldn't load your reports. Please try again."
 *   onClose={() => setError("")}
 * />
 */
const InlineAlert: React.FC<InlineAlertProps> = ({
  type,
  message,
  title,
  onClose,
  autoCloseMs,
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const v = VARIANTS[type];

  /* Auto-close timer */
  useEffect(() => {
    if (autoCloseMs && onClose) {
      timerRef.current = setTimeout(onClose, autoCloseMs);
    }
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [autoCloseMs, onClose, message]); // re-arm timer if message changes

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${v.bg} ${v.border} ${v.text}`}
    >
      {/* Icon */}
      <svg
        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${v.iconColor}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={v.iconPath}
        />
      </svg>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p className="leading-relaxed">{message}</p>
      </div>

      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className={`ml-2 flex-shrink-0 rounded p-0.5 transition-colors hover:bg-black/10 ${v.iconColor}`}
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default InlineAlert;
