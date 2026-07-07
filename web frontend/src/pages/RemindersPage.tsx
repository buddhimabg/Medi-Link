// @ts-nocheck
import React, { useMemo, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import StatsCard from "../components/StatsCard";
import { getCurrentUserId } from "../config";
import {
  createReminder,
  deleteReminder,
  fetchReminders,
  updateReminder,
  uploadPrescription,
} from "../api/reminderApi";
import useReminderAutoRefresh from "../hooks/useReminderAutoRefresh";
import {
  formatDateYMDInTimeZone,
  getTodayYmdLocal,
} from "../utils/reminderSchedule";
import { getTodayReminders, isReminderOffToday } from "../utils/reminderHelpers";
import { PageLoadingSpinner, EmptyState, ConfirmDialog, InlineAlert } from "../components/ui";
import { getErrorMessage } from "../utils/errorHandler";

interface CategoryMeta {
  label: string;
  iconClass: string;
  icon: string;
}

interface Reminder {
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

interface ReminderForm {
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

interface FrequencyOption {
  value: string;
  label: string;
}

interface WeekDayOption {
  value: number;
  label: string;
}

const categoryMeta: Record<string, CategoryMeta> = {
  meditation: {
    label: "Meditation",
    iconClass: "text-[#0C5BD5]",
    icon: "pill",
  },
  mood: {
    label: "Mood Tracking",
    iconClass: "text-[#0C5BD5]",
    icon: "heart",
  },
  activity: {
    label: "Activity",
    iconClass: "text-emerald-600",
    icon: "spark",
  },
  appointment: {
    label: "Appointment",
    iconClass: "text-amber-600",
    icon: "calendar",
  },
  unknown: {
    label: "Other",
    iconClass: "text-gray-500",
    icon: "dot",
  },
};

const categoryOrder = ["meditation", "mood", "activity", "appointment", "unknown"];

const categoryOptions = ["meditation", "mood", "activity", "appointment"];

const frequencyOptions = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "specific", label: "Specific Dates" },
];

const weekDayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const formatLabel = (value) => {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatTime = (timeValue) => {
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

const normalizeCategory = (categoryValue) => {
  if (!categoryValue) {
    return "unknown";
  }

  const normalized = String(categoryValue).toLowerCase();
  return categoryMeta[normalized] ? normalized : "unknown";
};

const CategoryIcon = ({ type, className }) => {
  if (type === "pill") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M14.5 4.5a5 5 0 0 1 7.07 7.07l-6.36 6.36a5 5 0 1 1-7.07-7.07l6.36-6.36Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9.96 9.96 4.08 4.08" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "heart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 20s-7-4.5-7-9.5a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10.5C19 15.5 12 20 12 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M8 3v3M16 3v3M4 10h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "spark") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return <span className={`${className} inline-block h-2.5 w-2.5 rounded-full bg-current`} aria-hidden="true" />;
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busyActionKey, setBusyActionKey] = useState("");
  const [reminderToDelete, setReminderToDelete] = useState<any>(null);
  const [reminders, setReminders] = useState([]);
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

  const loadReminders = async () => {
    try {
      setError("");
      const data = await fetchReminders(userId);
      setReminders(data?.reminders || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to load reminders."));
    } finally {
      setLoading(false);
    }
  };

  useReminderAutoRefresh(loadReminders, {
    intervalMs: 0,
    refreshOnFocus: true,
    refreshOnVisibility: true,
    refreshOnMidnight: true,
    initialRefresh: true,
  });

  const todayReminders = useMemo(() => getTodayReminders(reminders), [reminders]);

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
      await loadReminders();
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

      await loadReminders();
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
    const isOffToday = reminder.disabledToday || disabledDates.includes(todayDate);
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

      await loadReminders();
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

    if (reminder.disabledToday) {
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
      await loadReminders();
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

      await loadReminders();

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
        <div>
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

          {error && (
            <div className="mb-4">
              <InlineAlert type="error" message={error} onClose={() => setError("")} />
            </div>
          )}

          {actionMessage && !actionError && (
            <div className="mb-4 animate-slide-in">
              <InlineAlert type="success" message={actionMessage} autoCloseMs={4000} onClose={() => setActionMessage("")} />
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
                <EmptyState title="No reminders yet" description="Add your first reminder to get started." actionLabel="Add Reminder" onAction={openCreateModal} />
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
                        {categoryReminders.map((reminder) => {
                          const isToggleBusy = isBusyAction(reminder._id, "toggle");
                          const isDeleteBusy = isBusyAction(reminder._id, "delete");
                          const isEditBusy = isBusyAction(reminder._id, "edit");
                          const isDisabledToday = Boolean(reminder.disabledToday) || Boolean(reminder.isDisabledToday) || reminder.status === "skipped";
                          const isInactive = !reminder.isActive;
                          const isScheduled = !isDisabledToday && !isInactive;
                          const isRowBusy = isToggleBusy || isDeleteBusy || isEditBusy;

                          const cardStateClass = isDisabledToday
                            ? "bg-[#F8FAFD] border-gray-800 shadow-sm opacity-85"
                            : isInactive
                              ? "bg-white border-gray-200 shadow-sm opacity-90"
                              : "bg-white border-gray-100 shadow-sm hover:shadow-md";

                          const statusLabel = isDisabledToday ? "Off Today" : isInactive ? "Paused" : "Scheduled";
                          const statusClass = isDisabledToday
                            ? "bg-slate-100 border-slate-300 text-slate-600"
                            : isInactive
                                ? "bg-gray-100 border-gray-300 text-gray-600"
                                : "bg-[#EAF2FF] border-[#C4D7FF] text-[#12459A]";
                          const isToggleOn = !isDisabledToday;

                          return (
                            <article
                              key={String(reminder._id)}
                              className={`stats-card transition-all ${isDisabledToday ? 'opacity-85' : isInactive ? 'opacity-90' : ''}`}
                            >
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className={`text-base sm:text-lg leading-tight font-semibold tracking-[-0.01em] ${isDisabledToday ? "text-slate-500" : "text-gray-900"}`}>{reminder.title}</h3>
                                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                  {reminder.description && (
                                    <p className={`mt-1 text-sm leading-snug ${isDisabledToday ? "text-slate-500" : "text-gray-600"}`}>{reminder.description}</p>
                                  )}
                                  {reminder.instruction && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50/80 px-2.5 py-1 text-xs font-medium text-[#0C5BD5] border border-blue-200/60 shadow-xs">
                                      <svg className="w-3.5 h-3.5 text-[#0C5BD5] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span><strong>Instruction:</strong> {reminder.instruction}</span>
                                    </div>
                                  )}
                                  {reminder.durationDays !== undefined && reminder.durationDays > 0 && (
                                    <div className="mt-2 ml-2 inline-flex items-center gap-1.5 rounded-lg bg-purple-50/80 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200/60 shadow-xs">
                                      <span>⏱️ <strong>Duration:</strong> {reminder.durationDays} Days {reminder.endDate ? `(Ends ${reminder.endDate})` : ""}</span>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap items-center gap-3 mt-2.5">
                                    <span className={`inline-flex items-center gap-2 font-semibold text-sm ${isDisabledToday ? "text-slate-500" : "text-[#0C5BD5]"}`}>
                                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                      {formatTime(reminder.time)}
                                    </span>
                                    <span className={`text-sm ${isDisabledToday ? "text-slate-500" : "text-gray-700"}`}>{formatLabel(reminder.frequency)}</span>
                                    {isScheduled && (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleToday(reminder, true)}
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
                                    onClick={() => openEditModal(reminder)}
                                    disabled={isRowBusy}
                                    title="Edit reminder"
                                    className="p-1.5 rounded-md hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                                      <path d="m4 20 4.4-.8L19 8.6 15.4 5 4.8 15.6 4 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                      <path d="m13.8 6.6 3.6 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => requestDeleteReminder(reminder)}
                                    disabled={isRowBusy}
                                    title="Delete reminder"
                                    className="p-1.5 rounded-md hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    {isDeleteBusy ? (
                                      <span className="text-sm text-gray-500">...</span>
                                    ) : (
                                      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                                        <path d="M4 7h16M9 7V4h6v3M8 10v7M12 10v7M16 10v7M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleToday(reminder)}
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
                        })}
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-6 shadow-xl"
          >
            <h2 className="text-xl font-semibold text-gray-900">Add Reminder</h2>
            <p className="text-sm text-gray-500 mt-1">Create a new reminder with a custom schedule.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="create-reminder-title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  id="create-reminder-title"
                  value={createForm.title}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, title: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="create-reminder-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="create-reminder-description"
                  value={createForm.description}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, description: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="create-reminder-instruction" className="block text-sm font-medium text-gray-700">
                  Instruction (e.g., Take after meals)
                </label>
                <input
                  id="create-reminder-instruction"
                  type="text"
                  value={createForm.instruction}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, instruction: event.target.value }))}
                  placeholder="e.g., Take 1 tablet after meals"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="create-reminder-duration" className="block text-sm font-medium text-gray-700">
                  Duration (Days, 0 = Continuous/Ongoing)
                </label>
                <input
                  id="create-reminder-duration"
                  type="number"
                  min="0"
                  max="365"
                  value={createForm.durationDays}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, durationDays: event.target.value }))}
                  placeholder="0 (Ongoing)"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="create-reminder-category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="create-reminder-category"
                  value={createForm.category}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, category: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {formatLabel(category)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="create-reminder-time" className="block text-sm font-medium text-gray-700">
                  Time
                </label>
                <input
                  id="create-reminder-time"
                  type="time"
                  value={createForm.time}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, time: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="create-reminder-frequency" className="block text-sm font-medium text-gray-700">
                  Frequency
                </label>
                <select
                  id="create-reminder-frequency"
                  value={createForm.frequency}
                  onChange={(event) => handleCreateFrequencyChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {createForm.frequency === "once" && (
                <div>
                  <label htmlFor="create-reminder-once-date" className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    id="create-reminder-once-date"
                    type="date"
                    value={createForm.date}
                    onChange={(event) => setCreateForm((previous) => ({ ...previous, date: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              )}

              {createForm.frequency === "weekly" && (
                <div>
                  <p className="block text-sm font-medium text-gray-700">Days of week</p>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {weekDayOptions.map((dayOption) => {
                      const isSelected = createForm.daysOfWeek.includes(dayOption.value);

                      return (
                        <label
                          key={dayOption.value}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition cursor-pointer ${isSelected ? "border-[#0C5BD5] bg-[#EAF2FF] text-[#12459A]" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCreateWeeklyDay(dayOption.value)}
                            className="h-4 w-4 rounded border-gray-300 text-[#0C5BD5] focus:ring-[#0C5BD5]"
                          />
                          {dayOption.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {createForm.frequency === "specific" && (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="block text-sm font-medium text-gray-700">Specific dates</p>
                    <button
                      type="button"
                      onClick={addCreateSpecificDateInput}
                      className="rounded-lg border border-[#C4D7FF] bg-[#EAF2FF] px-3 py-1.5 text-xs font-semibold text-[#12459A]"
                    >
                      + Add Date
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {createForm.specificDates.length === 0 ? (
                      <span className="text-xs text-gray-500">No dates selected yet. Click Add Date to open calendar picker.</span>
                    ) : (
                      createForm.specificDates.map((dateValue, index) => (
                        <div
                          key={`${dateValue || "empty"}-${index}`}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="date"
                            value={dateValue}
                            onChange={(event) => updateCreateSpecificDate(index, event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeCreateSpecificDate(index)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCreateModal}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusyAction("create", "new")}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0C5BD5] text-white hover:bg-[#0A4AB0] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBusyAction("create", "new") ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingReminderId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-6 shadow-xl"
          >
            <h2 className="text-xl font-semibold text-gray-900">Edit Reminder</h2>
            <p className="text-sm text-gray-500 mt-1">Update title, note, time, and schedule.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="reminder-title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  id="reminder-title"
                  value={editForm.title}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, title: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="reminder-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="reminder-description"
                  value={editForm.description}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, description: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="reminder-instruction" className="block text-sm font-medium text-gray-700">
                  Instruction (e.g., Take after meals)
                </label>
                <input
                  id="reminder-instruction"
                  type="text"
                  value={editForm.instruction}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, instruction: event.target.value }))}
                  placeholder="e.g., Take 1 tablet after meals"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="reminder-duration" className="block text-sm font-medium text-gray-700">
                  Duration (Days, 0 = Continuous/Ongoing)
                </label>
                <input
                  id="reminder-duration"
                  type="number"
                  min="0"
                  max="365"
                  value={editForm.durationDays}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, durationDays: event.target.value }))}
                  placeholder="0 (Ongoing)"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="reminder-time" className="block text-sm font-medium text-gray-700">
                  Time
                </label>
                <input
                  id="reminder-time"
                  type="time"
                  value={editForm.time}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, time: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="reminder-frequency" className="block text-sm font-medium text-gray-700">
                  Frequency
                </label>
                <select
                  id="reminder-frequency"
                  value={editForm.frequency}
                  onChange={(event) => handleFrequencyChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {editForm.frequency === "once" && (
                <div>
                  <label htmlFor="reminder-once-date" className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    id="reminder-once-date"
                    type="date"
                    value={editForm.date}
                    onChange={(event) => setEditForm((previous) => ({ ...previous, date: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              )}

              {editForm.frequency === "weekly" && (
                <div>
                  <p className="block text-sm font-medium text-gray-700">Days of week</p>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {weekDayOptions.map((dayOption) => {
                      const isSelected = editForm.daysOfWeek.includes(dayOption.value);

                      return (
                        <label
                          key={dayOption.value}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition cursor-pointer ${isSelected ? "border-[#0C5BD5] bg-[#EAF2FF] text-[#12459A]" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleWeeklyDay(dayOption.value)}
                            className="h-4 w-4 rounded border-gray-300 text-[#0C5BD5] focus:ring-[#0C5BD5]"
                          />
                          {dayOption.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {editForm.frequency === "specific" && (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="block text-sm font-medium text-gray-700">Specific dates</p>
                    <button
                      type="button"
                      onClick={addSpecificDateInput}
                      className="rounded-lg border border-[#C4D7FF] bg-[#EAF2FF] px-3 py-1.5 text-xs font-semibold text-[#12459A]"
                    >
                      + Add Date
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {editForm.specificDates.length === 0 ? (
                      <span className="text-xs text-gray-500">No dates selected yet. Click Add Date to open calendar picker.</span>
                    ) : (
                      editForm.specificDates.map((dateValue, index) => (
                        <div
                          key={`${dateValue || "empty"}-${index}`}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="date"
                            value={dateValue}
                            onChange={(event) => updateSpecificDate(index, event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeSpecificDate(index)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {editForm.specificDates.filter(Boolean).length === 0 ? (
                      <span className="text-xs text-gray-500">Selected dates will appear here.</span>
                    ) : (
                      editForm.specificDates.filter(Boolean).map((dateValue) => (
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
                onClick={closeEditModal}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusyAction(editingReminderId, "edit")}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0C5BD5] text-white hover:bg-[#0A4AB0] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBusyAction(editingReminderId, "edit") ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isReviewModalOpen && (
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
                onClick={() => setIsReviewModalOpen(false)}
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
                      {rem.isDuplicate && (
                        <div className="sm:col-span-12 mb-1 p-3 rounded-xl bg-red-100/80 border border-red-300 text-red-900 text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span><strong>{rem.duplicateMessage || "Duplicate Detected:"}</strong> Re-uploading may create a duplicate. You can remove or adjust this before saving.</span>
                          </div>
                        </div>
                      )}

                      <div className="sm:col-span-5">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                          Medication Title
                        </label>
                        <input
                          type="text"
                          value={rem.title || ""}
                          onChange={(e) => updateReviewReminder(idx, "title", e.target.value)}
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
                          onChange={(e) => updateReviewReminder(idx, "time", e.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-[#0C5BD5] focus:ring-2 focus:ring-[#C4D7FF] transition"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                          Frequency
                        </label>
                        <select
                          value={rem.frequency || "daily"}
                          onChange={(e) => updateReviewReminder(idx, "frequency", e.target.value)}
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
                          onClick={() => removeReviewReminder(idx)}
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
                          onChange={(e) => updateReviewReminder(idx, "instruction", e.target.value)}
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
                          onChange={(e) => updateReviewReminder(idx, "durationDays", Number(e.target.value) || 0)}
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
                onClick={addReviewReminder}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-[#C4D7FF] bg-[#EEF4FF]/50 hover:bg-[#EEF4FF] text-[#12459A] font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                <span className="text-lg leading-none">+</span>
                Add Another Medication
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                disabled={isSavingReview}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
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
      )}
    </div>
  );
};

export default RemindersPage;
