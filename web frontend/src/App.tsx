// App.tsx
import React, { useEffect, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { PageLoadingSpinner } from "./components/ui";

// Pages
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const CheckInPage1 = React.lazy(() => import("./pages/check-in/CheckInPage1"));
const CheckInPage2 = React.lazy(() => import("./pages/check-in/CheckInPage2"));
const CheckInPage3 = React.lazy(() => import("./pages/check-in/CheckInPage3"));
const CheckinSummary = React.lazy(() => import("./pages/check-in/CheckinSummary"));
const LoginPage = React.lazy(() => import("./pages/loginPage"));
const RegisterPage = React.lazy(() => import("./pages/registerpage"));
const LandingPage = React.lazy(() => import("./pages/landingpage"));
const MoodHistory = React.lazy(() => import("./pages/MoodHistory"));
const InsightsPage = React.lazy(() => import("./pages/InsightsPage"));
const MoodFixPage = React.lazy(() => import("./pages/MoodFixPage"));
const MoodFixActivityDetail = React.lazy(() => import("./pages/MoodFixActivityDetail"));
const FeaturePage = React.lazy(() => import("./pages/FeaturePage"));
const ReportAnalysisPage = React.lazy(() => import("./pages/ReportAnalysisPage"));
const ReportDetailPage = React.lazy(() => import("./pages/ReportDetailPage"));
const NotificationsPage = React.lazy(() => import("./pages/NotificationsPage"));
const RemindersPage = React.lazy(() => import("./pages/RemindersPage"));

import "./App.css";

const App: React.FC = () => {
  useEffect(() => {
    // (Optional) You can keep other startup logic here later
    // Removed reminder/notification logic as requested
  }, []);

  return (
    <Router>
      <Suspense fallback={<PageLoadingSpinner message="Loading…" />}>
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
          <Route path="/check-in/details/2" element={<CheckInPage3 />} />
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
      </Suspense>
    </Router>
  );
};

export default App;