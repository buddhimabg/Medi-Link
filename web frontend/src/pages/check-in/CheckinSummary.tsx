// @ts-nocheck
// pages/check-in/CheckinSummary.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from "../../components/Sidebar";
import "./CheckinSummary.css";
import { useMoodStore } from "../../store/moodStore";
import { updateCheckIn } from "../../api/moodApi";
import { PageLoadingSpinner, InlineAlert } from "../../components/ui";

// Type definitions for summary data
interface SummaryData {
  date: string;
  time: string;
  mood: string;
  note?: string;
  levels: { [key: string]: number | null | undefined };
  moodScore?: number | null;
  questionsCompleted: number;
  totalQuestions: number;
  checkInStreak: number;
  checkInId?: string;
}

const CheckinSummary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [shareWithDoctor, setShareWithDoctor] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [savingSharePreference, setSavingSharePreference] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  const lastSubmission = useMoodStore((state) => state.lastSubmission);

  // Load summary data from backend response carried through navigation state
  useEffect(() => {
    const mergedSummary = lastSubmission 
      ? { ...lastSubmission, ...location.state } 
      : location.state;

    if (mergedSummary) {
      const data = { ...mergedSummary };

      // Reconstruct levels if it is flat (which is the case for backend responses)
      if (!data.levels) {
        data.levels = {
          sleepLevel: data.sleepLevel,
          anxietyLevel: data.anxietyLevel,
          energyLevel: data.energyLevel,
          motivationLevel: data.motivationLevel,
          socialInteraction: data.socialInteraction,
          stressLevel: data.stressLevel,
          focusLevel: data.focusLevel,
        };
      }

      // Reconstruct date/time from createdAt if missing
      if (!data.date && data.createdAt) {
        const d = new Date(data.createdAt);
        data.date = d.toLocaleDateString();
      }
      if (!data.time && data.createdAt) {
        const d = new Date(data.createdAt);
        data.time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      // Fallbacks if still missing
      if (!data.date) {
        data.date = new Date().toLocaleDateString();
      }
      if (!data.time) {
        data.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      data.checkInId = data.checkInId ?? data._id ?? data.id;

      // Use backend mentalHealthScore if available (preferred, computed by scoreEngine.js).
      // Fallback below is only used when backend score is missing (e.g. navigation edge cases).
      // Fallback mirrors scoreEngine.js: mood mapping, positive factors, negative factors, clamped 0-10.
      let fallbackScore = null;
      const moodMap: Record<string, number> = { terrible: 0, sad: 4, okay: 6, good: 8, great: 10 };
      const moodVal = moodMap[String(data.mood || '').toLowerCase()];
      const moodScore = moodVal !== undefined ? moodVal : 5;
      const sleepV = Number(data.levels?.sleepLevel ?? 5);
      const energyV = Number(data.levels?.energyLevel ?? 5);
      const motivationV = Number(data.levels?.motivationLevel ?? 5);
      const socialV = Number(data.levels?.socialInteraction ?? 5);
      const focusV = Number(data.levels?.focusLevel ?? 5);
      const anxietyV = Number(data.levels?.anxietyLevel ?? 5);
      const stressV = Number(data.levels?.stressLevel ?? 5);
      const positive = moodScore * 0.15 + sleepV * 0.12 + energyV * 0.10 + motivationV * 0.10 + socialV * 0.10 + focusV * 0.08;
      const negative = anxietyV * 0.20 + stressV * 0.15;
      const computed = (positive - negative * 0.5) / 0.75;
      fallbackScore = Number(Math.max(0, Math.min(10, computed)).toFixed(1));

      data.moodScore = (data.mentalHealthScore !== undefined && data.mentalHealthScore !== null)
        ? Number(data.mentalHealthScore)
        : fallbackScore;

      const LEVEL_FIELDS = ['sleepLevel', 'anxietyLevel', 'energyLevel', 'motivationLevel', 'socialInteraction', 'stressLevel', 'focusLevel'];
      data.questionsCompleted = LEVEL_FIELDS.filter((k) => data.levels?.[k] != null).length;
      data.totalQuestions = LEVEL_FIELDS.length;
      data.checkInStreak = Number(data.checkInStreak ?? 0);
      setSummaryData(data);
    } else {
      navigate('/dashboard');
    }
  }, [location.state, lastSubmission, navigate]);

  if (!summaryData) {
    return (
      <div className="flex bg-[#F8FAFC] min-h-screen">
        <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
          <PageLoadingSpinner message="Loading summary…" />
        </main>
      </div>
    );
  }

  // Handle download as text file
  const handleDownload = () => {
    const summaryText = `
MEDILINK - MOOD CHECK-IN SUMMARY
================================
Date: ${summaryData.date} at ${summaryData.time}
Check-in ID: ${summaryData.checkInId}

YOUR MOOD TODAY
---------------
Mood: ${summaryData.mood}
Note: "${summaryData.note || 'No note added'}"

TODAY'S LEVELS (1-10 scale)
---------------------------
${Object.entries(summaryData.levels)
          .filter(([, v]) => v != null && v !== undefined)
          .map(([key, value]) => `• ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}/10`).join('\n')}

YOUR STATS
----------
• Mood Score: ${summaryData.moodScore}/10
• Questions Completed: ${summaryData.questionsCompleted}/${summaryData.totalQuestions}
• Check-in Streak: ${summaryData.checkInStreak} days

Thank you for tracking your mental health journey with MediLink!
    `;
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mood-checkin-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleShare = async () => {
    const shareText = `MediLink Mood Check-in
Date: ${summaryData.date}
Mood: ${summaryData.mood}
Mood Score: ${summaryData.moodScore}/10
Streak: ${summaryData.checkInStreak} days`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Mood Check-in Summary', text: shareText, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }
    } catch (err) {
      // Share cancelled or failed by user
    }
  };

  const getBarColor = (levelName: string, value: number | null | undefined) => {
    if (value == null) return '#CCCCCC'; // fallback for missing values
    const lower = levelName.toLowerCase();
    if (lower.includes('anxiety') || lower.includes('stress')) {
      return value <= 3 ? '#10B981' : value <= 6 ? '#F59E0B' : '#EF4444';
    }
    return value >= 7 ? '#10B981' : value >= 4 ? '#0C5BD5' : '#F59E0B';
  };

  const getMoodColor = (mood) => {
    const moodMap = {
      'terrible': '#8B0000',
      'sad': '#4A6FA5',
      'okay': '#F4A261',
      'good': '#2A9D8F',
      'great': '#0C5BD5'
    };
    return moodMap[mood?.toLowerCase()] || '#0C5BD5';
  };

  const getMoodEmoji = (mood) => {
    const moodMap = {
      'terrible': '😫',
      'sad': '😔',
      'okay': '😐',
      'good': '🙂',
      'great': '😊'
    };
    return moodMap[mood?.toLowerCase()] || '🙂';
  };



  const persistSharePreference = async (shouldShare) => {
    if (!summaryData?.checkInId) {
      console.error('No checkInId available');
      return;
    }

    setSavingSharePreference(true);
    try {
      await updateCheckIn(summaryData.checkInId, {
        shareWithDoctor: shouldShare,
      });
      useMoodStore.getState().setLastFetchedDashboard(null);
      useMoodStore.getState().setLastFetchedMoodHistory(null);
      useMoodStore.getState().setLastFetchedInsights(null);
    } catch (error) {
      console.error('Failed to persist shareWithDoctor preference', error);
    } finally {
      setSavingSharePreference(false);
    }
  };

  const handleShareWithDoctorToggle = async () => {
    const nextValue = !shareWithDoctor;
    setShareWithDoctor(nextValue);
    await persistSharePreference(nextValue);
  };

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen">
      <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'} p-6 overflow-y-auto`}>
        <div className="w-full max-w-6xl mx-auto">
          {downloadSuccess && (
          <div className="fixed top-4 right-4 z-50 w-80 animate-slide-in">
            <InlineAlert type="success" message="Downloaded successfully!" onClose={() => setDownloadSuccess(false)} />
          </div>
        )}
        {shareSuccess && (
          <div className="fixed top-4 right-4 z-50 w-80 animate-slide-in">
            <InlineAlert type="success" message="Copied to clipboard!" onClose={() => setShareSuccess(false)} />
          </div>
        )}

        {/* Header with Download/Share */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-medium text-gray-800">Check-in Summary</h1>
            <p className="text-sm text-gray-500 mt-1">Review your responses</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleDownload} className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-[#0C5BD5] hover:text-[#0C5BD5] transition-all duration-300 group" title="Download summary">
              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button onClick={handleShare} className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-[#0C5BD5] hover:text-[#0C5BD5] transition-all duration-300 group" title="Share summary">
              <svg className="w-5 h-5 text-gray-600 group-hover:text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Completion Message */}
        <div className="bg-green-100 rounded-xl p-6 shadow-sm border border-green-200 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Check-in Completed!</h2>
              <p className="text-sm text-gray-500">Thank you for tracking your mood today</p>
            </div>
          </div>
        </div>

        {/* Share with Doctor Toggle */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#0C5BD5] mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0C5BD5]/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700">Share with Doctor</h3>
                <p className="text-xs text-gray-500">Allow your healthcare provider to view this check-in data</p>
              </div>
            </div>
            <button
              onClick={handleShareWithDoctorToggle}
              disabled={savingSharePreference}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 ${shareWithDoctor ? 'bg-[#0C5BD5]' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${shareWithDoctor ? 'translate-x-6' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Left Column - Mood */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#0C5BD5]/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-700">Your Mood Today</h3>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{getMoodEmoji(summaryData.mood)}</span>
                <span className="text-xl font-semibold" style={{ color: getMoodColor(summaryData.mood) }}>
                  {summaryData.mood}
                </span>
              </div>
              <p className="text-xs text-gray-400">{summaryData.date} at {summaryData.time}</p>
            </div>

            {summaryData.note && (
              <div className="bg-[#F8FAFC] rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600 italic">"{summaryData.note}"</p>
              </div>
            )}

            {/* Quick Stats - Using streak from Zustand store */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-[#F8FAFC] rounded-lg">
                <p className="text-xs text-gray-400">Mood Score</p>
                <p className="text-lg font-semibold text-[#0C5BD5]">{summaryData.moodScore}/10</p>
              </div>
              <div className="text-center p-2 bg-[#F8FAFC] rounded-lg">
                <p className="text-xs text-gray-400">Completed</p>
                <p className="text-lg font-semibold text-[#0C5BD5]">{summaryData.questionsCompleted}/{summaryData.totalQuestions}</p>
              </div>
              <div className="text-center p-2 bg-[#F8FAFC] rounded-lg">
                <p className="text-xs text-gray-400">Streak</p>
                <p className="text-lg font-semibold text-[#0C5BD5]">{summaryData.checkInStreak}d</p>
              </div>
            </div>
          </div>

          {/* Right Column - Levels */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#0C5BD5]/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6h6zm10 0v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6h6zm-10 0v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6h6z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-700">Today's Levels</h3>
            </div>

            {/* Levels Bars */}
            <div className="space-y-3">
              {Object.entries(summaryData.levels)
                .filter(([, v]) => v != null && v !== undefined)
                .map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500 capitalize">{key}</span>
                      <span className="text-xs font-medium" style={{ color: getBarColor(key, value) }}>{value}/10</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full" style={{ width: `${(value/10)*100}%`, backgroundColor: getBarColor(key, value) }}></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Personalized Activities Section */}
        <div className="bg-linear-to-r from-[#0C5BD5]/10 to-[#2A7DE1]/10 rounded-xl p-5 shadow-sm border border-[#0C5BD5]/20 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0C5BD5]/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#0C5BD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-800">Based on your responses...</h3>
              <p className="text-sm text-gray-600 mt-1">We've curated personalized mood fix activities for you</p>
            </div>
            <button 
              onClick={() => navigate('/mood-fix', { state: { source: 'summary', mood: summaryData?.mood, showLatestOnly: true } })}
              className="px-4 py-2 bg-[#0C5BD5] text-white rounded-lg text-sm font-medium hover:bg-[#0A4AB0] transition-all duration-300 shadow-sm flex items-center gap-1"
            >
              View Suggestion
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ===== SMALL ACTION BUTTONS ===== */}
        <div className="flex justify-end gap-3 mt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:border-[#0C5BD5] hover:text-[#0C5BD5] transition-all duration-300 shadow-sm"
          >
            Back to Dashboard
          </button>

          <button
            onClick={() => navigate('/mood-fix', { state: { source: 'summary', mood: summaryData?.mood, showLatestOnly: true } })}
            className="px-5 py-2 bg-[#0C5BD5] text-white rounded-lg text-sm font-medium hover:bg-[#0A4AB0] transition-all duration-300 shadow-sm"
          >
            View Mood Fix Suggestions
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Your responses help us provide better personalized suggestions
        </p>
        </div>
      </main>
    </div>
  );
};

export default CheckinSummary;
