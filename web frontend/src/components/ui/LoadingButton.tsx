import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger";
type ButtonType = "button" | "submit" | "reset";

interface LoadingButtonProps {
  /** Whether to show the loading spinner and disable the button */
  isLoading: boolean;
  /** Text to show while loading (replaces children) */
  loadingText?: string;
  /** Button content when not loading */
  children: React.ReactNode;
  /** Disables the button regardless of loading state */
  disabled?: boolean;
  /**
   * Visual style variant:
   * - "primary"   → solid MediLink blue (default)
   * - "secondary" → white with grey border
   * - "danger"    → solid red (for destructive actions)
   */
  variant?: ButtonVariant;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** HTML button type attribute — default: "button" */
  type?: ButtonType;
  /** Extra Tailwind class names to apply to the button */
  className?: string;
}

/* ─── per-variant class strings ──────────────────────────────────────────── */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#0C5BD5] text-white hover:bg-[#0A4AB0] disabled:bg-[#0C5BD5]/60 focus:ring-[#0C5BD5]",
  secondary:
    "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-[#0C5BD5] hover:text-[#0C5BD5] disabled:opacity-60 focus:ring-gray-300",
  danger:
    "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 focus:ring-red-500",
};

/**
 * LoadingButton
 *
 * A reusable button with a built-in loading spinner. When `isLoading` is true:
 * - The button is automatically disabled
 * - A small spinner is shown on the left
 * - `loadingText` replaces the children (if provided)
 *
 * @example
 * <LoadingButton
 *   isLoading={uploading}
 *   loadingText="Uploading…"
 *   onClick={handleUpload}
 * >
 *   Upload Report
 * </LoadingButton>
 *
 * <LoadingButton
 *   isLoading={deleting}
 *   loadingText="Deleting…"
 *   variant="danger"
 *   onClick={handleDelete}
 * >
 *   Delete
 * </LoadingButton>
 */
const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  loadingText,
  children,
  disabled = false,
  variant = "primary",
  onClick,
  type = "button",
  className = "",
}) => {
  const isDisabled = isLoading || disabled;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center gap-2",
        "px-5 py-2 rounded-lg text-sm font-semibold",
        "transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Spinner — only visible while loading */}
      {isLoading && (
        <svg
          className="w-4 h-4 animate-spin flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}

      {/* Label */}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </button>
  );
};

export default LoadingButton;
