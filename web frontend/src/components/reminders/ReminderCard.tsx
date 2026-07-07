import React from "react";
import ReminderStatusBadge, {
  ReminderDurationBadge,
  ReminderInstructionBadge,
} from "./ReminderStatusBadge";

export interface Reminder {
  _id: string;
  title: string;
  description?: string;
  instruction?: string;
  durationDays?: number;
  endDate?: string;
  isDuplicate?: boolean;
  duplicateMessage?: string;
  category: string;
  time: string;
  frequency: string;
  date?: string;
  daysOfWeek: number[];
  specificDates: string[];
  timezone?: string;
  customDates?: string[];
  disabledDates?: string[];
  disabledToday?: boolean;
  isDisabledToday?: boolean;
  status?: string;
  isActive?: boolean;
}

export interface ReminderCardProps {
  reminder: Reminder;
  isBusyAction: (reminderId: string, actionName: string) => boolean;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminder: Reminder) => void;
  onToggleToday: (reminder: Reminder, forceDisableToday?: boolean) => void;
}

export const formatLabel = (value?: string | number): string => {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const formatTime = (timeValue?: string): string => {
  if (!timeValue || typeof timeValue !== "string") {
    return "--:--";
  }

  const [hoursRaw, minutesRaw] = timeValue.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return timeValue;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  isBusyAction,
  onEdit,
  onDelete,
  onToggleToday,
}) => {
  const isToggleBusy = isBusyAction(reminder._id, "toggle");
  const isDeleteBusy = isBusyAction(reminder._id, "delete");
  const isEditBusy = isBusyAction(reminder._id, "edit");
  const isDisabledToday =
    Boolean(reminder.disabledToday) ||
    Boolean(reminder.isDisabledToday) ||
    reminder.status === "skipped";
  const isInactive = !reminder.isActive;
  const isScheduled = !isDisabledToday && !isInactive;
  const isRowBusy = isToggleBusy || isDeleteBusy || isEditBusy;

  const isToggleOn = !isDisabledToday;

  return (
    <article
      className={`stats-card transition-all ${isDisabledToday ? "opacity-85" : isInactive ? "opacity-90" : ""}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-base sm:text-lg leading-tight font-semibold tracking-[-0.01em] ${isDisabledToday ? "text-slate-500" : "text-gray-900"}`}
            >
              {reminder.title}
            </h3>
            <ReminderStatusBadge
              isDisabledToday={isDisabledToday}
              isInactive={isInactive}
            />
          </div>
          {reminder.description && (
            <p
              className={`mt-1 text-sm leading-snug ${isDisabledToday ? "text-slate-500" : "text-gray-600"}`}
            >
              {reminder.description}
            </p>
          )}
          {reminder.instruction && (
            <ReminderInstructionBadge instruction={reminder.instruction} />
          )}
          {reminder.durationDays !== undefined && reminder.durationDays > 0 && (
            <ReminderDurationBadge
              durationDays={reminder.durationDays}
              endDate={reminder.endDate}
            />
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2.5">
            <span
              className={`inline-flex items-center gap-2 font-semibold text-sm ${isDisabledToday ? "text-slate-500" : "text-[#0C5BD5]"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 7v5l3 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {formatTime(reminder.time)}
            </span>
            <span
              className={`text-sm ${isDisabledToday ? "text-slate-500" : "text-gray-700"}`}
            >
              {formatLabel(reminder.frequency)}
            </span>
            {isScheduled && (
              <button
                type="button"
                onClick={() => onToggleToday(reminder, true)}
                disabled={isRowBusy}
                className="inline-flex items-center rounded-md border border-[#C4D7FF] bg-[#EAF2FF] px-2.5 py-1 text-xs font-semibold text-[#12459A] hover:bg-[#dfeafd] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isToggleBusy ? "Saving..." : "Off Today"}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:self-start text-gray-500">
          <button
            type="button"
            onClick={() => onEdit(reminder)}
            disabled={isRowBusy}
            title="Edit reminder"
            className="p-1.5 rounded-md hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <path
                d="m4 20 4.4-.8L19 8.6 15.4 5 4.8 15.6 4 20Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="m13.8 6.6 3.6 3.6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onDelete(reminder)}
            disabled={isRowBusy}
            title="Delete reminder"
            className="p-1.5 rounded-md hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isDeleteBusy ? (
              <span className="text-sm text-gray-500">...</span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                <path
                  d="M4 7h16M9 7V4h6v3M8 10v7M12 10v7M16 10v7M6 7l1 13h10l1-13"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => onToggleToday(reminder)}
            disabled={isRowBusy}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${isToggleOn ? "bg-[#0C5BD5]" : "bg-gray-300"} disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
            aria-label="Toggle reminder off for today"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${isToggleOn ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>
      </div>
    </article>
  );
};

export default ReminderCard;
