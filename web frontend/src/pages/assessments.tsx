import React, { useState, useEffect, useRef } from "react";
import {
  Heart,
  Clock,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Bell,
  User,
  Loader,
  ExternalLink,
  CheckCircle2,
  Dumbbell,
  Apple,
  Moon,
  Coffee,
  Users,
} from "lucide-react";
import Sidebar from "../component/sidebar";
import "./assessments.css";

interface AssessmentResult {
  _id: string;
  userId: string;
  answers: number[];
  phq9Score: number;
  gad7Score: number;
  depressionSeverity: string;
  anxietySeverity: string;
  overallWellnessScore: number;
  summary: string;
  aiSummary: string;
  recommendations: string[];
  lifestyleSuggestions: string[];
  createdAt: string;
}

const QUESTIONS = [
  // PHQ-9 (Depression) Questions
  { id: 1, type: "PHQ-9", text: "Little interest or pleasure in doing things?" },
  { id: 2, type: "PHQ-9", text: "Feeling down, depressed, or hopeless?" },
  { id: 3, type: "PHQ-9", text: "Trouble falling or staying asleep, or sleeping too much?" },
  { id: 4, type: "PHQ-9", text: "Feeling tired or having little energy?" },
  { id: 5, type: "PHQ-9", text: "Poor appetite or overeating?" },
  { id: 6, type: "PHQ-9", text: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down?" },
  { id: 7, type: "PHQ-9", text: "Trouble concentrating on things, such as reading the newspaper or watching television?" },
  { id: 8, type: "PHQ-9", text: "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual?" },
  { id: 9, type: "PHQ-9", text: "Thoughts that you would be better off dead, or of hurting yourself in some way?" },

  // GAD-7 (Anxiety) Questions
  { id: 10, type: "GAD-7", text: "Feeling nervous, anxious, or on edge?" },
  { id: 11, type: "GAD-7", text: "Not being able to stop or control worrying?" },
  { id: 12, type: "GAD-7", text: "Worrying too much about different things?" },
  { id: 13, type: "GAD-7", text: "Trouble relaxing?" },
  { id: 14, type: "GAD-7", text: "Being so restless that it is hard to sit still?" },
  { id: 15, type: "GAD-7", text: "Becoming easily annoyed or irritable?" },
  { id: 16, type: "GAD-7", text: "Feeling afraid, as if something awful might happen?" }
];

const OPTIONS = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 }
];

const Assessments: React.FC = () => {
  const [activePhase, setActivePhase] = useState<"welcome" | "questionnaire" | "result">("welcome");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(16).fill(-1));
  const [latestResult, setLatestResult] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState("");
  const [fullUserData, setFullUserData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      window.location.replace("/login");
      return;
    }
    try {
      const userData = JSON.parse(storedUser);
      setUserId(userData._id || "");
      setFullUserData(userData);
      fetchLatestResult(userData._id);
    } catch (err) {
      console.error("Error parsing user data", err);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u?._id) {
            const res = await fetch(`http://localhost:5000/api/notifications?userId=${u._id}`);
            if (res.ok) {
              const data = await res.json();
              setNotifications(data);
            }
          }
        } catch (err) {
          console.error("Error fetching notifications:", err);
        }
      }
    };
    fetchNotifications();
  }, []);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLatestResult = async (uid: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/assessments/latest/${uid}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setLatestResult(json.data);
          setActivePhase("result"); // Default to result dashboard if they have already completed it
        }
      }
    } catch (err) {
      console.error("Error fetching latest assessment", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartAssessment = () => {
    setAnswers(new Array(16).fill(-1));
    setCurrentQIndex(0);
    setActivePhase("questionnaire");
  };

  const handleSelectOption = (value: number) => {
    const updated = [...answers];
    updated[currentQIndex] = value;
    setAnswers(updated);
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(currentQIndex - 1);
    }
  };

  const handleNext = () => {
    if (answers[currentQIndex] === -1) {
      setError("Please select an answer to proceed.");
      return;
    }
    setError("");

    if (currentQIndex < 15) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      submitAssessment();
    }
  };

  const submitAssessment = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("http://localhost:5000/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          answers
        })
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setLatestResult(json.data);
          setActivePhase("result");
        } else {
          setError(json.message || "Failed to submit assessment.");
        }
      } else {
        setError("Network response was not ok. Please try again.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to connect to the backend server.");
    } finally {
      setIsSaving(false);
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "minimal":
        return "badge-minimal";
      case "mild":
        return "badge-mild";
      case "moderate":
        return "badge-moderate";
      case "moderately severe":
        return "badge-moderately-severe";
      case "severe":
        return "badge-severe";
      default:
        return "badge-mild";
    }
  };

  const getLifestyleIcon = (suggestion: string) => {
    switch (suggestion?.toLowerCase()) {
      case "exercise":
        return <Dumbbell className="lifestyle-icon" size={24} />;
      case "healthy diet":
        return <Apple className="lifestyle-icon" size={24} />;
      case "better sleep":
        return <Moon className="lifestyle-icon" size={24} />;
      case "limit caffeine":
        return <Coffee className="lifestyle-icon" size={24} />;
      case "stay connected":
        return <Users className="lifestyle-icon" size={24} />;
      default:
        return <Heart className="lifestyle-icon" size={24} />;
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/");
  };

  if (isLoading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-main-content loader-container">
          <Loader className="spinner" size={48} />
          <p>Loading assessment details...</p>
        </div>
      </div>
    );
  }

  // Active question details
  const activeQuestion = QUESTIONS[currentQIndex];
  const progressPercentage = Math.round(((currentQIndex) / 16) * 100);
  const isPHQ9 = activeQuestion.type === "PHQ-9";

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main-content">
        <header className="dashboard-top-nav">
          <div className="nav-left">
            <h2 className="mobile-logo">MediLink</h2>
          </div>
          <div className="nav-right">
            <div className="notifications-dropdown-container" ref={notificationsMenuRef}>
              <button
                className="icon-btn"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
              >
                <Bell size={20} />
              </button>

              {isNotificationsOpen && (
                <div className="notifications-dropdown-card">
                  <div className="notifications-header">
                    <h4>Notifications</h4>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="notifications-list">
                      {notifications.map((n) => (
                        <div key={n._id} className="notification-item">
                          <div className={`notification-icon-wrapper ${n.type || "system"}`}>
                            <Bell size={16} />
                          </div>
                          <div className="notification-details">
                            <h5 className="notification-title">{n.title}</h5>
                            <p className="notification-message">{n.message}</p>
                            <span className="notification-time">
                              {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="notifications-empty-state">
                      <Bell size={32} />
                      <p>No notifications yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="profile-menu-container" ref={profileMenuRef}>
              <button
                className="icon-btn profile-btn"
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationsOpen(false);
                }}
              >
                <User size={20} />
              </button>

              {isProfileOpen && (
                <div className="profile-dropdown-card">
                  <div className="dropdown-user-header">
                    <div className="dropdown-avatar">
                      <User size={24} />
                    </div>
                    <div className="dropdown-user-details">
                      <h4>{fullUserData?.name || "Buddhima"}</h4>
                      <p>{fullUserData?.email || "patient@medilink.lk"}</p>
                      <span className="patient-id-tag">
                        ID: #{fullUserData?._id?.slice(-4) || "0842"}
                      </span>
                    </div>
                  </div>

                  <div className="dropdown-contact-glance">
                    <div className="glance-item">
                      <span>Phone:</span>
                      <strong>{fullUserData?.phone || fullUserData?.mobile || "Not set"}</strong>
                    </div>
                    <div className="glance-item">
                      <span>Emergency:</span>
                      <strong
                        className={
                          !fullUserData?.emergencyContact ? "text-warn" : ""
                        }
                      >
                        {fullUserData?.emergencyContact || "⚠️ Required"}
                      </strong>
                    </div>
                    <div className="glance-item">
                      <span>Gender:</span>
                      <strong>{fullUserData?.gender || "Not set"}</strong>
                    </div>
                    <div className="glance-item">
                      <span>City:</span>
                      <strong>{fullUserData?.city || "Not set"}</strong>
                    </div>
                    <div className="glance-item">
                      <span>DOB:</span>
                      <strong>
                        {fullUserData?.dob
                          ? new Date(fullUserData.dob).toLocaleDateString()
                          : "Not set"}
                      </strong>
                    </div>
                  </div>

                  <hr className="dropdown-divider" />

                  <div className="dropdown-action-list">
                    <button
                      className="dropdown-menu-item logout-btn"
                      onMouseDown={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>


        {/* Phase 1: Welcome Page */}
        {activePhase === "welcome" && (
          <div className="assessment-page-container">
            <div className="welcome-hero-card">
              <div className="hero-text-side">
                <span className="welcome-tag">Mental Wellness</span>
                <h1 className="hero-title-text">
                  Mental Health <br />
                  <span className="purple-gradient-text">Assessment</span>
                </h1>
                <p className="hero-subtitle-text">
                  Take a short, confidential assessment to better understand your current mental wellbeing. It only takes a few minutes.
                </p>

                <div className="welcome-cards-grid">
                  <div className="info-badge-card">
                    <div className="badge-icon-wrap purple-bg">
                      <Clock size={20} />
                    </div>
                    <div className="badge-details">
                      <h3>Duration</h3>
                      <p>Approximately 5 minutes</p>
                    </div>
                  </div>

                  <div className="info-badge-card">
                    <div className="badge-icon-wrap purple-bg">
                      <HelpCircle size={20} />
                    </div>
                    <div className="badge-details">
                      <h3>Questions</h3>
                      <p>16 questions (PHQ-9 & GAD-7)</p>
                    </div>
                  </div>

                  <div className="info-badge-card">
                    <div className="badge-icon-wrap purple-bg">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="badge-details">
                      <h3>Confidential</h3>
                      <p>Your responses are 100% private</p>
                    </div>
                  </div>

                  <div className="info-badge-card">
                    <div className="badge-icon-wrap purple-bg">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="badge-details">
                      <h3>Disclaimer</h3>
                      <p>This is not a medical diagnosis</p>
                    </div>
                  </div>
                </div>

                <div className="welcome-action-buttons">
                  <button className="btn-primary" onClick={handleStartAssessment}>
                    Start Assessment <ArrowRight size={18} />
                  </button>
                  {latestResult && (
                    <button className="btn-secondary" onClick={() => setActivePhase("result")}>
                      View Last Result
                    </button>
                  )}
                </div>
              </div>

              <div className="hero-graphic-side">
                <div className="graphic-circle-wrap">
                  <div className="illustration-wrapper">
                    <div className="pulse-heart">
                      <Heart size={80} fill="#818cf8" stroke="none" />
                    </div>
                    {/* Floating icons representing mental health scores */}
                    <div className="floating-bubble bubble-1">😊</div>
                    <div className="floating-bubble bubble-2">🌸</div>
                    <div className="floating-bubble bubble-3">📋</div>
                    <div className="floating-bubble bubble-4">💜</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Questionnaire */}
        {activePhase === "questionnaire" && (
          <div className="assessment-page-container questionnaire-layout">
            {/* Left Panel - Progress Tracking */}
            <aside className="questionnaire-side-panel">
              <div className="progress-card">
                <h3>Assessment Progress</h3>
                <span className="question-counter">Question {currentQIndex + 1} of 16</span>

                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
                  <span className="progress-percentage">{progressPercentage}%</span>
                </div>

                <div className="sections-indicator">
                  <div className={`section-item ${isPHQ9 ? "active" : ""}`}>
                    <div className="section-header-row">
                      <span>PHQ-9 (Depression)</span>
                      <span className="section-badge">1 - 9</span>
                    </div>
                    <p>Questions about your mood, interests and daily life</p>
                  </div>

                  <div className={`section-item ${!isPHQ9 ? "active" : ""}`}>
                    <div className="section-header-row">
                      <span>GAD-7 (Anxiety)</span>
                      <span className="section-badge">10 - 16</span>
                    </div>
                    <p>Questions about your anxiety and worries</p>
                  </div>
                </div>
              </div>

              <div className="emergency-help-card">
                <h3>Need Help?</h3>
                <p>If you are in crisis or having suicidal thoughts, please seek immediate professional help.</p>
                <a href="https://www.mentalhealth.gov" target="_blank" rel="noreferrer" className="emergency-link">
                  <span>Emergency Resources</span>
                  <ExternalLink size={16} />
                </a>
              </div>
            </aside>

            {/* Right Panel - Active Question card */}
            <main className="questionnaire-main-area">
              {error && <div className="error-banner">{error}</div>}

              <div className="question-card">
                <span className="question-type-badge">{activeQuestion.type}</span>

                <h2 className="question-text">
                  {currentQIndex + 1}. {activeQuestion.text}
                </h2>

                <div className="options-list">
                  {OPTIONS.map((opt) => {
                    const isSelected = answers[currentQIndex] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        className={`option-button ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectOption(opt.value)}
                      >
                        <div className="option-checkbox">
                          {isSelected && <div className="option-checkbox-inner"></div>}
                        </div>
                        <span className="option-label">{opt.label}</span>
                        <span className="option-score">{opt.value}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="questionnaire-nav-row">
                  <button
                    className="btn-back"
                    onClick={handlePrev}
                    disabled={currentQIndex === 0}
                  >
                    <ArrowLeft size={18} /> Previous
                  </button>

                  <button
                    className="btn-next"
                    onClick={handleNext}
                    disabled={answers[currentQIndex] === -1 || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader className="spinner" size={16} /> Submitting...
                      </>
                    ) : currentQIndex === 15 ? (
                      "Submit Assessment"
                    ) : (
                      <>
                        Next <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </main>
          </div>
        )}

        {/* Phase 3: Results Dashboard */}
        {activePhase === "result" && latestResult && (
          <div className="assessment-page-container results-layout">

            {/* Left Side: Score summary and radial chart */}
            <section className="results-left-panel">
              <div className="results-header-card">
                <div className="title-row">
                  <h2>Assessment Result</h2>
                  <span className="badge-completed">Completed</span>
                </div>
                <p className="timestamp">
                  Completed on {new Date(latestResult.createdAt).toLocaleDateString()} at {new Date(latestResult.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>

                <div className="scores-cards-grid">
                  <div className="score-card">
                    <h4>Depression Score (PHQ-9)</h4>
                    <div className="score-number-row">
                      <span className="score-value">{latestResult.phq9Score}</span>
                      <span className="score-total">/ 27</span>
                    </div>
                    <span className={`severity-tag ${getSeverityBadgeColor(latestResult.depressionSeverity)}`}>
                      {latestResult.depressionSeverity}
                    </span>
                  </div>

                  <div className="score-card">
                    <h4>Anxiety Score (GAD-7)</h4>
                    <div className="score-number-row">
                      <span className="score-value">{latestResult.gad7Score}</span>
                      <span className="score-total">/ 21</span>
                    </div>
                    <span className={`severity-tag ${getSeverityBadgeColor(latestResult.anxietySeverity)}`}>
                      {latestResult.anxietySeverity}
                    </span>
                  </div>

                  <div className="score-card circular-score-card">
                    <h4>Overall Wellness</h4>
                    <div className="radial-progress-wrapper">
                      <svg width="100" height="100" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" className="radial-bg" strokeWidth="10" fill="transparent" />
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          className="radial-progress-circle"
                          strokeWidth="10"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 50}
                          strokeDashoffset={2 * Math.PI * 50 * (1 - latestResult.overallWellnessScore / 100)}
                        />
                      </svg>
                      <div className="radial-label-inner">
                        <h3>{latestResult.overallWellnessScore}%</h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="clinical-summary-card">
                <h3>Summary</h3>
                <p>{latestResult.summary}</p>
                <div className="summary-banner-image">
                  <div className="brain-glow-art">🧠 ✨</div>
                </div>
              </div>

              <div className="results-footer-actions">
                <a href="/bookAppointment" className="btn-primary flex-center">
                  Book Appointment
                </a>
                <button className="btn-secondary" onClick={handleStartAssessment}>
                  Take Assessment Again
                </button>
                <a href="/dashboard" className="btn-tertiary">
                  Return to Dashboard
                </a>
              </div>
            </section>

            {/* Right Side: AI-Powered Insights */}
            <section className="results-right-panel">
              <div className="insights-card">
                <h2>✨ AI-Powered Insights & Recommendations</h2>

                <div className="insight-section">
                  <h3>AI Summary</h3>
                  <div className="ai-summary-box">
                    <p>{latestResult.aiSummary}</p>
                    <span className="ai-heart-icon">❤️</span>
                  </div>
                </div>

                <div className="insight-section">
                  <h3>Personalized Recommendations</h3>
                  <ul className="recommendations-list">
                    {latestResult.recommendations.map((rec, i) => (
                      <li key={i}>
                        <CheckCircle2 className="rec-check-icon" size={16} />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="recommendations-illustration">
                    <div className="meditate-icon-glow">🧘‍♀️</div>
                  </div>
                </div>

                <div className="insight-section">
                  <h3>Lifestyle Suggestions</h3>
                  <div className="lifestyle-row">
                    {latestResult.lifestyleSuggestions.map((suggestion) => (
                      <div key={suggestion} className="lifestyle-badge-item">
                        {getLifestyleIcon(suggestion)}
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="insight-section next-steps-section">
                  <h3>Next Steps</h3>
                  <p>We strongly encourage you to speak with a licensed mental health professional to get the support you deserve.</p>
                  <a href="/bookAppointment" className="btn-primary btn-next-steps">
                    Book an Appointment <ArrowRight size={16} />
                  </a>
                </div>

                <div className="disclaimer-note-card">
                  <AlertTriangle className="disclaimer-alert-icon" size={20} />
                  <p>
                    <strong>Disclaimer:</strong> This assessment is not a medical diagnosis. It is intended to help you understand your mental well-being and encourage you to seek professional support.
                  </p>
                </div>
              </div>
            </section>

          </div>
        )}

      </div>
    </div>
  );
};

export default Assessments;
