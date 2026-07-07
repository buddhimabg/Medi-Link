import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import CheckInStepper from '../../components/check-in/CheckInStepper';
import { useMoodStore } from "../../store/moodStore";
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

// ─── Question definitions (Questions 1-4) ───
const questionDefs: QuestionDef[] = [
  {
    key: "sleepLevel",
    icon: "🌙",
    title: "Sleep Quality",
    question: "How was your sleep last night?",
    answers: [
      { emoji: "😴", label: "I slept very poorly", value: 2 },
      { emoji: "😕", label: "I slept okay but not very well", value: 5 },
      { emoji: "🙂", label: "I slept well", value: 8 },
      { emoji: "😄", label: "I had a very restful sleep", value: 10 },
    ],
  },
  {
    key: "anxietyLevel",
    icon: "😟",
    title: "Anxiety Level",
    question: "How anxious do you feel today?",
    answers: [
      { emoji: "😌", label: "I feel calm most of the time", value: 2 },
      { emoji: "😐", label: "I feel slightly anxious sometimes", value: 4 },
      { emoji: "😟", label: "I feel quite anxious", value: 7 },
      { emoji: "😣", label: "I feel very anxious most of the day", value: 10 },
    ],
  },
  {
    key: "energyLevel",
    icon: "⚡",
    title: "Energy Level",
    question: "How is your energy level today?",
    answers: [
      { emoji: "🔋", label: "I feel exhausted", value: 2 },
      { emoji: "😐", label: "I feel a little tired", value: 5 },
      { emoji: "⚡", label: "I feel okay and able to do things", value: 8 },
      { emoji: "🚀", label: "I feel energetic and active", value: 10 },
    ],
  },
  {
    key: "motivationLevel",
    icon: "🎯",
    title: "Motivation",
    question: "How motivated do you feel today?",
    answers: [
      { emoji: "💤", label: "I find it hard to start anything", value: 2 },
      { emoji: "😐", label: "I can manage only small tasks", value: 5 },
      { emoji: "🙂", label: "I feel motivated for most activities", value: 8 },
      { emoji: "🚀", label: "I feel highly motivated and productive", value: 10 },
    ],
  },
];

const CheckInPage2: React.FC = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [answeredKeys, setAnsweredKeys] = useState<Set<string>>(new Set());
  const [alert, setAlert] = useState<AlertType>({
    show: false,
    type: "",
    message: "",
  });

  const {
    currentCheckIn,
    setCurrentCheckIn,
  } = useMoodStore();

  const { mood } = currentCheckIn || {};

  const [levels, setLevels] = useState<LevelsType>(
    currentCheckIn?.levels || defaultLevels
  );

  useEffect(() => {
    if (!mood) navigate("/check-in");
  }, [mood, navigate]);

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

  const handleContinue = () => {
    if (!validateLevels()) return;

    navigate("/check-in/details/2");
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
            <p>Help us understand your wellbeing (Part 1/2)</p>
          </div>

          <CheckInStepper currentStep={2} />
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
              <button onClick={() => navigate(-1)} className="checkin2-back">
                ← Back
              </button>

              <button
                onClick={handleContinue}
                className={`checkin2-submit`}
              >
                Continue →
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CheckInPage2;
