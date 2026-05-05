// App.tsx
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Dashboard from "./pages/Dashboard";
import CheckInPage1 from "./pages/CheckInPage1";
import CheckInPage2 from "./pages/CheckInPage2";
import CheckinSummary from "./pages/CheckinSummary";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerpage";
import LandingPage from "./pages/landingpage";
import MoodHistory from "./pages/MoodHistory";
import InsightsPage from "./pages/InsightsPage";
import MoodFixPage from "./pages/MoodFixPage";
import MoodFixActivityDetail from "./pages/MoodFixActivityDetail";
import FeaturePage from "./pages/FeaturePage";
import ReportAnalysisPage from "./pages/ReportAnalysisPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import NotificationsPage from "./pages/NotificationsPage";
import RemindersPage from "./pages/RemindersPage";

import "./App.css";

const App: React.FC = () => {
  useEffect(() => {
    // (Optional) You can keep other startup logic here later
    // Removed reminder/notification logic as requested
  }, []);

  return (
    <Router>
      <Routes>
        {/* Default */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/home" element={<LandingPage />} />

        {/* Check-in flow */}
        <Route path="/check-in" element={<CheckInPage1 />} />
        <Route path="/check-in/details" element={<CheckInPage2 />} />
        <Route path="/check-in/summary" element={<CheckinSummary />} />

        {/* Core features */}
        <Route path="/history" element={<MoodHistory />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/reminders" element={<RemindersPage />} />

        {/* Mood fix */}
        <Route path="/mood-fix" element={<MoodFixPage />} />
        <Route
          path="/mood-fix/activity/:activityId"
          element={<MoodFixActivityDetail />}
        />

        {/* Reports */}
        <Route path="/reports" element={<ReportAnalysisPage />} />
        <Route path="/reports/:reportId" element={<ReportDetailPage />} />

        <Route
          path="/appointments/book"
          element={
            <FeaturePage
              activePage="Book Appointment"
              title="Book Appointment"
              description="Schedule and manage your upcoming care sessions from one place."
            />
          }
        />

        <Route
          path="/appointments/history"
          element={
            <FeaturePage
              activePage="Appointment History"
              title="Appointment History"
              description="Review your previous sessions, summaries, and visit timelines."
            />
          }
        />

        <Route
          path="/journal"
          element={
            <FeaturePage
              activePage="Journal Reading"
              title="Journal Reading"
              description="Explore articles, notes, and recommended readings in your workspace."
            />
          }
        />

        <Route
          path="/settings"
          element={
            <FeaturePage
              activePage="Settings"
              title="Settings"
              description="Customize your app preferences, notification behavior, and profile options."
            />
          }
        />

        <Route
          path="/logout"
          element={
            <FeaturePage
              activePage="Logout"
              title="Logout"
              description="Sign-out controls can be connected here to your authentication workflow."
            />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;