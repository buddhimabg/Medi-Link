import React from "react";
import { formatLabel } from "./ReminderCard";
import { categoryOptions } from "./CategoryIcon";

export interface ReminderForm {
  title: string;
  description: string;
  instruction: string;
  durationDays: number | string;
  category: string;
  time: string;
  frequency: string;
  date: string;
  daysOfWeek: number[];
  specificDates: string[];
}

export interface FrequencyOption {
  value: string;
  label: string;
}

export interface WeekDayOption {
  value: number;
  label: string;
}

export const frequencyOptions: FrequencyOption[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "specific", label: "Specific Dates" },
];

export const weekDayOptions: WeekDayOption[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export interface ReminderFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  form: ReminderForm;
  onFormChange: (field: keyof ReminderForm, value: any) => void;
  onFrequencyChange: (frequency: string) => void;
  onToggleWeeklyDay: (dayValue: number) => void;
  onAddSpecificDate: () => void;
  onUpdateSpecificDate: (index: number, value: string) => void;
  onRemoveSpecificDate: (index: number) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
  isBusy: boolean;
}

const ReminderFormModal: React.FC<ReminderFormModalProps> = ({
  isOpen,
  mode,
  form,
  onFormChange,
  onFrequencyChange,
  onToggleWeeklyDay,
  onAddSpecificDate,
  onUpdateSpecificDate,
  onRemoveSpecificDate,
  onSubmit,
  onClose,
  isBusy,
}) => {
  if (!isOpen) {
    return null;
  }

  const isCreate = mode === "create";
  const titleText = isCreate ? "Add Reminder" : "Edit Reminder";
  const descText = isCreate
    ? "Create a new reminder with a custom schedule."
    : "Update title, note, time, and schedule.";
  const submitText = isCreate
    ? isBusy
      ? "Creating..."
      : "Create"
    : isBusy
      ? "Saving..."
      : "Save";

  const titleId = isCreate ? "create-reminder-title" : "reminder-title";
  const descId = isCreate ? "create-reminder-description" : "reminder-description";
  const instId = isCreate ? "create-reminder-instruction" : "reminder-instruction";
  const durId = isCreate ? "create-reminder-duration" : "reminder-duration";
  const catId = isCreate ? "create-reminder-category" : "reminder-category";
  const timeId = isCreate ? "create-reminder-time" : "reminder-time";
  const freqId = isCreate ? "create-reminder-frequency" : "reminder-frequency";
  const onceDateId = isCreate ? "create-reminder-once-date" : "reminder-once-date";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-6 shadow-xl"
      >
        <h2 className="text-xl font-semibold text-gray-900">{titleText}</h2>
        <p className="text-sm text-gray-500 mt-1">{descText}</p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor={titleId} className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              id={titleId}
              value={form.title}
              onChange={(event) => onFormChange("title", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor={descId} className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id={descId}
              value={form.description}
              onChange={(event) => onFormChange("description", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div>
            <label htmlFor={instId} className="block text-sm font-medium text-gray-700">
              Instruction (e.g., Take after meals)
            </label>
            <input
              id={instId}
              type="text"
              value={form.instruction}
              onChange={(event) => onFormChange("instruction", event.target.value)}
              placeholder="e.g., Take 1 tablet after meals"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor={durId} className="block text-sm font-medium text-gray-700">
              Duration (Days, 0 = Continuous/Ongoing)
            </label>
            <input
              id={durId}
              type="number"
              min="0"
              max="365"
              value={form.durationDays}
              onChange={(event) => onFormChange("durationDays", event.target.value)}
              placeholder="0 (Ongoing)"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {isCreate && (
            <div>
              <label htmlFor={catId} className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id={catId}
                value={form.category}
                onChange={(event) => onFormChange("category", event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {formatLabel(category)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor={timeId} className="block text-sm font-medium text-gray-700">
              Time
            </label>
            <input
              id={timeId}
              type="time"
              value={form.time}
              onChange={(event) => onFormChange("time", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor={freqId} className="block text-sm font-medium text-gray-700">
              Frequency
            </label>
            <select
              id={freqId}
              value={form.frequency}
              onChange={(event) => onFrequencyChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {frequencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {form.frequency === "once" && (
            <div>
              <label htmlFor={onceDateId} className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                id={onceDateId}
                type="date"
                value={form.date}
                onChange={(event) => onFormChange("date", event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
          )}

          {form.frequency === "weekly" && (
            <div>
              <p className="block text-sm font-medium text-gray-700">Days of week</p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {weekDayOptions.map((dayOption) => {
                  const isSelected = form.daysOfWeek.includes(dayOption.value);

                  return (
                    <label
                      key={dayOption.value}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition cursor-pointer ${isSelected ? "border-[#0C5BD5] bg-[#EAF2FF] text-[#12459A]" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleWeeklyDay(dayOption.value)}
                        className="h-4 w-4 rounded border-gray-300 text-[#0C5BD5] focus:ring-[#0C5BD5]"
                      />
                      {dayOption.label}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {form.frequency === "specific" && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="block text-sm font-medium text-gray-700">Specific dates</p>
                <button
                  type="button"
                  onClick={onAddSpecificDate}
                  className="rounded-lg border border-[#C4D7FF] bg-[#EAF2FF] px-3 py-1.5 text-xs font-semibold text-[#12459A]"
                >
                  + Add Date
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {form.specificDates.length === 0 ? (
                  <span className="text-xs text-gray-500">No dates selected yet. Click Add Date to open calendar picker.</span>
                ) : (
                  form.specificDates.map((dateValue, index) => (
                    <div
                      key={`${dateValue || "empty"}-${index}`}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="date"
                        value={dateValue}
                        onChange={(event) => onUpdateSpecificDate(index, event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveSpecificDate(index)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {form.specificDates.filter(Boolean).length === 0 ? (
                  <span className="text-xs text-gray-500">Selected dates will appear here.</span>
                ) : (
                  form.specificDates.filter(Boolean).map((dateValue) => (
                    <span
                      key={dateValue}
                      className="inline-flex items-center gap-1 rounded-full border border-[#C4D7FF] bg-[#EEF4FF] px-3 py-1 text-xs font-semibold text-[#12459A]"
                    >
                      {dateValue}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:border-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0C5BD5] text-white hover:bg-[#0A4AB0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitText}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReminderFormModal;
