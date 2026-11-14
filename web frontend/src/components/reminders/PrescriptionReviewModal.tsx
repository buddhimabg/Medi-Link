import React from "react";
import { ReminderDuplicateBadge } from "./ReminderStatusBadge";

export interface ExtractedReminderItem {
  title?: string;
  time?: string;
  frequency?: string;
  instruction?: string;
  durationDays?: number;
  isDuplicate?: boolean;
  duplicateMessage?: string;
  [key: string]: any;
}

export interface PrescriptionReviewModalProps {
  isOpen: boolean;
  reviewReminders: ExtractedReminderItem[];
  onUpdateReviewReminder: (index: number, field: string, value: any) => void;
  onRemoveReviewReminder: (index: number) => void;
  onAddReviewReminder: () => void;
  onConfirmReview: () => void;
  onClose: () => void;
  isSavingReview: boolean;
}

const PrescriptionReviewModal: React.FC<PrescriptionReviewModalProps> = ({
  isOpen,
  reviewReminders,
  onUpdateReviewReminder,
  onRemoveReviewReminder,
  onAddReviewReminder,
  onConfirmReview,
  onClose,
  isSavingReview,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0C5BD5] to-[#1E40AF] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold bg-gradient-to-r from-gray-900 via-gray-800 to-[#0C5BD5] bg-clip-text text-transparent">
                Review Extracted Prescription
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                We analyzed your prescription image using AI & OCR. Review and edit before adding to your schedule.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 mb-2 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-amber-800 text-xs sm:text-sm shadow-sm">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="font-bold block">AI extraction may contain mistakes.</span>
            Please review medicine names, dosage, and time before saving.
          </div>
        </div>

        {reviewReminders.some((rem) => rem.isDuplicate) && (
          <div className="mb-2 p-3.5 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-3 text-red-800 text-xs sm:text-sm shadow-sm">
            <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-bold block">Duplicate Medications Detected!</span>
              Some medications match your existing active reminders. Please review the highlighted items below or remove them before saving.
            </div>
          </div>
        )}

        <div className="my-6 overflow-y-auto pr-1 space-y-4 flex-1">
          {reviewReminders.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              No medications remaining. Click "Add Another Medication" below.
            </div>
          ) : (
            reviewReminders.map((rem, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20 border border-[#C4D7FF]/80 shadow-sm hover:shadow-md transition-all duration-300 relative group"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <ReminderDuplicateBadge
                    isDuplicate={rem.isDuplicate}
                    duplicateMessage={rem.duplicateMessage}
                  />

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                      Medication Title
                    </label>
                    <input
                      type="text"
                      value={rem.title || ""}
                      onChange={(e) => onUpdateReviewReminder(idx, "title", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-800 shadow-sm focus:border-[#0C5BD5] focus:ring-2 focus:ring-[#C4D7FF] transition"
                      placeholder="e.g. Take Amoxicillin 500mg"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={rem.time || "08:00"}
                      onChange={(e) => onUpdateReviewReminder(idx, "time", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-[#0C5BD5] focus:ring-2 focus:ring-[#C4D7FF] transition"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                      Frequency
                    </label>
                    <select
                      value={rem.frequency || "daily"}
                      onChange={(e) => onUpdateReviewReminder(idx, "frequency", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-[#0C5BD5] focus:ring-2 focus:ring-[#C4D7FF] transition"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="once">Once</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1 flex justify-end sm:justify-center mt-2 sm:mt-6">
                    <button
                      type="button"
                      onClick={() => onRemoveReviewReminder(idx)}
                      title="Remove medication"
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="sm:col-span-8 mt-1">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                      Instruction / Dosage Rule
                    </label>
                    <input
                      type="text"
                      value={rem.instruction || ""}
                      onChange={(e) => onUpdateReviewReminder(idx, "instruction", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-[#0C5BD5] focus:ring-2 focus:ring-[#C4D7FF] transition"
                      placeholder="e.g. Take 1 tablet after meals"
                    />
                  </div>

                  <div className="sm:col-span-4 mt-1">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                      Duration (Days, 0 = Ongoing)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={rem.durationDays !== undefined ? rem.durationDays : 0}
                      onChange={(e) => onUpdateReviewReminder(idx, "durationDays", Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-[#0C5BD5] focus:ring-2 focus:ring-[#C4D7FF] transition"
                      placeholder="0 (Ongoing)"
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          <button
            type="button"
            onClick={onAddReviewReminder}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-[#C4D7FF] bg-[#EEF4FF]/50 hover:bg-[#EEF4FF] text-[#12459A] font-semibold text-sm flex items-center justify-center gap-2 transition"
          >
            <span className="text-lg leading-none">+</span>
            Add Another Medication
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSavingReview}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onConfirmReview}
            disabled={isSavingReview || reviewReminders.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0C5BD5] to-[#1E40AF] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:from-[#0A4AB0] hover:to-[#1E3A8A] hover:shadow-blue-500/40 transition disabled:opacity-50 cursor-pointer"
          >
            {isSavingReview ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving Reminders...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Confirm & Add Reminders ({reviewReminders.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionReviewModal;
