import React, { useEffect } from "react";

type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  /** Controls visibility of the dialog */
  isOpen: boolean;
  /** Bold dialog heading */
  title: string;
  /** Explanatory body text */
  message: string;
  /** Label for the confirm (primary) button — default: "Confirm" */
  confirmText?: string;
  /** Label for the cancel button — default: "Cancel" */
  cancelText?: string;
  /**
   * Visual variant driving confirm-button colour:
   * - "danger"  → red   (destructive actions like delete)
   * - "warning" → amber (caution actions like discard)
   * - "info"    → blue  (neutral confirmations)
   */
  variant?: ConfirmVariant;
  /** Called when user clicks the confirm button */
  onConfirm: () => void;
  /** Called when user clicks cancel OR the backdrop */
  onCancel: () => void;
}

/* ─── per-variant button colours ──────────────────────────────────────────── */
const CONFIRM_BTN: Record<ConfirmVariant, string> = {
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  warning:
    "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400",
  info: "bg-[#0C5BD5] text-white hover:bg-[#0A4AB0] focus:ring-[#0C5BD5]",
};

const ICON_MAP: Record<
  ConfirmVariant,
  { bg: string; icon: string; color: string }
> = {
  danger: {
    bg: "bg-red-100",
    color: "text-red-600",
    // Trash icon
    icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  },
  warning: {
    bg: "bg-amber-100",
    color: "text-amber-600",
    // Warning triangle
    icon: "M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z",
  },
  info: {
    bg: "bg-blue-100",
    color: "text-[#0C5BD5]",
    // Info circle
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

/**
 * ConfirmDialog
 *
 * An accessible in-app confirmation modal that replaces native window.confirm().
 * Closes on Escape key press and backdrop click.
 *
 * @example
 * <ConfirmDialog
 *   isOpen={showDeleteDialog}
 *   title="Delete this reminder?"
 *   message="This will permanently remove the reminder. This action cannot be undone."
 *   confirmText="Delete"
 *   variant="danger"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDeleteDialog(false)}
 * />
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  onConfirm,
  onCancel,
}) => {
  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  /* Prevent body scroll while open */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const iconConfig = ICON_MAP[variant];
  const confirmBtnClass = CONFIRM_BTN[variant];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      {/* Semi-transparent overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-5">
        {/* Icon + heading row */}
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${iconConfig.bg}`}
          >
            <svg
              className={`w-6 h-6 ${iconConfig.color}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={iconConfig.icon}
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-gray-900 leading-snug"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-message"
              className="text-sm text-gray-500 mt-1 leading-relaxed"
            >
              {message}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmBtnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
