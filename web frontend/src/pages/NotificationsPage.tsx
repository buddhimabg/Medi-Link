import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import StatsCard from "../components/StatsCard";
import { fetchReminders, deleteReminder } from "../api/reminderApi";
import { getCurrentUserId } from "../config";
import { getTodayReminders, normalizeReminderFrequency, toReminderDateTime } from "../utils/reminderSchedule";

type Reminder = {
  _id: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  frequency?: string;
  daysOfWeek?: number[];
  specificDates?: string[];
  customDates?: string[];
  timezone?: string;
  isActive?: boolean;
  dateTime?: string;
};

// Icon components for stats
const TotalRemindersIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 text-[#0C5BD5] relative z-10 ${className}`} aria-hidden="true">
    <path d="M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 3v4M16 3v4M8 11h8M8 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const ActiveIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 text-emerald-600 relative z-10 ${className}`} aria-hidden="true">
    <path d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InactiveIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 text-gray-600 relative z-10 ${className}`} aria-hidden="true">
    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NotificationsPage: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState({ active: 0, inactive: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadReminders = async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = getCurrentUserId();
      const res = await fetchReminders(userId);
      
      // Extract reminders from nested API response structure
      let loadedReminders = [];
      if (res?.reminders && Array.isArray(res.reminders)) {
        // API returns {reminders: [...], count: N}
        loadedReminders = res.reminders;
      } else if (res?.data?.reminders && Array.isArray(res.data.reminders)) {
        loadedReminders = res.data.reminders;
      } else if (Array.isArray(res?.data)) {
        loadedReminders = res.data;
      } else if (Array.isArray(res)) {
        loadedReminders = res;
      }
      
      if (!Array.isArray(loadedReminders)) {
        loadedReminders = [];
      }
      
      const todayReminders = getTodayReminders(loadedReminders);

      const transformedReminders = todayReminders.map((r) => {
        if (!r || !r._id) {
          return null;
        }

        return {
          ...r,
          _id: r._id,
          title: r.title || "Untitled",
          description: r.description,
          dateTime: toReminderDateTime(r),
          frequency: normalizeReminderFrequency(r.frequency),
          isActive: r.isActive !== false,
        };
      }).filter(Boolean) as Reminder[];

      const now = new Date();
      const dueTodayReminders = transformedReminders
        .filter((r) => {
          const reminderTime = new Date(r.dateTime || "");
          if (Number.isNaN(reminderTime.getTime())) {
            return false;
          }
          return reminderTime <= now;
        })
        .sort((a, b) => new Date(b.dateTime || "").getTime() - new Date(a.dateTime || "").getTime());

      setReminders(dueTodayReminders);
      setStats({
        active: dueTodayReminders.filter((r) => r.isActive).length,
        inactive: dueTodayReminders.filter((r) => !r.isActive).length,
      });

      if (dueTodayReminders.length === 0) {
        setError("No due reminders for now.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Unable to load reminders: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();

    const refreshReminders = () => {
      loadReminders();
    };

    const intervalId = window.setInterval(refreshReminders, 15000);
    window.addEventListener("focus", refreshReminders);
    document.addEventListener("visibilitychange", refreshReminders);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshReminders);
      document.removeEventListener("visibilitychange", refreshReminders);
    };
  }, []);

  const handleDeleteReminder = async (reminderId: string) => {
    setDeletingId(reminderId);
    setDeleteError(null);
    try {
      const userId = getCurrentUserId();
      await deleteReminder(reminderId, userId);
      // Remove from list on success
      setReminders((prev) => {
        const nextReminders = prev.filter((r) => r._id !== reminderId);
        setStats({
          active: nextReminders.filter((r) => r.isActive).length,
          inactive: nextReminders.filter((r) => !r.isActive).length,
        });
        return nextReminders;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete reminder";
      setDeleteError(errorMessage);
    } finally {
      setDeletingId(null);
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
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activePage="Notifications" />
      
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
              value={reminders.length}
              icon={TotalRemindersIcon}
            />
            <StatsCard
              title="Active"
              value={stats.active}
              icon={ActiveIcon}
            />
            <StatsCard
              title="Inactive"
              value={stats.inactive}
              icon={InactiveIcon}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800">{error}</p>
            </div>
          )}

          {/* Delete Error Message */}
          {deleteError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{deleteError}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading reminders...</p>
            </div>
          )}

          {/* Reminders List */}
          {!loading && reminders.length > 0 && (
            <div className="space-y-4">
              {reminders.map((r) => (
                <div
                  key={r._id}
                  className="bg-blue-50 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
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
                          {formatDate(r.dateTime)}
                        </span>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                          {r.frequency}
                        </span>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          r.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {r.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteReminder(r._id)}
                      disabled={deletingId === r._id}
                      className={`ml-4 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        deletingId === r._id
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200"
                      }`}
                    >
                      {deletingId === r._id ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Deleting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && reminders.length === 0 && !error && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No reminders</h3>
              <p className="mt-2 text-gray-600">Create your first reminder from the Reminders page to get started</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;
