// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./MoodFixPage.css";
import InsightIcon from "../assets/InsightIcon";
import MoodFixIcon from "../assets/MoodFixIcon";
import { fetchMoodFixActivities, fetchMoodHistory } from "../api/moodApi";
import { getCurrentUserId } from "../config";
import { useMoodStore } from "../store/moodStore";

const moods = ["terrible", "sad", "okay", "good", "great"];

const normalizeMood = (value) => {
  const raw = String(value || "").toLowerCase().trim();
  if (moods.includes(raw)) return raw;

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) {
    if (asNumber <= 1) return "terrible";
    if (asNumber <= 2) return "sad";
    if (asNumber <= 3) return "okay";
    if (asNumber <= 4) return "good";
    return "great";
  }

  return "okay";
};

const toTitle = (value) => {
  const text = String(value || "");
  if (!text) return "Okay";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const tagClassMap = {
  anxious: "bg-purple-100 text-purple-700 border-purple-200",
  stressed: "bg-amber-100 text-amber-700 border-amber-200",
  sad: "bg-blue-100 text-blue-700 border-blue-200",
  happy: "bg-green-100 text-green-700 border-green-200",
  calm: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

const getTagClass = (tag) => {
  const key = String(tag || "").toLowerCase();
  return tagClassMap[key] || "bg-gray-100 text-gray-700 border-gray-200";
};

const MoodFixPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [loadingMood, setLoadingMood] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [activities, setActivities] = useState([]);

  const [currentMood, setCurrentMood] = useState("okay");
  const [selectedMood, setSelectedMood] = useState("okay");
  const [completedIds, setCompletedIds] = useState([]);
  const [showLatestOnly, setShowLatestOnly] = useState(false);
  const [activeSidebarPage, setActiveSidebarPage] = useState("Mood Fix");

  const lastSubmission = useMoodStore((state) => state.lastSubmission);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("moodfix-completed");
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setCompletedIds(parsed);
    } catch {
      setCompletedIds([]);
    }
  }, []);

  useEffect(() => {
    // Determine if this is a "latest only" view
    const isLatestOnly = location.state?.showLatestOnly === true;
    setShowLatestOnly(isLatestOnly);
    
    // Set active sidebar based on view
    if (isLatestOnly) {
      setActiveSidebarPage("Mood Track");
    } else {
      setActiveSidebarPage("Mood Fix");
    }
  }, [location.state?.showLatestOnly]);

  useEffect(() => {
    let mounted = true;

    const loadMood = async () => {
      try {
        setLoadingMood(true);
        setFetchError("");

        const stateMood = normalizeMood(location.state?.mood);
        if (location.state?.mood && mounted) {
          setCurrentMood(stateMood);
          setSelectedMood(stateMood);
        }

        if (lastSubmission?.mood && mounted && !location.state?.mood) {
          const normalized = normalizeMood(lastSubmission.mood);
          setCurrentMood(normalized);
          setSelectedMood(normalized);
        }

        const history = await fetchMoodHistory(getCurrentUserId());
        const latest = Array.isArray(history) && history.length ? history[0] : null;

        if (mounted && !location.state?.mood) {
          const normalized = normalizeMood(latest?.mood);
          setCurrentMood(normalized);
          setSelectedMood(normalized);
        }
      } catch {
        if (mounted) {
          setFetchError("Could not load latest mood. Showing general mood-fix activities.");
        }
      } finally {
        if (mounted) {
          setLoadingMood(false);
        }
      }
    };

    loadMood();

    return () => {
      mounted = false;
    };
  }, [lastSubmission, location.state]);

  useEffect(() => {
    let mounted = true;

    const loadActivities = async () => {
      try {
        setLoadingActivities(true);
        setFetchError("");
        const response = await fetchMoodFixActivities();
        const data = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];

        if (mounted) {
          setActivities(
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
          setActivities([]);
          setFetchError("Could not load mood-fix activities from database.");
        }
      } finally {
        if (mounted) {
          setLoadingActivities(false);
        }
      }
    };

    loadActivities();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredActivities = useMemo(() => {
    return activities.filter((item) => Array.isArray(item.moods) && item.moods.includes(selectedMood));
  }, [activities, selectedMood]);

  const handleSeeAll = () => {
    navigate("/mood-fix", { state: { showLatestOnly: false } });
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage={activeSidebarPage} strictActive collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Mood Fix Suggestions</h1>
              <p className="text-gray-500 mt-1">
                {showLatestOnly
                  ? "Evidence-based activities tailored for your latest check-in"
                  : "Browse all activities with focus tags and guided options"}
              </p>
            </div>
            {showLatestOnly && (
              <button
                onClick={handleBackToDashboard}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-[#0C5BD5] hover:text-[#0C5BD5] transition"
              >
                Back to Dashboard
              </button>
            )}
          </div>

          <section className="bg-white rounded-xl p-5 shadow-sm border border-[#0C5BD555]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0C5BD511] border border-[#0C5BD533] flex items-center justify-center">
                <InsightIcon className="w-5 h-5 text-[#0C5BD5]" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-800">
                  Personalized for Your Mood: {toTitle(currentMood)}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  These activities are chosen based on your current emotional state.
                </p>
                {loadingMood && <p className="text-xs text-gray-500 mt-2">Checking your latest mood...</p>}
                {fetchError && <p className="text-xs text-amber-600 mt-2">{fetchError}</p>}
              </div>
            </div>
          </section>

          <section className="bg-[#DCE6F6] rounded-2xl p-5 shadow-sm border border-[#6BB5FF]">
            {!showLatestOnly && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <p className="text-2xl font-semibold text-gray-900 w-full mb-1">How are you feeling today?</p>
                {moods.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMood(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      selectedMood === m
                        ? "bg-[#0C5BD5] text-white border-[#0C5BD5] shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#0C5BD5]"
                    }`}
                  >
                    {toTitle(m)}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-1">Recommended for you</h3>
                <p className="text-sm text-gray-600">
                  {loadingActivities ? "Loading activities..." : `${filteredActivities.length} activities available`}
                </p>
              </div>
              {showLatestOnly && (
                <button
                  onClick={handleSeeAll}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-[#0C5BD5] hover:text-[#0C5BD5] transition"
                >
                  See All →
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const completed = completedIds.includes(activity.id);

                return (
                  <article
                    key={activity.id}
                    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#0C5BD511] border border-[#0C5BD533] flex items-center justify-center mt-0.5">
                        <MoodFixIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">{activity.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{activity.duration}</p>
                        <p className="text-sm text-gray-600 mt-2">{activity.description}</p>
                        {!showLatestOnly && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold border bg-white text-gray-700 border-gray-200">
                              {activity.difficulty || "Easy"}
                            </span>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold border ${getTagClass(activity.focusTag)}`}>
                              {activity.focusTag || "General"}
                            </span>
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold border bg-[#E8F0FF] text-[#0C5BD5] border-[#B8D0FF]">
                              {activity.benefit || "Mood Support"}
                            </span>
                          </div>
                        )}
                        {completed && (
                          <span className="inline-flex mt-2 px-2 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        navigate(`/mood-fix/activity/${activity.id}`, {
                          state: {
                            mood: selectedMood,
                            showLatestOnly,
                            from: "/mood-fix",
                          },
                        })
                      }
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-900 transition self-center"
                    >
                      Start
                    </button>
                  </article>
                );
              })}

              {!filteredActivities.length && (
                <div className="bg-white rounded-xl p-4 border border-gray-100 text-sm text-gray-600">
                  No activities match this filter yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default MoodFixPage;
