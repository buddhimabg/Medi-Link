import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import CheckInStepper from '../../components/check-in/CheckInStepper';
import { useMoodStore } from "../../store/moodStore";
import { createCheckIn, fetchOverview } from "../../api/moodApi";
import type { OverviewData } from "../../types/mood";
import { getCurrentUserId } from "../../config";
import { handleError } from "../../utils/errorHandler";
import "./CheckInPage2.css";

type LevelsType = {
  sleepLevel: number | null;
  anxietyLevel: number | null;
  energyLevel: number | null;
  motivationLevel: number | null;
  socialInteraction: number | null;
  stressLevel: number | null;
  focusLevel: number | null;
};

type AlertType = {
  show: boolean;
  type: string;
  message: string;
};

type AnswerOption = {
  emoji: string;
  label: string;
  value: number;
};

type QuestionDef = {
  key: keyof LevelsType;
  icon: string;
  title: string;
  question: string;
  answers: AnswerOption[];
};

const defaultLevels: LevelsType = {
  sleepLevel: null,
  anxietyLevel: null,
  energyLevel: null,
  motivationLevel: null,
  socialInteraction: null,
  stressLevel: null,
  focusLevel: null,
};

// ─── Question definitions (Questions 5-7) ───
const questionDefs: QuestionDef[] = [
  {
    key: "socialInteraction",
    icon: "🧍",
    title: "Social Interaction",
    question: "How was your social interaction today?",
    answers: [
      { emoji: "😶", label: "I avoided most interactions", value: 2 },
      { emoji: "😐", label: "I had minimal interaction", value: 5 },
      { emoji: "🙂", label: "I had normal interactions", value: 8 },
      { emoji: "😊", label: "I had positive and meaningful interactions", value: 10 },
    ],
  },
  {
    key: "stressLevel",
    icon: "🔥",
    title: "Stress Level",
    question: "How stressed do you feel today?",
    answers: [
      { emoji: "😌", label: "I feel relaxed", value: 2 },
      { emoji: "😐", label: "I feel slightly stressed", value: 4 },
      { emoji: "😟", label: "I feel quite stressed", value: 7 },
      { emoji: "😣", label: "I feel overwhelmed", value: 10 },
    ],
  },
  {
    key: "focusLevel",
    icon: "🧠",
    title: "Focus Level",
    question: "How is your focus today?",
    answers: [
      { emoji: "🌫️", label: "I cannot focus at all", value: 2 },
      { emoji: "😐", label: "My focus comes and goes", value: 5 },
      { emoji: "🙂", label: "I can focus on most tasks", value: 8 },
      { emoji: "🎯", label: "I can focus very well", value: 10 },
    ],
  },
];

const CheckInPage3: React.FC = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [answeredKeys, setAnsweredKeys] = useState<Set<string>>(new Set());
  const [alert, setAlert] = useState<AlertType>({
    show: false,
    type: "",
    message: "",
  });
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const {
    currentCheckIn,
    dashboardData,
    setCurrentCheckIn,
    setDashboardData,
    setLastSubmission,
  } = useMoodStore();

  const { mood, note, date } = currentCheckIn || {};

  const [levels, setLevels] = useState<LevelsType>(
    currentCheckIn?.levels || defaultLevels
  );

  useEffect(() => {
    if (!mood && !isSuccess) navigate("/check-in");
  }, [mood, navigate, isSuccess]);

  useEffect(() => {
    if (currentCheckIn?.levels) {
      setLevels(currentCheckIn.levels);
      setAnsweredKeys(prev => {
        const next = new Set(prev);
        questionDefs.forEach(q => {
          if (currentCheckIn.aiFields && currentCheckIn.aiFields[q.key] !== undefined && currentCheckIn.aiFields[q.key] !== null) {
            next.add(q.key);
          }
        });
        return next;
      });
    }
  }, [currentCheckIn]);

  const showAlert = (type: string, message: string) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: "", message: "" }), 4000);
  };

  const handleSelect = (field: keyof LevelsType, value: number) => {
    const newLevels = { ...levels, [field]: value };
    setLevels(newLevels);
    const newAiFields: Record<string, any> = { ...(currentCheckIn.aiFields || {}) };
    delete newAiFields[field];
    setCurrentCheckIn({ ...currentCheckIn, levels: newLevels, aiFields: newAiFields });
    setAnsweredKeys((prev) => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  };

  const validateLevels = () => {
    for (const key in levels) {
      const k = key as keyof LevelsType;
      if (levels[k] !== null && (levels[k]! < 1 || levels[k]! > 10)) {
        showAlert("error", "All values must be between 1 and 10");
        return false;
      }
    }
    return true;
  };

  const isAnswerSelected = (q: QuestionDef, ans: AnswerOption) => {
    if (!answeredKeys.has(q.key)) return false;
    const val = levels[q.key];
    if (val === null || val === undefined) return false;
    if (val === ans.value) return true;

    const exactMatchExists = q.answers.some((a) => a.value === val);
    if (!exactMatchExists) {
      let closest = q.answers[0];
      let minDiff = Math.abs(val - closest.value);
      for (const a of q.answers) {
        const diff = Math.abs(val - a.value);
        if (diff < minDiff) {
          minDiff = diff;
          closest = a;
        }
      }
      return closest.value === ans.value;
    }
    return false;
  };

  // Count how many questions on this page have been explicitly answered
  const answeredCount = questionDefs.filter(
    (q) => answeredKeys.has(q.key)
  ).length;

  const submitCheckIn = async () => {
    if (!validateLevels()) return;

    setLoading(true);
    try {
      const userId = getCurrentUserId();
      const payload = { userId, mood, note: note || "", ...currentCheckIn.aiFields, ...levels };
      const submission = await createCheckIn(payload) as unknown as { mentalHealthScore?: number; checkInStreak?: number; isFirstCheckInToday?: boolean; [key: string]: any };

      // Invalidate mood store caches immediately after check-in creation
      useMoodStore.getState().setLastFetchedDashboard(null);
      useMoodStore.getState().setLastFetchedMoodHistory(null);
      useMoodStore.getState().setLastFetchedInsights(null);

      const overview = await fetchOverview(userId) as unknown as OverviewData;
      const dashboardStats = overview?.dashboardStats;

      if (dashboardStats) {
        setDashboardData({
          ...dashboardData,
          sevenDayAverage:
            typeof dashboardStats.sevenDayAverage === "number" ||
            typeof dashboardStats.sevenDayAverage === "string"
              ? dashboardStats.sevenDayAverage
              : dashboardData.sevenDayAverage,
          checkInStreak: Number(dashboardStats.checkInStreak ?? 0),
          recoveryScore: Number(dashboardStats.recoveryScore ?? 0),
        });
      }

      setLastSubmission({
        ...(submission || {}),
        dashboardStats: dashboardStats || null,
      });

      setIsSuccess(true);
      showAlert("success", "Check-in completed!");

      setLevels(defaultLevels);
      setCurrentCheckIn({
        mood: "",
        note: "",
        date: "",
        levels: defaultLevels,
      });

      localStorage.removeItem("moodDraft");

      setTimeout(() => {
        navigate("/check-in/summary", {
          state: {
            mood,
            note,
            levels,
            date: date || new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            mentalHealthScore: submission?.mentalHealthScore,
            checkInStreak: Number(dashboardStats?.checkInStreak ?? 0),
            isFirstCheckInToday: submission?.isFirstCheckInToday,
            checkInId:
              submission?._id ||
              submission?.saved?._id ||
              submission?.data?._id,
          },
        });
      }, 1200);
    } catch (err) {
      showAlert("error", handleError(err, "CheckInPage3.submitCheckIn"));
      setLoading(false);
    }
  };

  return (
    <div className="checkin2-container">
      <Sidebar
        activePage="Mood Track"
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main className={`checkin2-main ${collapsed ? "collapsed" : "expanded"}`}>
        {alert.show && (
          <div className={`checkin2-alert ${alert.type}`}>{alert.message}</div>
        )}

        <section className="checkin2-section">
          <div className="checkin2-header">
            <h1>Daily Check-in</h1>
            <p>Help us understand your wellbeing (Part 2/2)</p>
          </div>

          <CheckInStepper currentStep={3} />
          <p className="checkin2-answered" style={{ textAlign: 'center', marginTop: '-1rem', marginBottom: '1.5rem' }}>
            {answeredCount} of {questionDefs.length} questions answered
          </p>

          <div className="checkin2-card">
            <div className="checkin2-card-inner">
              {questionDefs.map((q) => (
                <div key={q.key} className="checkin2-question">
                  <div className="checkin2-question-header">
                    <span className="checkin2-question-icon">{q.icon}</span>
                    <div>
                      <h2>
                        {q.title}
                        {currentCheckIn.aiFields && currentCheckIn.aiFields[q.key] !== undefined && currentCheckIn.aiFields[q.key] !== null && (
                          <span className="checkin2-ai-badge">✨ AI Suggested</span>
                        )}
                      </h2>
                      <p className="checkin2-question-text">{q.question}</p>
                    </div>
                  </div>

                  <div className="checkin2-answers">
                    {q.answers.map((ans) => (
                      <button
                        key={ans.value}
                        className={`checkin2-answer-card ${
                          isAnswerSelected(q, ans) ? "selected" : ""
                        }`}
                        onClick={() => handleSelect(q.key, ans.value)}
                        type="button"
                      >
                        <span className="checkin2-answer-emoji">{ans.emoji}</span>
                        <span className="checkin2-answer-label">{ans.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="checkin2-actions">
              <button onClick={() => navigate('/check-in/details')} className="checkin2-back">
                ← Back
              </button>

              <button
                onClick={submitCheckIn}
                disabled={loading || isSuccess}
                className={`checkin2-submit`}
              >
                {loading ? "Saving..." : isSuccess ? "Redirecting..." : "Complete Check-in ✓"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CheckInPage3;
