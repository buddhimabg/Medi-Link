// @ts-nocheck
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./MoodHistory.css";
import StatsCard from "../components/StatsCard";
import { PageLoadingSpinner, PageErrorState, EmptyState } from "../components/ui";
import AverageIcon from "../assets/AverageIcon";
import HistoryIcon from "../assets/HistoryIcon";
import InsightIcon from "../assets/InsightIcon";
import { useMoodHistoryData } from "../hooks/useMood";
import { moodMap } from "../constants/moodMap";
// Calculation code kept only in backend - frontend uses backend-calculated values

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const moodVisual = {
  great: { color: "#86D39A", label: "Great" },
  good: { color: "#8EC5FF", label: "Good" },
  okay: { color: "#F3D36B", label: "Okay" },
  sad: { color: "#F6B26B", label: "Sad" },
  terrible: { color: "#F39CA0", label: "Terrible" },
};

const factorVisual = {
  sleep: "#5B8DEF",
  anxiety: "#EF6B73",
  energy: "#57C785",
  stress: "#F4A261",
  focus: "#A78BFA",
  motivation: "#A78BFA",
  social: "#8EC5FF",
};

const getDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

// Simple helper to average backend-calculated scores (no formula duplication)
// Backend calculates mentalHealthScore, frontend just averages them for UI display
const averageStoredScores = (moods) => {
  if (!moods || !moods.length) return 0;
  const scores = moods.map((m) => Number(m.mentalHealthScore) || 0).filter((s) => s > 0);
  if (!scores.length) return 0;
  return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
};

const formatDateLong = (dateKey) => {
  if (!dateKey) return "Select a date";
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (isoDate) => {
  const d = new Date(isoDate);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const formatPct = (value) => {
  const n = Number(value || 0);
  if (n > 0) return `+${n}%`;
  return `${n}%`;
};

const clampPct = (value) => {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.abs(Math.round(n))));
};

const getFactorKey = (label) => {
  const key = String(label || "").toLowerCase();
  if (key.includes("sleep")) return "sleep";
  if (key.includes("anxiety")) return "anxiety";
  if (key.includes("energy")) return "energy";
  if (key.includes("stress")) return "stress";
  if (key.includes("focus")) return "focus";
  if (key.includes("motivation")) return "motivation";
  if (key.includes("social")) return "social";
  return "focus";
};

const MoodHistory = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState("chart"); // "chart" or "calendar"
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { moodHistoryData, moodHistoryLoading, moodHistoryError } = useMoodHistoryData();
  const entries = moodHistoryData?.entries || [];
  const insights = moodHistoryData?.insights;

  const groupedByDate = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      const key = getDateKey(entry.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    });
    return map;
  }, [entries]);

  const latestDateWithData = useMemo(() => {
    const dates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
    return dates[0] || "";
  }, [groupedByDate]);

  const [selectedDate, setSelectedDate] = useState("");

  const effectiveSelectedDate = selectedDate || latestDateWithData;
  const selectedEntries = groupedByDate[effectiveSelectedDate] || [];

  const monthData = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startOffset; i++) {
      days.push({ key: `pad-${i}`, empty: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = getDateKey(date);
      const items = groupedByDate[key] || [];
      const avgMood = items.length > 0 ? averageStoredScores(items) : 0;  // Use backend-calculated scores

      days.push({
        key,
        empty: false,
        day,
        dateKey: key,
        entriesCount: items.length,
        avgMood,
      });
    }

    return { days, monthLabel: visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
  }, [visibleMonth, groupedByDate]);

  // Calculate 7-day entries count - MUST be before early returns
  const last7DaysEntries = useMemo(() => {
    const last7Days = new Date();
    last7Days.setHours(0, 0, 0, 0);
    last7Days.setDate(last7Days.getDate() - 6);
    
    return entries.filter((m) => {
      const d = new Date(m.createdAt);
      return d >= last7Days && d <= new Date(last7Days.getTime() + 7 * 86400000);
    });
  }, [entries]);

  if (moodHistoryLoading) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
          <PageLoadingSpinner message="Loading mood history…" />
        </main>
      </div>
    );
  }

  if (moodHistoryError) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
          <PageErrorState message="We couldn't load your mood history. Please try again." />
        </main>
      </div>
    );
  }

  const weeklySummary = insights?.weeklySummary;
  const recovery = insights?.recoveryProgress;
  const moodDistribution = insights?.moodDistribution || {};
  const totalDistribution = Object.values(moodDistribution).reduce((sum, n) => sum + n, 0);
  
  // 7-day average: Backend calculates and returns in insights (no frontend recalculation!)
  const sevenDayAverageScore = weeklySummary?.averageMoodScore ?? 0;
  const recoveryMetrics = [
    { key: "Sleep Quality", value: recovery?.sleepQualityIncreasePct, factor: "sleep" },
    { key: "Anxiety Level", value: recovery?.anxietyLevelDecreasePct, factor: "anxiety" },
    { key: "Stress Level", value: recovery?.stressLevelDecreasePct, factor: "stress" },
    { key: "Energy Level", value: recovery?.energyLevelIncreasePct, factor: "energy" },
    { key: "Motivation", value: recovery?.motivationLevelIncreasePct, factor: "motivation" },
    { key: "Focus Level", value: recovery?.focusLevelIncreasePct, factor: "focus" },
    { key: "Social Interaction", value: recovery?.socialInteractionIncreasePct, factor: "social" },
  ];

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Mood History</h1>
            <p className="text-gray-500 mt-1">Weekly analytics and full check-in calendar for Mood Track</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-white text-[#0C5BD5] px-5 py-2.5 rounded-xl border border-[#0C5BD5]/20 hover:bg-[#EAF1FF]"
            >
              Back to Mood Track Dashboard
            </button>
            <button
              onClick={() => navigate("/check-in")}
              className="bg-[#0C5BD5] text-white px-5 py-2.5 rounded-xl hover:bg-[#0A4AB0]"
            >
              New Check-in
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setViewMode("chart")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === "chart"
                ? "bg-[#0C5BD5] text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Chart View
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-[#0C5BD5] text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Calendar View
          </button>
        </div>

        {viewMode === "chart" && (
          <>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            icon={AverageIcon}
            title="7-Day Average"
            value={`${sevenDayAverageScore}/10`}
          />
          <StatsCard
            icon={HistoryIcon}
            title="Check-ins (7d)"
            value={last7DaysEntries.length}
          />
          <StatsCard
            icon={InsightIcon}
            title="Best Day"
            value={weeklySummary?.bestDay?.day || "-"}
          />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Mood Score Trend View</h2>
            <p className="text-sm text-gray-500">Past 7 days</p>
          </div>

          <div className="grid grid-cols-7 gap-3 items-end min-h-[180px]">
            {(!weeklySummary?.dailyMoodAverages || weeklySummary.dailyMoodAverages.length === 0) ? (
              <div className="col-span-7 flex justify-center py-6">
                <EmptyState title="No mood data available for this week" />
              </div>
            ) : (
              weeklySummary.dailyMoodAverages.map((item) => (
                <div key={item.date} className="flex flex-col items-center">
                  <div className="w-full max-w-[42px] h-[120px] bg-[#E9F0FB] rounded-xl relative overflow-hidden">
                    <div
                      className="absolute left-0 bottom-0 w-full rounded-xl transition-all duration-500"
                      style={{
                        height: `${Math.max(4, (item.averageMoodScore / 10) * 100)}%`,
                        background: "linear-gradient(180deg, #0C5BD9 0%, #0A4AB0 100%)",
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{item.day}</p>
                  <p className="text-xs text-gray-700 font-medium">{item.averageMoodScore}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Recovery Progress</h2>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex items-center justify-between p-3 bg-[#EAF1FF] rounded-lg border border-[#CFE0FF]">
                <span className="text-gray-700 font-medium">Overall Recovery Score</span>
                <span className="font-bold text-[#0C5BD5]">{recovery?.currentAverages?.overallRecovery ?? 0}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Overall Change</span>
                <span className="font-semibold text-gray-900">{formatPct(recovery?.overallRecoveryChangePct)}</span>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              {recoveryMetrics.map((metric) => {
                const pct = clampPct(metric.value);
                return (
                  <div key={metric.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600">{metric.key}</span>
                      <span className="font-semibold text-[#0C5BD5]">{formatPct(metric.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#E9F0FB] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: factorVisual[metric.factor] || "#5B8DEF" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Mood Distribution</h2>
            <div className="space-y-3">
              {["great", "good", "okay", "sad", "terrible"].map((key) => {
                const count = moodDistribution[key] || 0;
                const pct = totalDistribution ? Math.round((count / totalDistribution) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">
                        {moodVisual[key].label}
                      </span>
                      <span className="text-[#0C5BD5] font-semibold">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#E9F0FB] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: moodVisual[key]?.color || "#8EC5FF" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
          </>
        )}

        {viewMode === "calendar" && (
          <>
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Calendar View</h2>
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-[#f8fafc] p-1">
                <button
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                    )
                  }
                  className="h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-[#eaf1ff] hover:text-[#0C5BD5] transition"
                  aria-label="Previous month"
                >
                  <span className="text-base">&#8249;</span>
                </button>
                <p className="min-w-[170px] text-center text-sm font-semibold text-gray-700 px-2">{monthData.monthLabel}</p>
                <button
                  onClick={() =>
                    setVisibleMonth(
                      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                    )
                  }
                  className="h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-[#eaf1ff] hover:text-[#0C5BD5] transition"
                  aria-label="Next month"
                >
                  <span className="text-base">&#8250;</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="text-xs font-semibold text-gray-500 text-center py-2">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthData.days.map((cell) => {
                if (cell.empty) {
                  return <div key={cell.key} className="h-20 rounded-lg bg-gray-50" />;
                }

                const isSelected = effectiveSelectedDate === cell.dateKey;
                const hasData = cell.entriesCount > 0;
                return (
                  <button
                    key={cell.key}
                    onClick={() => setSelectedDate(cell.dateKey)}
                    className={`h-20 rounded-lg border p-2 text-left transition ${
                      isSelected
                        ? "border-[#0C5BD5] bg-[#0C5BD5]/10"
                        : hasData
                        ? "border-blue-100 bg-blue-50/40 hover:border-blue-300"
                        : "border-gray-100 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-700">{cell.day}</div>
                    {hasData && (
                      <>
                        <div className="text-[11px] text-gray-500 mt-1">{cell.entriesCount} check-ins</div>
                        <div className="text-[11px] font-semibold text-[#0C5BD5]">Avg {cell.avgMood.toFixed(1)}</div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Selected Date</h3>
            <p className="text-base font-semibold text-gray-900 mb-4">{formatDateLong(effectiveSelectedDate)}</p>

            {!selectedEntries.length && (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                No check-ins for this day.
              </div>
            )}

            {!!selectedEntries.length && (
              <div className="space-y-2 max-h-[430px] overflow-auto pr-1">
                {selectedEntries.map((entry) => {
                  const visual = moodVisual[entry.mood] || moodVisual.okay;
                  return (
                    <div
                      key={entry._id}
                      className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: visual.color }}>
                          {visual.label}
                        </p>
                        <p className="text-xs text-gray-500">{entry.note || "No note"}</p>
                      </div>
                      <p className="text-xs text-gray-500">{formatTime(entry.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MoodHistory;
