import { useMemo, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Camera } from 'lucide-react';
import { fetchMoodFixActivities, saveMoodAfterFeedback } from "../api/moodApi";
import { getCurrentUserId } from "../config";
import { useMoodStore } from "../store/moodStore";
import './MoodFixActivityDetail.css';
import { PageLoadingSpinner, InlineAlert, EmptyState, LoadingButton } from "../components/ui";

type DetectionStatus = 'idle' | 'loading' | 'success' | 'failed' | 'error';

const MOOD_EMOJI: Record<string, string> = {
  great: '😁', good: '😊', okay: '🙂', sad: '🙁', terrible: '☹️',
};
const MOOD_COLOR: Record<string, string> = {
  great: '#10b981', good: '#3b82f6', okay: '#f59e0b', sad: '#8b5cf6', terrible: '#ef4444',
};

interface Activity {
  id: string;
  title: string;
  duration: string;
  difficulty: string;
  focusTag: string;
  benefit: string;
  description: string;
  moods: string[];
  steps: string[];
}

const parseDurationMin = (value: string | number | undefined): number => {
  const n = Number(String(value || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 5;
};

const scoreToMoodLabel = (value: number | null): string => {
  if (value === null || value <= 0) return "Not recorded";
  if (value <= 2) return "Terrible";
  if (value <= 4) return "Sad";
  if (value <= 6) return "Okay";
  if (value <= 8) return "Good";
  return "Great";
};

const formatTimer = (seconds: number): string => {
  const safe = Math.max(0, Number(seconds) || 0);
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const splitTimer = (seconds: number): { minutes: number; seconds: number } => {
  const safe = Math.max(0, Number(seconds) || 0);
  return {
    minutes: Math.floor(safe / 60),
    seconds: safe % 60,
  };
};

const formatCompletionDate = (value: number | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const MoodFixActivityDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activityId } = useParams<{ activityId: string }>();
  const [collapsed, setCollapsed] = useState(false);
  const [savingError, setSavingError] = useState("");
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [detectedMood, setDetectedMood] = useState<string>('');
  const [detectedConfidence, setDetectedConf] = useState<number>(0);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>('idle');
  const [detectionError, setDetectionError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [catalogActivities, setCatalogActivities] = useState<Activity[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  const activity = useMemo<Activity | null>(
    () => catalogActivities.find((item) => item.id === activityId) ?? null,
    [activityId, catalogActivities]
  );

  const [stepStatus, setStepStatus] = useState<boolean[]>(() =>
    activity ? activity.steps.map(() => false) : []
  );
  const [completedAt, setCompletedAt] = useState<number | null>(null);
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
        const data: any[] = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];

        if (mounted) {
          setCatalogActivities(
            data.map((item: any) => ({
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
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
          <PageLoadingSpinner message="Loading activity…" />
        </main>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Mood Fix" strictActive collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
          <EmptyState 
            title="Activity not found"
            description="The activity you're looking for doesn't exist or has been removed."
            actionLabel="Back to Mood Fix"
            onAction={() => navigate("/mood-fix")}
          />
        </main>
      </div>
    );
  }

  const completedSteps = stepStatus.filter(Boolean).length;
  const totalSteps = activity.steps.length;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);
  const timeTakenLabel = elapsedSeconds > 0 ? formatTimer(elapsedSeconds) : "Not started";
  const timerParts = splitTimer(timerSeconds);
  const completionDateLabel = formatCompletionDate(completedAt);

  const handleDetectMood = async () => {
    setDetectionStatus('loading');
    setDetectedMood('');
    setDetectedConf(0);
    setDetectionError('');
    let stream: MediaStream | null = null;
    try {
      const [tf, faceapi] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@vladmandic/face-api')
      ]);
      await tf.setBackend('webgl');
      await tf.ready();
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
      }
      if (!faceapi.nets.faceExpressionNet.isLoaded) {
        await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
      }

      const video = videoRef.current;
      if (!video) { setDetectionStatus('error'); setDetectionError('Video element not available.'); return; }

      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      await video.play();
      await new Promise(r => setTimeout(r, 800));

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
        .withFaceExpressions();

      stream.getTracks().forEach(t => t.stop());
      video.srcObject = null;

      if (detection?.expressions) {
        const exps = detection.expressions as unknown as Record<string, number>;
        const entries = Object.entries(exps || {});
        if (!entries.length) {
          setDetectionStatus('failed');
          setDetectionError('No expressions detected. Please try again.');
          return;
        }
        const [expr, conf] = entries.reduce((a, b) => a[1] > b[1] ? a : b, entries[0]);
        const moodMap: Record<string, string> = {
          happy: 'great', neutral: 'okay', sad: 'sad',
          angry: 'terrible', fearful: 'terrible', disgusted: 'terrible', surprised: 'good',
        };
        const mapped = moodMap[expr] || 'okay';
        setDetectedMood(mapped);
        setDetectedConf(conf);
        setDetectionStatus('success');
      } else {
        setDetectionStatus('failed');
        setDetectionError('No face detected. Please ensure your face is clearly visible and well-lit, then try again.');
      }
    } catch (err: any) {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      console.error(err);
      setDetectionStatus('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        setDetectionError('Camera permission denied. Please allow camera access in your browser settings.');
      else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')
        setDetectionError('No camera found. Please connect a camera and try again.');
      else if (err.name === 'NotReadableError')
        setDetectionError('Camera is in use by another app. Please close other apps using the camera.');
      else
        setDetectionError('Failed to detect mood. Please check your camera and try again.');
    }
  };

  const confirmDetectedMood = () => {
    const moodScoreMap: Record<string, number> = {
      great: 10,
      good: 8,
      okay: 6,
      sad: 4,
      terrible: 2,
    };
    if (detectedMood && moodScoreMap[detectedMood]) {
      setMoodAfter(moodScoreMap[detectedMood]);
    }
    setDetectionStatus('idle');
    setDetectedMood('');
  };

  const dismissDetectedMood = () => {
    setDetectedMood('');
    setDetectionStatus('idle');
  };

  const resetDetection = () => {
    setDetectionStatus('idle');
    setDetectedMood('');
    setDetectedConf(0);
    setDetectionError('');
  };

  const updateTimer = (minutes: string | number, seconds: string | number) => {
    const nextMinutes = Number(minutes);
    const nextSeconds = Number(seconds);
    const safeMinutes = Number.isFinite(nextMinutes) && nextMinutes > 0 ? nextMinutes : 0;
    const safeSeconds = Number.isFinite(nextSeconds) && nextSeconds > 0 ? nextSeconds : 0;
    setTimerSeconds(Math.max(0, safeMinutes * 60 + safeSeconds));
  };

  const toggleStep = (index: number) => {
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

    if (moodAfter === null) {
      setNotice("Please select how you feel after completing the activity.");
      setTimeout(() => setNotice(""), 3000);
      return;
    }

    const now = Date.now();
    setCompletedAt(now);
    setTimerRunning(false);
    setIsCompleting(true);

    try {
      const raw = localStorage.getItem("moodfix-completed");
      const parsed = raw ? JSON.parse(raw) : [];
      const list: string[] = Array.isArray(parsed) ? parsed : [];
      if (!list.includes(activity.id)) {
        localStorage.setItem("moodfix-completed", JSON.stringify([...list, activity.id]));
      }

      const metaRaw = localStorage.getItem("moodfix-completed-meta");
      const metaParsed = metaRaw ? JSON.parse(metaRaw) : {};
      const meta: Record<string, unknown> =
        metaParsed && typeof metaParsed === "object" && !Array.isArray(metaParsed)
          ? metaParsed
          : {};
      localStorage.setItem(
        "moodfix-completed-meta",
        JSON.stringify({
          ...meta,
          [activity.id]: {
            completedAt: new Date(now).toISOString(),
          },
        })
      );
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
      useMoodStore.getState().setLastFetchedDashboard(null);
      useMoodStore.getState().setLastFetchedMoodHistory(null);
      useMoodStore.getState().setLastFetchedInsights(null);
    } catch (error) {
      console.error("Failed to save mood feedback", error);
      // Continue with UI success message even if DB save fails
    }

    const moodAfterLabel = scoreToMoodLabel(moodAfter);
    setNotice(`Completed. After mood: ${moodAfterLabel}. Great job finishing ${activity.title}.`);
    setIsCompleting(false);
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
            <div className="mb-6 animate-slide-in">
              <InlineAlert 
                type={completedAt ? "success" : "warning"} 
                message={notice} 
                autoCloseMs={4000} 
                onClose={() => setNotice("")} 
              />
            </div>
          )}

          {savingError && (
            <div className="mb-6">
              <InlineAlert 
                type="error" 
                message={savingError} 
                onClose={() => setSavingError("")} 
              />
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
              {/* Left column */}
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
                    <p className="text-sm font-semibold text-gray-800">{location.state?.mood || "Not recorded"}</p>
                  </div>
                  {completedAt && (
                    <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 md:col-span-3">
                      <p className="text-xs text-green-600">Completed On</p>
                      <p className="text-sm font-semibold text-green-800">{completionDateLabel}</p>
                    </div>
                  )}
                </div>

                <p className="text-base text-gray-700 mt-5">{activity.description}</p>

                {/* Steps header */}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">Steps</h3>
                  <p className="text-xs text-gray-500">Tap a step to mark complete</p>
                </div>

                {/* Steps list */}
                <div className="mt-3 space-y-2 max-h-[52vh] overflow-y-auto pr-1">
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

              {/* Right sidebar */}
              <aside className="lg:col-span-4">
                <div className="sticky top-6 space-y-4">
                  <div className="rounded-2xl border border-[#0C5BD533] bg-[#F6F9FF] p-4">
                    <p className="text-xs text-gray-500">Guided Timer</p>
                    <p className="text-2xl font-bold text-[#0C5BD5] tracking-wide mt-1">{formatTimer(timerSeconds)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="block text-[11px] font-medium text-gray-500 mb-1">Minutes</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={timerParts.minutes}
                          onChange={(event) => updateTimer(event.target.value, timerParts.seconds)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#0C5BD5]"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-medium text-gray-500 mb-1">Seconds</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={timerParts.seconds}
                          onChange={(event) => updateTimer(timerParts.minutes, event.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#0C5BD5]"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => setTimerRunning((prev) => !prev)}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-[#0C5BD5] text-white hover:bg-[#0A4AB0]"
                      >
                        {timerRunning ? "Pause" : "Start"}
                      </button>
                      <button
                        onClick={() => {
                          setTimerRunning(false);
                          setTimerSeconds(estimatedMin * 60);
                          setElapsedSeconds(0);
                        }}
                        className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:border-[#0C5BD5]"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Mood selector */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">How do you feel after?</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { value: 10, label: 'Great', emoji: '😁' },
                        { value: 8,  label: 'Good',  emoji: '😊' },
                        { value: 6,  label: 'Okay',  emoji: '🙂' },
                        { value: 4,  label: 'Sad',   emoji: '🙁' },
                        { value: 2,  label: 'Terrible', emoji: '☹️' },
                      ].map((m) => (
                        <button
                          key={m.value}
                          onClick={() => setMoodAfter(m.value)}
                          className={`flex flex-col items-center py-2 rounded-xl transition ${
                            moodAfter === m.value
                              ? "bg-[#0C5BD5] text-white shadow"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          <span className="text-lg">{m.emoji}</span>
                          <span className="text-[10px] mt-0.5 font-medium">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Camera detect */}
                  <div className="rounded-2xl border border-[#0C5BD533] bg-[#F6F9FF] p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Camera size={16} className="text-[#0C5BD5]" />
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide m-0">Auto-detect mood</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Use your camera to detect how you feel right now</p>

                    {detectionStatus === 'idle' && (
                      <button
                        onClick={handleDetectMood}
                        className="sma-cam-btn w-full justify-center"
                      >
                        <Camera size={15} strokeWidth={2} /> Detect mood with camera
                      </button>
                    )}

                    {detectionStatus === 'loading' && (
                      <div className="sma-loading-row py-2 justify-center">
                        <div className="sma-spinner" />
                        <span className="sma-loading-text">Analyzing expression…</span>
                      </div>
                    )}

                    {detectionStatus === 'success' && detectedMood && (
                      <div className="sma-result-card mt-2 bg-white">
                        <div className="sma-result-mood-row">
                          <span className="sma-result-emoji">{MOOD_EMOJI[detectedMood]}</span>
                          <div className="sma-result-info">
                            <span className="sma-result-name" style={{ color: MOOD_COLOR[detectedMood] }}>
                              {detectedMood}
                            </span>
                            <div className="sma-conf-row">
                              <span className="sma-conf-label">Confidence</span>
                              <div className="sma-conf-bar">
                                <div
                                  className="sma-conf-fill"
                                  style={{ width: `${Math.round(detectedConfidence * 100)}%`, background: MOOD_COLOR[detectedMood] }}
                                />
                              </div>
                              <span className="sma-conf-pct">{Math.round(detectedConfidence * 100)}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="sma-result-actions">
                          <button onClick={confirmDetectedMood} className="sma-btn-accept">✓ Accept</button>
                          <button onClick={handleDetectMood} className="sma-btn-retry">🔄 Retry</button>
                          <button onClick={dismissDetectedMood} className="sma-btn-cancel">✕</button>
                        </div>
                      </div>
                    )}

                    {detectionStatus === 'failed' && (
                      <div className="sma-failed-card mt-2">
                        <div className="sma-failed-header-row">
                          <span className="sma-failed-emoji">😶</span>
                          <div>
                            <div className="sma-failed-title">No Face Detected</div>
                            <div className="sma-failed-desc">Ensure you're visible and well-lit.</div>
                          </div>
                        </div>
                        <ul className="sma-tips-list">
                          <li>💡 Face the camera directly</li>
                          <li>💡 Good lighting, avoid backlight</li>
                          <li>💡 Move closer to the camera</li>
                        </ul>
                        <div className="sma-result-actions mt-2">
                          <button onClick={handleDetectMood} className="sma-cam-btn" style={{ flex: 1, justifyContent: 'center' }}>🔄 Try Again</button>
                          <button onClick={resetDetection} className="sma-btn-cancel">✕</button>
                        </div>
                      </div>
                    )}

                    {detectionStatus === 'error' && (
                      <div className="sma-error-card mt-2">
                        <div className="sma-failed-header-row">
                          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                          <div>
                            <div className="sma-error-title">Camera Error</div>
                            <div className="sma-failed-desc">{detectionError}</div>
                          </div>
                        </div>
                        <div className="sma-result-actions mt-2">
                          <button onClick={handleDetectMood} className="sma-cam-btn" style={{ flex: 1, justifyContent: 'center' }}>🔄 Retry</button>
                          <button onClick={resetDetection} className="sma-btn-cancel">✕</button>
                        </div>
                      </div>
                    )}

                    <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
                  </div>

                  {/* Complete activity button */}
                  <LoadingButton
                    isLoading={isCompleting}
                    loadingText="Completing…"
                    onClick={completeActivity}
                    className="w-full mt-3 rounded-2xl py-3"
                  >
                    ✅ Complete Mood Fix Activity
                  </LoadingButton>

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
