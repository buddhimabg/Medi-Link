import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useMoodStore } from "../store/moodStore";
import { createCheckIn, fetchDashboardStats } from "../api/moodApi";
import { getCurrentUserId } from "../config";
import { handleError } from "../utils/errorHandler";
import "./CheckInPage2.css";

type LevelsType = {
  sleepLevel: number;
  anxietyLevel: number;
  energyLevel: number;
  motivationLevel: number;
  socialInteraction: number;
  stressLevel: number;
  focusLevel: number;
};

type AlertType = {
  show: boolean;
  type: string;
  message: string;
};

const defaultLevels: LevelsType = {
  sleepLevel: 5,
  anxietyLevel: 5,
  energyLevel: 5,
  motivationLevel: 5,
  socialInteraction: 5,
  stressLevel: 5,
  focusLevel: 5
};

const questionConfig = [
  { key: "sleepLevel", label: "How well did you sleep last night" },
  { key: "anxietyLevel", label: "How anxious do you feel today" },
  { key: "energyLevel", label: "Rate your energy level" },
  { key: "motivationLevel", label: "How motivated do you feel?" },
  { key: "socialInteraction", label: "Rate your social interaction today" },
  { key: "stressLevel", label: "How stressed do you feel?" },
  { key: "focusLevel", label: "Rate your focus level" }
] as const;

const getSliderFillPercent = (value: number) => ((value - 1) / 9) * 100;

const CheckInPage2: React.FC = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [alert, setAlert] = useState<AlertType>({
    show: false,
    type: "",
    message: ""
  });

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
    if (!mood) navigate("/check-in");
  }, [mood, navigate]);

  useEffect(() => {
    if (currentCheckIn?.levels) setLevels(currentCheckIn.levels);
  }, [currentCheckIn]);

  const showAlert = (type: string, message: string) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: "", message: "" }), 4000);
  };

  const handleLevelChange = (field: keyof LevelsType, value: string) => {
    const newLevels = { ...levels, [field]: Number(value) };
    setLevels(newLevels);
    setCurrentCheckIn({ ...currentCheckIn, levels: newLevels });
  };

  const validateLevels = () => {
    for (const key in levels) {
      const k = key as keyof LevelsType;
      if (levels[k] < 1 || levels[k] > 10) {
        showAlert("error", "All values must be between 1 and 10");
        return false;
      }
    }
    return true;
  };

  const submitCheckIn = async () => {
    if (!validateLevels()) return;

    setLoading(true);
    try {
      const userId = getCurrentUserId();
      const payload = { userId, mood, note: note || "", ...levels };
      const [submission, dashboardStats] = (await Promise.all([
        createCheckIn(payload),
        fetchDashboardStats(userId),
      ])) as any[];

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
      showAlert("error", handleError(err, "CheckInPage2.submitCheckIn"));
    } finally {
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
          <div className={`alert ${alert.type}`}>{alert.message}</div>
        )}

        <section className="checkin2-section">
          <div className="header">
            <h1>Daily Check-in</h1>
            <p>Help us understand your wellbeing</p>
          </div>

          <div className="progress">
            <span>Progress</span>
            <span className="step">2 of 2</span>
            <div className="bar">
              <div className="fill" />
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
              {questionConfig.map((q) => (
                <div key={q.key} className="question">
                  <h2>{q.label}</h2>

                  <div className="labels">
                    <span>Not at all</span>
                    <span>Extremely</span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={levels[q.key]}
                    onChange={(e) =>
                      handleLevelChange(q.key, e.target.value)
                    }
                    style={{
                      background: `linear-gradient(to right, #0C5BD5 0%, #0C5BD5 ${getSliderFillPercent(
                        levels[q.key]
                      )}%, #dbdcde ${getSliderFillPercent(
                        levels[q.key]
                      )}%, #dbdcde 100%)`,
                    }}
                  />

                  <div className="value">{levels[q.key]}/10</div>
                </div>
              ))}
            </div>

            <div className="actions">
              <button onClick={() => navigate(-1)} className="back">
                Back
              </button>

              <button
                onClick={submitCheckIn}
                disabled={loading}
                className="submit"
              >
                {loading ? "Saving..." : "Complete Check-in"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CheckInPage2;