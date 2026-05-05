// @ts-nocheck
import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./MoodFixActivityDetail.css";
import { fetchMoodFixActivities, saveMoodAfterFeedback } from "../api/moodApi";
import { getCurrentUserId } from "../config";

const parseDurationMin = (value) => {
  const n = Number(String(value || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 5;
};

const scoreToMoodLabel = (value) => {
  if (value <= 2) return "Terrible";
  if (value <= 4) return "Sad";
  if (value <= 6) return "Okay";
  if (value <= 8) return "Good";
  return "Great";
};

const formatTimer = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const MoodFixActivityDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activityId } = useParams();
  const [collapsed, setCollapsed] = useState(false);
  const [savingError, setSavingError] = useState("");
  const [moodAfter, setMoodAfter] = useState(6);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedDurationSeconds, setCompletedDurationSeconds] = useState(null);
  const [catalogActivities, setCatalogActivities] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const activity = useMemo(
    () => catalogActivities.find((item) => item.id === activityId) || null,
    [activityId, catalogActivities]
  );

  const [stepStatus, setStepStatus] = useState(() =>
    activity ? activity.steps.map(() => false) : []
  );
  const [completedAt, setCompletedAt] = useState(null);
  const [notice, setNotice] = useState("");
  const estimatedMin = parseDurationMin(activity?.duration);

  useEffect(() => {
    setStepStatus(activity ? activity.steps.map(() => false) : []);
  }, [activity]);

  useEffect(() => {
    let mounted = true;

    const loadCatalog = async () => {
      try {
        setCatalogLoading(true);
        setSavingError("");
        const response = await fetchMoodFixActivities();
        const data = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];

        if (mounted) {
          setCatalogActivities(
            data.map((item) => ({
              id: item.activityId || item.id || item._id,
              title: item.title || "Untitled activity",
              duration: item.duration || "",
              difficulty: item.difficulty || "",
              focusTag: item.focusTag || "",
              benefit: item.benefit || "",
              description: item.description || "",
              moods: Array.isArray(item.moods) ? item.moods : [],
              steps: Array.isArray(item.steps) ? item.steps : [],
            }))
          );
        }
      } catch {
        if (mounted) {
          setCatalogActivities([]);
          setSavingError("Could not load mood-fix activities from database.");
        }
      } finally {
        if (mounted) {
          setCatalogLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setTimerSeconds(estimatedMin * 60);
    setTimerRunning(false);
    setElapsedSeconds(0);
    setCompletedDurationSeconds(null);
  }, [estimatedMin, activityId]);

  useEffect(() => {
    if (!timerRunning) return undefined;

    const intervalId = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timerRunning]);

  if (catalogLoading) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Mood Fix" strictActive collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-gray-700">Loading activity...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Mood Fix" strictActive collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-gray-700">Activity not found.</p>
            <button
              onClick={() => navigate("/mood-fix")}
              className="mt-4 px-4 py-2 rounded-lg bg-[#0C5BD5] text-white"
            >
              Back to Mood Fix
            </button>
          </div>
        </main>
      </div>
    );
  }

  const completedSteps = stepStatus.filter(Boolean).length;
  const totalSteps = activity.steps.length;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);
  const timeTakenLabel =
    completedDurationSeconds !== null
      ? formatTimer(completedDurationSeconds)
      : elapsedSeconds > 0
        ? formatTimer(elapsedSeconds)
        : "Not started";

  const toggleStep = (index) => {
    setStepStatus((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const completeActivity = async () => {
    if (completedSteps < totalSteps) {
      setNotice("Please complete all steps first.");
      setTimeout(() => setNotice(""), 2000);
      return;
    }

    const now = Date.now();
    setCompletedAt(now);
    setTimerRunning(false);
    setCompletedDurationSeconds(elapsedSeconds);

    try {
      const raw = localStorage.getItem("moodfix-completed");
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      if (!list.includes(activity.id)) {
        localStorage.setItem("moodfix-completed", JSON.stringify([...list, activity.id]));
      }
    } catch {
      // Ignore storage failures and continue with UI feedback.
    }

    // Save mood feedback to database
    try {
      await saveMoodAfterFeedback({
        userId: getCurrentUserId(),
        activityId: activity.id,
        activityTitle: activity.title,
        moodAfter,
      });
    } catch (error) {
      console.error("Failed to save mood feedback", error);
      // Continue with UI success message even if DB save fails
    }

    const moodAfterLabel = scoreToMoodLabel(moodAfter);
    setNotice(`Completed. After mood: ${moodAfterLabel}. Great job finishing ${activity.title}.`);
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Mood Fix" strictActive collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Activity Guide</h1>
              <p className="text-gray-500 mt-1">Step-by-step support to complete this mood-fix activity</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(location.state?.from || "/mood-fix", { state: location.state })}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-[#0C5BD5] hover:text-[#0C5BD5] transition"
              >
                Back to Activities
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-[#0C5BD5] hover:text-[#0C5BD5] transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {notice && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${completedAt ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              {notice}
            </div>
          )}

          {savingError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {savingError}
            </div>
          )}

          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#DDECF8] px-6 py-6">
              <h2 className="text-2xl font-bold text-gray-900">{activity.title}</h2>
              <p className="text-base font-medium text-gray-600 mt-2">
                Estimated duration: {activity.duration}
              </p>
            </div>

            <div className="p-6 grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-700">Progress</p>
                    <p className="text-base font-semibold text-gray-700">{completedSteps} of {totalSteps}</p>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-[#0C5BD5] rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Estimated Time</p>
                    <p className="text-sm font-semibold text-gray-800">{estimatedMin} min</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Time Taken</p>
                    <p className="text-sm font-semibold text-gray-800">{timeTakenLabel}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Current Mood</p>
                    <p className="text-sm font-semibold text-gray-800">{location.state?.mood || "okay"}</p>
                  </div>
                </div>

                <p className="text-base text-gray-700 mt-5">{activity.description}</p>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">Steps</h3>
                  <p className="text-xs text-gray-500">Tap a step to mark complete</p>
                </div>
                <div className="mt-3 space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                  {activity.steps.map((step, index) => (
                    <button
                      key={`${activity.id}-${index}`}
                      onClick={() => toggleStep(index)}
                      className={`w-full text-left rounded-xl border px-4 py-3 flex items-start gap-3 transition ${
                        stepStatus[index]
                          ? "border-green-200 bg-green-50"
                          : "border-gray-200 bg-white hover:border-[#0C5BD5]"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full border-2 shrink-0 flex items-center justify-center text-xs font-semibold ${
                          stepStatus[index]
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-gray-300 text-gray-600"
                        }`}
                      >
                        {stepStatus[index] ? "✓" : index + 1}
                      </span>
                      <span className="text-sm text-gray-800 leading-relaxed">{step}</span>
                    </button>
                  ))}
                </div>
              </div>

              <aside className="lg:col-span-4">
                <div className="sticky top-6 space-y-4">
                  <div className="rounded-2xl border border-[#0C5BD533] bg-[#F6F9FF] p-4">
                    <p className="text-xs text-gray-500">Guided Timer</p>
                    <p className="text-2xl font-bold text-[#0C5BD5] tracking-wide mt-1">{formatTimer(timerSeconds)}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => setTimerRunning((prev) => !prev)}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-[#0C5BD5] text-white hover:bg-[#0A4AB0]"
                      >
                        {timerRunning ? "Pause" : "Start"}
                      </button>
                      <button
                        onClick={() => setTimerSeconds((prev) => prev + 60)}
                        className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:border-[#0C5BD5]"
                      >
                        +1 min
                      </button>
                      <button
                        onClick={() => {
                          setTimerRunning(false);
                          setTimerSeconds(estimatedMin * 60);
                          setElapsedSeconds(0);
                          setCompletedDurationSeconds(null);
                        }}
                        className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:border-[#0C5BD5]"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <label htmlFor="moodAfter" className="text-sm font-medium text-gray-700 block mb-2">
                      Mood after activity
                    </label>
                    <input
                      id="moodAfter"
                      type="range"
                      min="1"
                      max="10"
                      value={moodAfter}
                      onChange={(e) => setMoodAfter(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-sm text-gray-600 mt-1">{moodAfter}/10 ({scoreToMoodLabel(moodAfter)})</p>
                    <button
                      onClick={completeActivity}
                      className="mt-3 w-full px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                    >
                      Complete Activity
                    </button>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <h4 className="text-base font-semibold text-gray-900">Benefits</h4>
                    <ul className="mt-2 space-y-1.5">
                      {(activity.benefits || [activity.benefit]).map((item, idx) => (
                        <li key={`${activity.id}-benefit-${idx}`} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-600 inline-block mt-1.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default MoodFixActivityDetail;
