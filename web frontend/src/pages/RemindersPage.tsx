// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import StatsCard from "../components/StatsCard";
import { getCurrentUserId } from "../config";
import {
  createReminder,
  deleteReminder,
  fetchReminders,
  updateReminder,
} from "../api/reminderApi";
import {
  formatDateYMDInTimeZone,
  getTodayReminders,
  getTodayYmdLocal,
  normalizeDateString,
  normalizeReminderFrequency,
} from "../utils/reminderSchedule";

interface CategoryMeta {
  label: string;
  iconClass: string;
  icon: string;
}

interface Reminder {
  _id: string;
  title: string;
  description?: string;
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

const isReminderOffToday = (reminder) => {
  return Boolean(reminder?.disabledToday || reminder?.isDisabledToday || reminder?.status === "skipped");
};

const getNormalizedDateList = (values, timeZone = "Asia/Colombo") => {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => normalizeDateString(value, timeZone))
        .filter(Boolean)
    )
  ).sort();
};

const getInitialReminderForm = () => ({
  title: "",
  description: "",
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

const PendingIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
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
  const [reminders, setReminders] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(getInitialReminderForm);
  const [editingReminderId, setEditingReminderId] = useState("");
  const [editForm, setEditForm] = useState(getInitialReminderForm);

  const userId = getCurrentUserId();

  const loadReminders = async () => {
    try {
      setError("");
      const data = await fetchReminders(userId);
      setReminders(data?.reminders || []);
    } catch (requestError) {
      setError(requestError.message || "Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  useEffect(() => {
    const refreshReminders = () => {
      loadReminders();
    };

    const intervalId = window.setInterval(refreshReminders, 30000);
    window.addEventListener("focus", refreshReminders);
    document.addEventListener("visibilitychange", refreshReminders);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshReminders);
      document.removeEventListener("visibilitychange", refreshReminders);
    };
  }, [userId]);

  const todayReminders = useMemo(() => getTodayReminders(reminders), [reminders]);

  const counts = useMemo(() => {
    const pending = todayReminders.filter((item) => item.status === "pending" && !isReminderOffToday(item)).length;
    const completed = todayReminders.filter((item) => item.status === "completed").length;
    const offToday = todayReminders.filter((item) => isReminderOffToday(item)).length;

    return {
      total: todayReminders.length,
      pending,
      completed,
      offToday,
    };
  }, [todayReminders]);

  const updateReminderStatus = (reminderId, status) => {
    setReminders((previous) => previous.map((item) => {
      if (String(item._id) !== String(reminderId)) {
        return item;
      }

      return {
        ...item,
        status,
      };
    }));
  };

  const updateReminderDetails = (reminderId, changes) => {
    setReminders((previous) => previous.map((item) => {
      if (String(item._id) !== String(reminderId)) {
        return item;
      }

      return {
        ...item,
        ...changes,
      };
    }));
  };

  const removeReminderById = (reminderId) => {
    setReminders((previous) => previous.filter((item) => String(item._id) !== String(reminderId)));
  };

  const startBusyAction = (reminderId, actionName) => {
    setBusyActionKey(`${String(reminderId)}:${actionName}`);
  };

  const clearBusyAction = () => {
    setBusyActionKey("");
  };

  const isBusyAction = (reminderId, actionName) => busyActionKey === `${String(reminderId)}:${actionName}`;

  const openEditModal = (reminder) => {
    const reminderTimeZone = reminder.timezone || "Asia/Colombo";
    const normalizedFrequency = normalizeReminderFrequency(reminder.frequency);
    const prefilledSpecificDates = getNormalizedDateList(
      Array.isArray(reminder.specificDates)
        ? reminder.specificDates
        : reminder.customDates,
      reminderTimeZone
    );
    const prefilledDate = normalizeDateString(reminder.date, reminderTimeZone)
      || prefilledSpecificDates[0]
      || formatDateYMDInTimeZone(new Date(), reminderTimeZone);
    const prefilledDays = Array.from(
      new Set(
        (Array.isArray(reminder.daysOfWeek) ? reminder.daysOfWeek : [])
          .map((dayValue) => Number(dayValue))
          .filter((dayValue) => Number.isInteger(dayValue) && dayValue >= 0 && dayValue <= 6)
      )
    ).sort((firstDay, secondDay) => firstDay - secondDay);

    setEditingReminderId(String(reminder._id));
    setEditForm({
      title: reminder.title || "",
      description: reminder.description || "",
      category: reminder.category || "mood",
      time: reminder.time || "08:00",
      frequency: normalizedFrequency,
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
      const response = await createReminder(payload, userId);
      const createdReminder = response?.reminder;
      if (createdReminder) {
        setReminders((previous) => [createdReminder, ...previous]);
      } else {
        loadReminders();
      }
      closeCreateModal();
      setActionMessage("Reminder created.");
    } catch (requestError) {
      setActionError(requestError.message || "Unable to create reminder.");
    } finally {
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
      const response = await updateReminder(
        reminderId,
        {
          disabledDates: nextDisabledDates,
        },
        userId
      );

      updateReminderDetails(reminderId, {
        disabledDates: response?.reminder?.disabledDates ?? nextDisabledDates,
        disabledToday: shouldDisableToday,
      });
      setActionMessage(shouldDisableToday ? "Reminder turned off for today." : "Reminder turned on for today.");
    } catch (requestError) {
      setActionError(requestError.message || "Unable to update reminder.");
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

  const handleDeleteReminder = async (reminder) => {
    const reminderId = reminder?._id;
    if (!reminderId) {
      return;
    }

    const confirmed = window.confirm("Delete this reminder?");
    if (!confirmed) {
      return;
    }

    setActionError("");
    setActionMessage("");
    startBusyAction(reminderId, "delete");

    try {
      await deleteReminder(reminderId, userId);
      removeReminderById(reminderId);
      setActionMessage("Reminder deleted.");
    } catch (requestError) {
      setActionError(requestError.message || "Unable to delete reminder.");
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
      const response = await updateReminder(
        editingReminderId,
        updatePayload,
        userId
      );

      const nextReminder = response?.reminder;
      updateReminderDetails(editingReminderId, {
        title: nextReminder?.title ?? editForm.title,
        description: nextReminder?.description ?? editForm.description,
        time: nextReminder?.time ?? editForm.time,
        frequency: nextReminder?.frequency ?? editForm.frequency,
        date: nextReminder?.date ?? (editForm.frequency === "once" ? editForm.date : null),
        daysOfWeek: nextReminder?.daysOfWeek ?? (editForm.frequency === "weekly" ? editForm.daysOfWeek : []),
        specificDates: nextReminder?.specificDates ?? (editForm.frequency === "specific" ? selectedSpecificDates : []),
      });

      closeEditModal();
      setActionMessage("Reminder updated.");
    } catch (requestError) {
      setActionError(requestError.message || "Unable to update reminder.");
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
      <Sidebar activePage="Reminders" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div>
          <div className="mb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Reminder & Tracking</h1>
                <p className="text-gray-500 mt-1">Manage reminders directly from the database-backed screen.</p>
              </div>
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

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <StatsCard icon={TotalRemindersIcon} title="Total Reminders" value={counts.total} />
            <StatsCard icon={PendingIcon} title="Pending" value={counts.pending} />
            <StatsCard icon={OffTodayIcon} title="Off Today" value={counts.offToday} />
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {actionMessage && !actionError && (
            <div className="mb-4 bg-[#EEF4FF] border border-[#CFE0FF] rounded-lg p-3 text-sm text-[#12459A]">
              {actionMessage}
            </div>
          )}

          {actionError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          <section className="space-y-6">
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500 shadow-sm">
                Loading reminders...
              </div>
            ) : reminders.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 shadow-sm">
                No reminders yet.
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
                          const isPending = reminder.status === "pending";
                          const isDisabledToday = Boolean(reminder.disabledToday) || Boolean(reminder.isDisabledToday) || reminder.status === "skipped";
                          const isInactive = !reminder.isActive;
                          const isRowBusy = isToggleBusy || isDeleteBusy || isEditBusy;

                          const cardStateClass = isDisabledToday
                            ? "bg-[#F8FAFD] border-gray-800 shadow-sm opacity-85"
                            : isInactive
                              ? "bg-white border-gray-200 shadow-sm opacity-90"
                              : "bg-white border-gray-100 shadow-sm hover:shadow-md";

                          const statusLabel = isDisabledToday ? "Off Today" : isInactive ? "Paused" : "Pending";
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
                                  <div className="flex flex-wrap items-center gap-3 mt-2.5">
                                    <span className={`inline-flex items-center gap-2 font-semibold text-sm ${isDisabledToday ? "text-slate-500" : "text-[#0C5BD5]"}`}>
                                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                      {formatTime(reminder.time)}
                                    </span>
                                    <span className={`text-sm ${isDisabledToday ? "text-slate-500" : "text-gray-700"}`}>{formatLabel(reminder.frequency)}</span>
                                    {isPending && !isDisabledToday && (
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
                                    onClick={() => handleDeleteReminder(reminder)}
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
    </div>
  );
};

export default RemindersPage;
