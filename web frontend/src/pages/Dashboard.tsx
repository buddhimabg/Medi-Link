// @ts-nocheck
import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import { useNavigate, useLocation } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import PatientTopNav from "../component/PatientTopNav";
import StatsCard from "../components/StatsCard";
import QuickActionCard from "../components/QuickActionCard";

import AverageIcon from "../assets/AverageIcon";
import StreakIcon from "../assets/StreakIcon";
import RecoveryIcon from "../assets/RecoveryIcon";
import InsightIcon from "../assets/InsightIcon";
import MoodFixIcon from "../assets/MoodFixIcon";
import HistoryIcon from "../assets/HistoryIcon";

import { useDashboardData } from "../hooks/useMood";
import { PageLoadingSpinner, PageErrorState, InlineAlert } from "../components/ui";

const WeeklyMoodChart = React.memo(({ data }) => {
  if (!data || data.length === 0) return <div className="text-gray-500 text-sm py-6 text-center">No mood data available</div>;
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="w-24 text-sm text-gray-600">{item?.displayDate || "-"}</span>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0C5BD5] rounded-full transition-all duration-500"
                style={{ width: `${((item?.value || 0) / 10) * 100}%`, opacity: item?.hasData ? 1 : 0.3 }}
              />
            </div>
            <span className="w-12 text-right text-sm text-gray-700">{item?.value?.toFixed(1) || 0}/10</span>
          </div>
        </div>
      ))}
    </div>
  );
});

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dashboardData, loading, error } = useDashboardData();

  const [collapsed, setCollapsed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (location.state?.checkInSuccess) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  if (loading) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
          <PatientTopNav />
          <PageLoadingSpinner message="Loading dashboard…" />
        </main>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
          <PatientTopNav />
          <div className="p-8">
            <PageErrorState message="We couldn't load your dashboard. Please try again." />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
        <PatientTopNav />
        <div className="p-8">
        {showSuccess && (
          <div className="fixed bottom-4 right-4 z-50 w-80 animate-slide-in">
            <InlineAlert type="success" message="Check-in completed!" onClose={() => setShowSuccess(false)} />
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Mood Track Dashboard</h1>
            <p className="text-gray-500 mt-1">Track your emotional wellbeing inside the mood module</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <StatsCard icon={AverageIcon} title="7-Day Average" value={`${dashboardData.sevenDayAverage}/10`} />
            <StatsCard icon={StreakIcon} title="Check-in Streak" value={`${dashboardData.checkInStreak} days`} />
            <StatsCard icon={RecoveryIcon} title="Recovery Score" value={`${dashboardData.recoveryScore}%`} />
          </div>

          <div className="bg-[#0C5BD522] rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Daily Check-in</h2>
              <p className="text-sm opacity-90 mt-1">How are you feeling today?</p>
            </div>
            <button onClick={() => navigate("/check-in")} className="bg-black text-white px-8 py-3 rounded-xl hover:bg-gray-900 transition">Start Check-in →</button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">This Week's Mood Trends</h2>
              <WeeklyMoodChart data={dashboardData.weeklyData} />
              <button
                onClick={() => navigate("/mood-history")}
                className="mt-6 w-full bg-[#0C5BD5] text-white py-2 rounded-lg hover:bg-[#0A4AB0]"
              >
                View Full History
              </button>
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Quick Action</h2>
              <QuickActionCard
                icon={InsightIcon}
                title="Insight"
                description="See patterns & trends"
                onClick={() => navigate("/insights")}
              />
              <QuickActionCard
                icon={MoodFixIcon}
                title="Mood Fix"
                description="Activities to feel better"
                onClick={() => navigate("/mood-fix", { state: { showLatestOnly: true } })}
              />
              <QuickActionCard
                icon={HistoryIcon}
                title="History"
                description="View past check-ins"
                onClick={() => navigate("/mood-history")}
              />
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;