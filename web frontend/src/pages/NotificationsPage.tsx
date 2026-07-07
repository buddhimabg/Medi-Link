import React, { useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import StatsCard from "../components/StatsCard";
import { fetchReminders, updateReminder } from "../api/reminderApi";
import { getCurrentUserId } from "../config";
import useReminderAutoRefresh from "../hooks/useReminderAutoRefresh";
import {
  getDueReminders,
  getReminderDateTime,
  getNextReminderOccurrence,
  getTodayReminders,
  isReminderOffToday,
} from "../utils/reminderHelpers";
import { formatDateYMDInTimeZone, getTodayYmdLocal } from "../utils/reminderSchedule";
import { useNavigate } from "react-router-dom";
import { PageLoadingSpinner, EmptyState } from "../components/ui";

type Reminder = {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  date?: string;
  time?: string;
  frequency?: string;
  daysOfWeek?: number[];
  specificDates?: string[];
  customDates?: string[];
  timezone?: string;
  isActive?: boolean;
  disabledToday?: boolean;
  isDisabledToday?: boolean;
  status?: string;
  disabledDates?: string[];
  snoozedUntil?: string | null;
  completionHistory?: any[];
};

type NotificationReminder = Reminder & {
  dueAt: string;
  statusLabel: string;
  isOverdue: boolean;
};

const extractReminderList = (response: any): Reminder[] => {
  if (Array.isArray(response?.reminders)) {
    return response.reminders;
  }

  if (Array.isArray(response?.data?.reminders)) {
    return response.data.reminders;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const buildDueNotifications = (loadedReminders: Reminder[]): NotificationReminder[] => {
  const now = new Date();

  return getDueReminders(loadedReminders, now)
    .map((reminder) => {
      const dueDate = getReminderDateTime(reminder, now) || new Date(now);
      const isOverdue = dueDate.getTime() < now.getTime();

      return {
        ...reminder,
        title: reminder.title || "Untitled",
        dueAt: dueDate.toISOString(),
        statusLabel: isOverdue ? "Ready when you are" : "Gentle reminder",
        isOverdue,
      };
    })
    .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
};

// Icon components for stats
const TotalRemindersIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 text-[#0C5BD5] relative z-10 ${className}`} aria-hidden="true">
    <path d="M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 3v4M16 3v4M8 11h8M8 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const OffTodayIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 text-emerald-600 relative z-10 ${className}`} aria-hidden="true">
    <path d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FutureIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 text-amber-600 relative z-10 ${className}`} aria-hidden="true">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NotificationsPage: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [reminders, setReminders] = useState<NotificationReminder[]>([]);
  const [stats, setStats] = useState({ total: 0, offToday: 0, future: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyReminderId, setBusyReminderId] = useState<string | null>(null);
  const lastLoadedDayRef = useRef(getTodayYmdLocal());
  const notifiedReminderIdsRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const loadReminders = async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = getCurrentUserId();
      const res = await fetchReminders(userId);
      const loadedReminders = extractReminderList(res);
      const dueTodayReminders = buildDueNotifications(loadedReminders);
      const now = new Date();
      const todayKey = getTodayYmdLocal();

      if (lastLoadedDayRef.current !== todayKey) {
        lastLoadedDayRef.current = todayKey;
      }

      setReminders(dueTodayReminders);

      // Trigger native browser notifications for newly due/overdue reminders
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        dueTodayReminders.forEach((reminder) => {
          if (!notifiedReminderIdsRef.current.has(reminder._id)) {
            new Notification(`Gentle reminder: ${reminder.title}`, {
              body: reminder.description || "Time for your self-care check-in.",
            });
            notifiedReminderIdsRef.current.add(reminder._id);
          }
        });

        // Clean up notified set for reminders that are no longer in the active due list
        const currentDueIds = new Set(dueTodayReminders.map(r => r._id));
        notifiedReminderIdsRef.current.forEach((id) => {
          if (!currentDueIds.has(id)) {
            notifiedReminderIdsRef.current.delete(id);
          }
        });
      }

      setStats({
        total: loadedReminders.length,
        offToday: getTodayReminders(loadedReminders, now).filter((reminder) => isReminderOffToday(reminder, now)).length,
        future: getTodayReminders(loadedReminders, now).filter((reminder) => {
          const nextOccurrence = getNextReminderOccurrence(reminder, now);
          return Boolean(nextOccurrence && nextOccurrence.getTime() > now.getTime());
        }).length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Unable to load reminders: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useReminderAutoRefresh(loadReminders, {
    intervalMs: 300000,
    refreshOnFocus: true,
    refreshOnVisibility: true,
    refreshOnMidnight: true,
    initialRefresh: true,
  });

  const visibleReminders = useMemo(
    () => reminders,
    [reminders]
  );

  const handleMarkDoneToday = async (reminder: NotificationReminder) => {
    if (!reminder._id) {
      return;
    }

    setBusyReminderId(reminder._id);

    try {
      const userId = getCurrentUserId();
      const timeZone = reminder.timezone || "Asia/Colombo";
      const todayDate = formatDateYMDInTimeZone(new Date(), timeZone);
      const disabledDates = Array.isArray(reminder.disabledDates)
        ? reminder.disabledDates.map((value: string) => String(value).trim()).filter(Boolean)
        : [];
      const nextDisabledDates = Array.from(new Set([...disabledDates, todayDate]));

      const nextHistory = [
        ...(reminder.completionHistory || []),
        {
          date: todayDate,
          status: "completed",
          notes: "Marked done today",
          createdAt: new Date().toISOString(),
        },
      ];

      await updateReminder(
        reminder._id,
        {
          disabledDates: nextDisabledDates,
          isDisabledToday: true,
          snoozedUntil: null,
          completionHistory: nextHistory,
        },
        userId
      );

      await loadReminders();
    } catch (requestError) {
      const errorMessage = requestError instanceof Error ? requestError.message : "Unable to mark reminder done for today.";
      setError(errorMessage);
    } finally {
      setBusyReminderId(null);
    }
  };

  const handleSnooze = async (reminder: NotificationReminder, option: string) => {
    if (!reminder._id) {
      return;
    }

    setBusyReminderId(reminder._id);
    setError(null);

    try {
      const userId = getCurrentUserId();
      const timeZone = reminder.timezone || "Asia/Colombo";
      const todayDate = formatDateYMDInTimeZone(new Date(), timeZone);

      let payload: any = {};

      if (option === "15" || option === "60") {
        const snoozeMinutes = Number(option);
        const snoozeTime = new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString();
        const nextHistory = [
          ...(reminder.completionHistory || []),
          {
            date: todayDate,
            status: "snoozed",
            notes: `Snoozed for ${snoozeMinutes} minutes`,
            createdAt: new Date().toISOString(),
          },
        ];

        payload = {
          snoozedUntil: snoozeTime,
          completionHistory: nextHistory,
        };
      } else if (option === "tomorrow") {
        const disabledDates = Array.isArray(reminder.disabledDates)
          ? reminder.disabledDates.map((value: string) => String(value).trim()).filter(Boolean)
          : [];
        const nextDisabledDates = Array.from(new Set([...disabledDates, todayDate]));
        const nextHistory = [
          ...(reminder.completionHistory || []),
          {
            date: todayDate,
            status: "skipped",
            notes: "Skipped today (Snoozed until tomorrow)",
            createdAt: new Date().toISOString(),
          },
        ];

        payload = {
          disabledDates: nextDisabledDates,
          isDisabledToday: true,
          snoozedUntil: null,
          completionHistory: nextHistory,
        };
      }

      await updateReminder(reminder._id, payload, userId);
      await loadReminders();
    } catch (requestError) {
      const errorMessage = requestError instanceof Error ? requestError.message : "Unable to snooze reminder.";
      setError(errorMessage);
    } finally {
      setBusyReminderId(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activePage="Notifications"
        pendingRemindersCount={visibleReminders.length}
        unreadNotificationsCount={visibleReminders.length}
      />

      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
            <p className="text-gray-600 mt-1">View and manage your reminders</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatsCard
              title="Total Reminders"
              value={stats.total}
              icon={TotalRemindersIcon}
            />
            <StatsCard
              title="Off Today"
              value={stats.offToday}
              icon={OffTodayIcon}
            />
            <StatsCard
              title="Next Occurrence"
              value={stats.future}
              icon={FutureIcon}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-12">
              <PageLoadingSpinner message="Loading notifications…" fullHeight={false} />
            </div>
          )}

          {/* Reminders List */}
          {!loading && visibleReminders.length > 0 && (
            <div className="space-y-4">
              {visibleReminders.map((r) => (
                <div
                  key={r._id}
                  className={`rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border ${r.isOverdue ? "bg-blue-50/50 border-blue-100" : "bg-blue-50/50 border-blue-100"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">{r.title}</h3>
                      {r.description && (
                        <p className="text-gray-600 mt-1">{r.description}</p>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(r.dueAt)}
                        </span>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                          {String(r.category || "reminder")}
                        </span>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${r.isOverdue
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                          }`}>
                          {r.statusLabel}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => void handleMarkDoneToday(r)}
                        disabled={busyReminderId === r._id}
                        className="px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyReminderId === r._id ? "Saving..." : "Mark done today"}
                      </button>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            handleSnooze(r, val);
                            e.target.value = "";
                          }
                        }}
                        disabled={busyReminderId === r._id}
                        className="px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Snooze...</option>
                        <option value="15">Snooze 15 min</option>
                        <option value="60">Snooze 1 hour</option>
                        <option value="tomorrow">Snooze until tomorrow</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => navigate("/reminders")}
                        className="px-3 py-2 rounded-lg text-sm font-medium transition-all bg-[#0C5BD5] text-white hover:bg-[#0A4AB0]"
                      >
                        Open reminders
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && visibleReminders.length === 0 && !error && (
            <div className="bg-white rounded-lg border border-gray-200">
              <EmptyState title="No reminders" description="There are no reminders due right now." />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;
