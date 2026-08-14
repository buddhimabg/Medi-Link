// @ts-nocheck
import React, { useMemo, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import StatsCard from "../components/StatsCard";
import { getCurrentUserId, UI_ALERT_TIMEOUT_MS } from "../config";
import {
  createReminder,
  deleteReminder,
  updateReminder,
  uploadPrescription,
} from "../api/reminderApi";
import { useReminderStore } from "../store/reminderStore";
import useReminderAutoRefresh from "../hooks/useReminderAutoRefresh";
import {
  formatDateYMDInTimeZone,
  getTodayYmdLocal,
} from "../utils/reminderSchedule";
import { getTodayReminders, isReminderOffToday } from "../utils/reminderHelpers";
import { PageLoadingSpinner, EmptyState, ConfirmDialog, InlineAlert } from "../components/ui";
import { getErrorMessage } from "../utils/errorHandler";
import CategoryIcon, {
  categoryMeta,
  categoryOrder,
  categoryOptions,
  normalizeCategory,
} from "../components/reminders/CategoryIcon";
import { ReminderDuplicateBadge } from "../components/reminders/ReminderStatusBadge";
import ReminderCard, { formatLabel, type Reminder } from "../components/reminders/ReminderCard";
import ReminderFormModal, { type ReminderForm } from "../components/reminders/ReminderFormModal";
import PrescriptionReviewModal, { type ExtractedReminderItem } from "../components/reminders/PrescriptionReviewModal";

// client-side date normalization removed - backend returns normalized fields

const getInitialReminderForm = () => ({
  title: "",
  description: "",
  instruction: "",
  durationDays: 0,
  category: "mood",
  time: "08:00",
  frequency: "daily",
  date: getTodayYmdLocal(),
  daysOfWeek: [],
  specificDates: [],
});

const OverviewCard = ({ title, value, tone = "default", icon }) => {
  const valueClass = {
    default: "text-gray-800",
    warning: "text-amber-600",
    success: "text-emerald-600",
    muted: "text-slate-600",
  }[tone] || "text-gray-800";

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: "rgba(12, 91, 213, 0.14)" }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/35 to-transparent" />
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{title}</p>
          <p className={`text-lg font-bold mt-0.5 ${valueClass}`}>{value}</p>
        </div>
      </div>
    </div>
  );
};

// Icon components for overview stats
const TotalRemindersIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 text-[#0C5BD5] relative z-10 ${className}`} aria-hidden="true">
    <path d="M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 3v4M16 3v4M8 11h8M8 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const ActiveIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 text-[#0C5BD5] relative z-10 ${className}`} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const OffTodayIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 text-[#0C5BD5] relative z-10 ${className}`} aria-hidden="true">
    <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const RemindersPage = () => {
  const [collapsed, setCollapsed] = useState(false);
  const reminders = useReminderStore((state) => state.reminders);
  const loading = useReminderStore((state) => state.loading);
  const error = useReminderStore((state) => state.error);
  const setReminders = useReminderStore((state) => state.setReminders);
  const setError = useReminderStore((state) => state.setError);
  const fetchRemindersCached = useReminderStore((state) => state.fetchRemindersCached);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busyActionKey, setBusyActionKey] = useState("");
  const [reminderToDelete, setReminderToDelete] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(getInitialReminderForm);
  const [editingReminderId, setEditingReminderId] = useState("");
  const [editForm, setEditForm] = useState(getInitialReminderForm);
  const [isUploading, setIsUploading] = useState(false);
  const [reviewReminders, setReviewReminders] = useState<any[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const fileInputRef = useRef(null);

  const userId = getCurrentUserId();

  const loadReminders = async (options?: { force?: boolean }) => {
    try {
      await fetchRemindersCached(userId, options);
    } catch (requestError) {
      // Error is handled in fetchRemindersCached
    }
  };

  useReminderAutoRefresh(loadReminders, {
    intervalMs: 0,
    refreshOnFocus: true,
    refreshOnVisibility: true,
    refreshOnMidnight: true,
    initialRefresh: true,
  });

  const todayReminders = useMemo(() => {
    // Filter out expired/completed reminders — they should not appear on the page
    const activeReminders = reminders.filter(
      (r) => r.isActive !== false && r.status !== "completed"
    );
    return getTodayReminders(activeReminders);
  }, [reminders]);

  const counts = useMemo(() => {
    const offToday = todayReminders.filter((item) => isReminderOffToday(item)).length;
    const active = todayReminders.length - offToday;

    return {
      total: todayReminders.length,
      active,
      offToday,
    };
  }, [todayReminders]);

  const startBusyAction = (reminderId, actionName) => {
    setBusyActionKey(`${String(reminderId)}:${actionName}`);
  };

  const clearBusyAction = () => {
    setBusyActionKey("");
  };

  const isBusyAction = (reminderId, actionName) => busyActionKey === `${String(reminderId)}:${actionName}`;

  const openEditModal = (reminder) => {
    const reminderTimeZone = reminder.timezone || "Asia/Colombo";
    const prefilledSpecificDates = Array.isArray(reminder.specificDates)
      ? reminder.specificDates
      : (Array.isArray(reminder.customDates) ? reminder.customDates : []);
    const prefilledDate = reminder.date || prefilledSpecificDates[0] || formatDateYMDInTimeZone(new Date(), reminderTimeZone);
    const prefilledDays = Array.isArray(reminder.daysOfWeek)
      ? reminder.daysOfWeek.map((d) => Number(d)).filter((v) => Number.isInteger(v) && v >= 0 && v <= 6).sort((a, b) => a - b)
      : [];

    setEditingReminderId(String(reminder._id));
    setEditForm({
      title: reminder.title || "",
      description: reminder.description || "",
      instruction: reminder.instruction || "",
      durationDays: reminder.durationDays !== undefined ? reminder.durationDays : 0,
      category: reminder.category || "mood",
      time: reminder.time || "08:00",
      frequency: reminder.frequency || "daily",
      date: prefilledDate,
      daysOfWeek: prefilledDays,
      specificDates: prefilledSpecificDates,
    });
    setActionError("");
    setActionMessage("");
  };

  const closeEditModal = () => {
    setEditingReminderId("");
    setEditForm(getInitialReminderForm());
  };

  const openCreateModal = () => {
    setCreateForm(getInitialReminderForm());
    setIsCreateModalOpen(true);
    setActionError("");
    setActionMessage("");
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateForm(getInitialReminderForm());
  };

  const toggleWeeklyDay = (dayValue) => {
    setEditForm((previous) => {
      const hasDay = previous.daysOfWeek.includes(dayValue);
      const daysOfWeek = hasDay
        ? previous.daysOfWeek.filter((existingDay) => existingDay !== dayValue)
        : [...previous.daysOfWeek, dayValue].sort((firstDay, secondDay) => firstDay - secondDay);

      return {
        ...previous,
        daysOfWeek,
      };
    });
  };

  const toggleCreateWeeklyDay = (dayValue) => {
    setCreateForm((previous) => {
      const hasDay = previous.daysOfWeek.includes(dayValue);
      const daysOfWeek = hasDay
        ? previous.daysOfWeek.filter((existingDay) => existingDay !== dayValue)
        : [...previous.daysOfWeek, dayValue].sort((firstDay, secondDay) => firstDay - secondDay);

      return {
        ...previous,
        daysOfWeek,
      };
    });
  };

  const handleFrequencyChange = (nextFrequency) => {
    setEditForm((previous) => {
      const nextForm = {
        ...previous,
        frequency: nextFrequency,
      };

      if (nextFrequency === "once" && !nextForm.date) {
        nextForm.date = getTodayYmdLocal();
      }

      if (nextFrequency === "specific" && nextForm.specificDates.length === 0) {
        // Keep UX fast by rendering a date picker immediately for specific frequency.
        nextForm.specificDates = [""];
      }

      return nextForm;
    });
  };

  const handleCreateFrequencyChange = (nextFrequency) => {
    setCreateForm((previous) => {
      const nextForm = {
        ...previous,
        frequency: nextFrequency,
      };

      if (nextFrequency === "once" && !nextForm.date) {
        nextForm.date = getTodayYmdLocal();
      }

      if (nextFrequency === "specific" && nextForm.specificDates.length === 0) {
        nextForm.specificDates = [""];
      }

      return nextForm;
    });
  };

  const addSpecificDateInput = () => {
    setEditForm((previous) => ({
      ...previous,
      specificDates: [...previous.specificDates, ""],
    }));
  };

  const addCreateSpecificDateInput = () => {
    setCreateForm((previous) => ({
      ...previous,
      specificDates: [...previous.specificDates, ""],
    }));
  };

  const updateSpecificDate = (index, dateValue) => {
    setEditForm((previous) => {
      const nextDates = [...previous.specificDates];
      nextDates[index] = dateValue;

      const seenDates = new Set();
      const uniqueDates = nextDates.filter((value) => {
        if (!value) {
          return true;
        }

        if (seenDates.has(value)) {
          return false;
        }

        seenDates.add(value);
        return true;
      });

      return {
        ...previous,
        specificDates: uniqueDates,
      };
    });
  };

  const updateCreateSpecificDate = (index, dateValue) => {
    setCreateForm((previous) => {
      const nextDates = [...previous.specificDates];
      nextDates[index] = dateValue;

      const seenDates = new Set();
      const uniqueDates = nextDates.filter((value) => {
        if (!value) {
          return true;
        }

        if (seenDates.has(value)) {
          return false;
        }

        seenDates.add(value);
        return true;
      });

      return {
        ...previous,
        specificDates: uniqueDates,
      };
    });
  };

  const removeSpecificDate = (dateIndex) => {
    setEditForm((previous) => ({
      ...previous,
      specificDates: previous.specificDates.filter((_, index) => index !== dateIndex),
    }));
  };

  const removeCreateSpecificDate = (dateIndex) => {
    setCreateForm((previous) => ({
      ...previous,
      specificDates: previous.specificDates.filter((_, index) => index !== dateIndex),
    }));
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();

    if (!createForm.title.trim()) {
      setActionError("Please add a title.");
      return;
    }

    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(createForm.time)) {
      setActionError("Please provide time in HH:mm format.");
      return;
    }

    if (createForm.frequency === "once" && !createForm.date) {
      setActionError("Please choose a date for once frequency.");
      return;
    }

    if (createForm.frequency === "weekly" && createForm.daysOfWeek.length === 0) {
      setActionError("Select at least one day for weekly frequency.");
      return;
    }

    const selectedSpecificDates = createForm.specificDates.filter(Boolean);
    if (createForm.frequency === "specific" && selectedSpecificDates.length === 0) {
      setActionError("Select at least one date for specific dates frequency.");
      return;
    }

    const payload = {
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      instruction: createForm.instruction.trim(),
      durationDays: Number(createForm.durationDays || 0),
      category: createForm.category,
      time: createForm.time,
      frequency: createForm.frequency,
      date: createForm.frequency === "once" ? createForm.date : null,
      daysOfWeek: createForm.frequency === "weekly" ? createForm.daysOfWeek : [],
      specificDates: createForm.frequency === "specific" ? selectedSpecificDates : [],
    };

    setActionError("");
    setActionMessage("");
    startBusyAction("create", "new");

    try {
      await createReminder(payload, userId);
      await loadReminders({ force: true });
      closeCreateModal();
      setActionMessage("Reminder created.");
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Unable to create reminder."));
    } finally {
      clearBusyAction();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setActionError("");
    setActionMessage("");

    try {
      const response = await uploadPrescription(file, userId);
      const extractedReminders = response?.reminders || response?.data?.reminders || [];
      
      if (!extractedReminders || extractedReminders.length === 0) {
        setActionError("No medication reminders could be extracted from this image. Please ensure the image is a valid prescription.");
        return;
      }

      setReviewReminders(extractedReminders);
      setIsReviewModalOpen(true);
      setActionMessage("Prescription analyzed successfully! Please review the extracted reminders below.");
    } catch (error: any) {
      setActionError(getErrorMessage(error, "Failed to process prescription image."));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const updateReviewReminder = (index, field, value) => {
    setReviewReminders((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeReviewReminder = (index) => {
    setReviewReminders((prev) => prev.filter((_, i) => i !== index));
  };

  const addReviewReminder = () => {
    setReviewReminders((prev) => [
      ...prev,
      {
        title: "New Medication",
        description: "Prescription medication",
        instruction: "Take 1 tablet after meals",
        durationDays: 0,
        category: "meditation",
        time: "08:00",
        frequency: "daily",
      },
    ]);
  };

  const handleConfirmReview = async () => {
    if (reviewReminders.length === 0) {
      setActionError("Please keep at least one reminder to save.");
      return;
    }

    // Validate each extracted reminder before saving
    for (let i = 0; i < reviewReminders.length; i++) {
      const rem = reviewReminders[i];
      if (!rem.title || !String(rem.title).trim()) {
        setActionError(`Reminder ${i + 1} is missing a title. Please fill it in before saving.`);
        return;
      }
      const timeVal = rem.time || "";
      if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(timeVal)) {
        setActionError(`Reminder ${i + 1} ("${rem.title}") has an invalid time. Use HH:mm format.`);
        return;
      }
    }

    setIsSavingReview(true);
    setActionError("");
    setActionMessage("");
    startBusyAction("review", "save");

    try {
      await Promise.all(
        reviewReminders.map((rem) =>
          createReminder(
            {
              title: rem.title,
              description: rem.description || "Prescription medication",
              instruction: rem.instruction || "Take as prescribed",
              durationDays: rem.durationDays !== undefined ? Number(rem.durationDays) : 0,
              category: rem.category || "meditation",
              time: rem.time || "08:00",
              frequency: rem.frequency || "daily",
              date: rem.frequency === "once" ? (rem.date || getTodayYmdLocal()) : null,
              daysOfWeek: rem.frequency === "weekly" ? (rem.daysOfWeek || [1, 2, 3, 4, 5]) : [],
              specificDates: rem.frequency === "specific" ? (rem.specificDates || [getTodayYmdLocal()]) : [],
              createdFrom: "prescription",
            },
            userId
          )
        )
      );

      await loadReminders({ force: true });
      setIsReviewModalOpen(false);
      setReviewReminders([]);
      setActionMessage("Prescription uploaded and reminders generated successfully.");
    } catch (error: any) {
      setActionError(getErrorMessage(error, "Failed to save prescription reminders."));
    } finally {
      setIsSavingReview(false);
      clearBusyAction();
    }
  };

  const handleToggleToday = async (reminder, forceDisableToday = null) => {
    const reminderId = reminder?._id;
    if (!reminderId) {
      return;
    }

    const timeZone = reminder.timezone || "Asia/Colombo";
    const todayDate = formatDateYMDInTimeZone(new Date(), timeZone);
    const disabledDates = Array.isArray(reminder.disabledDates)
      ? reminder.disabledDates.map((value) => String(value).trim()).filter(Boolean)
      : [];
    const isOffToday = reminder.disabledToday || reminder.isDisabledToday || reminder.status === "skipped" || disabledDates.includes(todayDate);
    const shouldDisableToday = forceDisableToday ?? !isOffToday;
    const nextDisabledDates = shouldDisableToday
      ? Array.from(new Set([...disabledDates, todayDate]))
      : disabledDates.filter((value) => value !== todayDate);

    setActionError("");
    setActionMessage("");
    startBusyAction(reminderId, "toggle");

    try {
      await updateReminder(
        reminderId,
        {
          disabledDates: nextDisabledDates,
          isDisabledToday: shouldDisableToday,
        },
        userId
      );

      setReminders((currentReminders) => currentReminders.map((currentReminder) => {
        if (String(currentReminder._id) !== String(reminderId)) {
          return currentReminder;
        }

        return {
          ...currentReminder,
          disabledDates: nextDisabledDates,
          disabledToday: shouldDisableToday,
          isDisabledToday: shouldDisableToday,
          status: shouldDisableToday ? "skipped" : "pending",
        };
      }));

      // Invalidate cache so the next auto-refresh picks up the persisted state,
      // but don't force-refetch — the optimistic update above already reflects the correct UI.
      useReminderStore.getState().invalidateReminders();
      setActionMessage(shouldDisableToday ? "Reminder turned off for today." : "Reminder turned on for today.");
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Unable to update reminder."));
    } finally {
      clearBusyAction();
    }
  };

  const handleOffToday = async (reminder) => {
    const reminderId = reminder?._id;
    if (!reminderId) {
      return;
    }

    if (reminder.disabledToday || reminder.isDisabledToday || reminder.status === "skipped") {
      return;
    }

    return handleToggleToday(reminder, true);
  };

  const requestDeleteReminder = (reminder: any) => {
    setReminderToDelete(reminder);
  };

  const confirmDeleteReminder = async () => {
    if (!reminderToDelete) return;
    const reminderId = reminderToDelete._id;
    setReminderToDelete(null);

    setActionError("");
    setActionMessage("");
    startBusyAction(reminderId, "delete");

    try {
      await deleteReminder(reminderId, userId);
      await loadReminders({ force: true });
      setActionMessage("Reminder deleted.");
    } catch (requestError: any) {
      setActionError(getErrorMessage(requestError, "Unable to delete reminder."));
    } finally {
      clearBusyAction();
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!editingReminderId) {
      return;
    }

    if (!editForm.title.trim()) {
      setActionError("Please add a title.");
      return;
    }

    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(editForm.time)) {
      setActionError("Please provide time in HH:mm format.");
      return;
    }

    if (editForm.frequency === "once" && !editForm.date) {
      setActionError("Please choose a date for once frequency.");
      return;
    }

    if (editForm.frequency === "weekly" && editForm.daysOfWeek.length === 0) {
      setActionError("Select at least one day for weekly frequency.");
      return;
    }

    const selectedSpecificDates = editForm.specificDates.filter(Boolean);

    if (editForm.frequency === "specific" && selectedSpecificDates.length === 0) {
      setActionError("Select at least one date for specific dates frequency.");
      return;
    }

    const updatePayload = {
      title: editForm.title,
      description: editForm.description,
      instruction: editForm.instruction,
      durationDays: Number(editForm.durationDays || 0),
      time: editForm.time,
      frequency: editForm.frequency,
      date: editForm.frequency === "once" ? editForm.date : null,
      daysOfWeek: editForm.frequency === "weekly" ? editForm.daysOfWeek : [],
      specificDates: editForm.frequency === "specific" ? selectedSpecificDates : [],
    };

    setActionError("");
    setActionMessage("");
    startBusyAction(editingReminderId, "edit");

    try {
      await updateReminder(
        editingReminderId,
        updatePayload,
        userId
      );

      await loadReminders({ force: true });

      closeEditModal();
      setActionMessage("Reminder updated.");
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Unable to update reminder."));
    } finally {
      clearBusyAction();
    }
  };

  const groupedReminders = useMemo(() => {
    return todayReminders.reduce((accumulator, reminder) => {
      const categoryKey = normalizeCategory(reminder.category);
      if (!accumulator[categoryKey]) {
        accumulator[categoryKey] = [];
      }
      accumulator[categoryKey].push(reminder);
      return accumulator;
    }, {});
  }, [todayReminders]);

  const sortedCategoryKeys = useMemo(() => {
    const available = Object.keys(groupedReminders);
    return categoryOrder.filter((categoryKey) => available.includes(categoryKey));
  }, [groupedReminders]);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar
        activePage="Reminders"
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        pendingRemindersCount={counts.total}
        unreadNotificationsCount={0}
      />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Reminder & Tracking</h1>
                <p className="text-gray-500 mt-1">Manage reminders directly from the database-backed screen.</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*,.pdf" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0C5BD5] to-[#1E40AF] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-[#0A4AB0] hover:to-[#1E3A8A] transition disabled:opacity-50"
                >
                  {isUploading ? (
                    <span>Uploading...</span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload Prescription
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0C5BD5] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0A4AB0] transition"
                >
                  <span className="text-base leading-none">+</span>
                  Add Reminder
                </button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <StatsCard icon={TotalRemindersIcon} title="Total Reminders" value={counts.total} />
            <StatsCard icon={OffTodayIcon} title="Off Today" value={counts.offToday} />
            <StatsCard icon={ActiveIcon} title="Active" value={counts.active} />
          </div>

          {/* Get Started Notice when no reminders exist at all */}
          {!loading && reminders.length === 0 && !error && (
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-[#0C5BD5]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-800">Get Started with Reminders</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    You haven't added any medication or wellness reminders yet. Click the button below or upload a prescription to create your first reminder.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 bg-[#0C5BD5] text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-[#0A4AB0] transition whitespace-nowrap"
              >
                + Add First Reminder
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4">
              <InlineAlert type="error" message={error} onClose={() => setError("")} />
            </div>
          )}

          {actionMessage && !actionError && (
            <div className="mb-4 animate-slide-in">
              <InlineAlert type="success" message={actionMessage} autoCloseMs={UI_ALERT_TIMEOUT_MS} onClose={() => setActionMessage("")} />
            </div>
          )}

          {actionError && (
            <div className="mb-4 animate-slide-in">
              <InlineAlert type="error" message={actionError} onClose={() => setActionError("")} />
            </div>
          )}

          <section className="space-y-6">
            {loading ? (
              <div className="py-12">
                <PageLoadingSpinner message="Loading reminders…" fullHeight={false} />
              </div>
            ) : reminders.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <EmptyState
                  title="No reminders yet"
                  description="Add your first reminder to get started."
                  actionLabel="Add Reminder"
                  onAction={openCreateModal}
                />
              </div>
            ) : sortedCategoryKeys.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <EmptyState
                  title="No reminders scheduled for today"
                  description="You have reminders saved, but none are active or scheduled for today. Add a new reminder or check future occurrences."
                  actionLabel="Add Reminder"
                  onAction={openCreateModal}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {sortedCategoryKeys.map((categoryKey) => {
                  const categoryReminders = groupedReminders[categoryKey] || [];
                  const activeCount = categoryReminders.filter((reminder) => reminder.isActive).length;
                  const meta = categoryMeta[categoryKey] || categoryMeta.unknown;

                  return (
                    <section key={categoryKey} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: meta.color }}>
                          <CategoryIcon type={meta.icon} className={`h-4 w-4 ${meta.iconClass}`} />
                        </div>
                        <h2 className="text-lg leading-none font-semibold text-gray-900">{meta.label}</h2>
                        <span className="text-xs font-semibold bg-[#DFF0FF] text-[#0C5BD5] px-2 py-1 rounded-md">
                          {activeCount} active
                        </span>
                      </div>

                      <div className="space-y-3">
                        {categoryReminders.map((reminder) => (
                          <ReminderCard
                            key={String(reminder._id)}
                            reminder={reminder}
                            isBusyAction={isBusyAction}
                            onEdit={openEditModal}
                            onDelete={requestDeleteReminder}
                            onToggleToday={handleToggleToday}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <ConfirmDialog
        isOpen={!!reminderToDelete}
        title="Delete Reminder?"
        message={`Are you sure you want to delete "${reminderToDelete?.title || 'this reminder'}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={confirmDeleteReminder}
        onCancel={() => setReminderToDelete(null)}
      />

      <ReminderFormModal
        isOpen={isCreateModalOpen}
        mode="create"
        form={createForm}
        onFormChange={(field, value) => setCreateForm((prev) => ({ ...prev, [field]: value }))}
        onFrequencyChange={handleCreateFrequencyChange}
        onToggleWeeklyDay={toggleCreateWeeklyDay}
        onAddSpecificDate={addCreateSpecificDateInput}
        onUpdateSpecificDate={updateCreateSpecificDate}
        onRemoveSpecificDate={removeCreateSpecificDate}
        onSubmit={handleCreateSubmit}
        onClose={closeCreateModal}
        isBusy={isBusyAction("create", "new")}
      />

      <ReminderFormModal
        isOpen={Boolean(editingReminderId)}
        mode="edit"
        form={editForm}
        onFormChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
        onFrequencyChange={handleFrequencyChange}
        onToggleWeeklyDay={toggleWeeklyDay}
        onAddSpecificDate={addSpecificDateInput}
        onUpdateSpecificDate={updateSpecificDate}
        onRemoveSpecificDate={removeSpecificDate}
        onSubmit={handleEditSubmit}
        onClose={closeEditModal}
        isBusy={isBusyAction(editingReminderId || "", "edit")}
      />

      <PrescriptionReviewModal
        isOpen={isReviewModalOpen}
        reviewReminders={reviewReminders}
        onUpdateReviewReminder={updateReviewReminder}
        onRemoveReviewReminder={removeReviewReminder}
        onAddReviewReminder={addReviewReminder}
        onConfirmReview={handleConfirmReview}
        onClose={() => setIsReviewModalOpen(false)}
        isSavingReview={isSavingReview}
      />
    </div>
  );
};

export default RemindersPage;
