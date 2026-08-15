import React from "react";

export interface ReminderStatusBadgeProps {
  isDisabledToday?: boolean;
  isInactive?: boolean;
  className?: string;
}

const ReminderStatusBadge: React.FC<ReminderStatusBadgeProps> = ({
  isDisabledToday = false,
  isInactive = false,
  className = "",
}) => {
  const statusLabel = isDisabledToday ? "Off Today" : isInactive ? "Paused" : "Scheduled";
  const statusClass = isDisabledToday
    ? "bg-slate-100 border-slate-300 text-slate-600"
    : isInactive
      ? "bg-gray-100 border-gray-300 text-gray-600"
      : "bg-[#EAF2FF] border-[#C4D7FF] text-[#12459A]";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass} ${className}`.trim()}
    >
      {statusLabel}
    </span>
  );
};

export interface ReminderDurationBadgeProps {
  durationDays?: number;
  endDate?: string;
  className?: string;
}

export const ReminderDurationBadge: React.FC<ReminderDurationBadgeProps> = ({
  durationDays,
  endDate,
  className = "",
}) => {
  if (durationDays === undefined || durationDays <= 0) return null;

  return (
    <div
      className={`mt-2 ml-2 inline-flex items-center gap-1.5 rounded-lg bg-purple-50/80 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200/60 shadow-xs ${className}`.trim()}
    >
      <span>
        <strong>Duration:</strong> {durationDays} Days {endDate ? `(Ends ${endDate})` : ""}
      </span>
    </div>
  );
};

export interface ReminderInstructionBadgeProps {
  instruction?: string;
  className?: string;
}

export const ReminderInstructionBadge: React.FC<ReminderInstructionBadgeProps> = ({
  instruction,
  className = "",
}) => {
  if (!instruction) return null;

  return (
    <div
      className={`mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50/80 px-2.5 py-1 text-xs font-medium text-[#0C5BD5] border border-blue-200/60 shadow-xs ${className}`.trim()}
    >
      <svg className="w-3.5 h-3.5 text-[#0C5BD5] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>
        <strong>Instruction:</strong> {instruction}
      </span>
    </div>
  );
};

export interface ReminderDuplicateBadgeProps {
  isDuplicate?: boolean;
  duplicateMessage?: string;
  className?: string;
}

export const ReminderDuplicateBadge: React.FC<ReminderDuplicateBadgeProps> = ({
  isDuplicate,
  duplicateMessage,
  className = "",
}) => {
  if (!isDuplicate) return null;

  return (
    <div
      className={`sm:col-span-12 mb-1 p-3 rounded-xl bg-red-100/80 border border-red-300 text-red-900 text-xs flex items-center justify-between gap-2 ${className}`.trim()}
    >
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          <strong>{duplicateMessage || "Duplicate Detected:"}</strong> Re-uploading may create a duplicate. You can remove or adjust this before saving.
        </span>
      </div>
    </div>
  );
};

export default ReminderStatusBadge;
