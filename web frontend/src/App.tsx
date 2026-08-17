// App.tsx
import React, { useEffect, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { PageLoadingSpinner } from "./components/ui";

// Pages
const MoodDashboard = React.lazy(() => import("./pages/Dashboard"));
const CheckInPage1 = React.lazy(() => import("./pages/check-in/CheckInPage1"));
const CheckInPage2 = React.lazy(() => import("./pages/check-in/CheckInPage2"));
const CheckInPage3 = React.lazy(() => import("./pages/check-in/CheckInPage3"));
const CheckinSummary = React.lazy(() => import("./pages/check-in/CheckinSummary"));

const MoodHistory = React.lazy(() => import("./pages/MoodHistory"));
const InsightsPage = React.lazy(() => import("./pages/InsightsPage"));
const MoodFixPage = React.lazy(() => import("./pages/MoodFixPage"));
const MoodFixActivityDetail = React.lazy(() => import("./pages/MoodFixActivityDetail"));
const FeaturePage = React.lazy(() => import("./pages/FeaturePage"));
const ReportAnalysisPage = React.lazy(() => import("./pages/ReportAnalysisPage"));
const ReportDetailPage = React.lazy(() => import("./pages/ReportDetailPage"));
const NotificationsPage = React.lazy(() => import("./pages/NotificationsPage"));
const RemindersPage = React.lazy(() => import("./pages/RemindersPage"));

// Doctor portal (video calls, chatbot, journals) — dev-dilshari's feature set
const VideoCallScreen = React.lazy(() => import("./pages/VideoCall/VideoCallScreen"));
const PatientVideoCallScreen = React.lazy(() => import("./pages/VideoCall/PatientVideoCallScreen"));
const VideoCallSetting = React.lazy(() => import("./pages/VideoCall/VideoCallSetting"));
const ChatbotPage = React.lazy(() => import("./pages/Chatbot/Chatbotpage"));
const JournalsRouter = React.lazy(() => import("./pages/Journals/JournalsRouter"));

// Admin dashboard — dev-pavindu's feature set
const AdminDashboardPage = React.lazy(() => import("./pages/AdminDashboardPage"));
const ManageDoctorsPage = React.lazy(() => import("./pages/ManageDoctorsPage"));
const DoctorApprovalsPage = React.lazy(() => import("./pages/DoctorApprovalsPage"));
const ManagePatientsPage = React.lazy(() => import("./pages/ManagePatientsPage"));
const AdminReportsPage = React.lazy(() => import("./pages/ReportsPage"));
const AdminSettingsPage = React.lazy(() => import("./pages/SettingsPage"));

// Doctor-portal treatment scheduling — dev-nawodya's feature set
const DoctorDashboardPage = React.lazy(() => import("./pages/doctorDashboard"));
const DoctorSettingsPage = React.lazy(() => import("./pages/doctorSettings"));
const DoctorSchedulePage = React.lazy(() => import("./pages/schedule"));
const DoctorViewListPage = React.lazy(() => import("./pages/viewlist"));
const DoctorPatientsPage = React.lazy(() => import("./pages/patients"));
const DoctorPatientProfilePage = React.lazy(() => import("./pages/patientprofile"));
const DoctorOwnProfilePage = React.lazy(() => import("./pages/docprofile"));

import "./App.css";
import LandingPage from "./pages/landingpage";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerpage";
import Patientdashboard from "./pages/patientDashboard";
import BookAppointment from "./pages/bookAppointment";
import WellnessHub from "./pages/WellnessHub";
import Assessments from "./pages/assessments"; // Added mental health assessments page
import AppointmentHistory from "./pages/appointmentHistory";
import WellnessVideos from "./pages/wellness/WellnessVideos";
import WellnessMindfulness from "./pages/wellness/WellnessMindfulness";
import WellnessSleep from "./pages/wellness/WellnessSleep";
import WellnessEducation from "./pages/wellness/WellnessEducation";
import WellnessSelfCare from "./pages/wellness/WellnessSelfCare";

// Generate a stable session ID from a doctor's user ID.
// Format: doc-<last 6 chars of userId> — unique per doctor, stable across refreshes.
const buildSessionId = (userId?: string): string => {
  if (!userId) return "";
  const suffix = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return suffix.length >= 4 ? `doc-${suffix}` : "";
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class RouteErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: any): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Route loading error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Page failed to load</h1>
            <p className="text-gray-600 mb-6 text-sm">
              Something went wrong while loading this page. Please refresh and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#0C5BD5] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#0A4AB0] transition"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  useEffect(() => {
    // (Optional) You can keep other startup logic here later
    // Removed reminder/notification logic as requested
  }, []);

  // Doctor portal (video calls, chatbot, journals) is gated on the
  // medilink_* keys set by loginPage.tsx when a doctor-role account logs in.
  const isDoctorLoggedIn = localStorage.getItem("medilink_logged_in") === "true";
  const doctorInfo = (() => {
    try {
      const raw = localStorage.getItem("medilink_user_info");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const doctorUserRole: string = doctorInfo?.role ?? "doctor";
  const doctorUserName: string = doctorInfo?.name ?? "";

  const handleDoctorLogout = () => {
    localStorage.removeItem("medilink_token");
    localStorage.removeItem("medilink_logged_in");
    localStorage.removeItem("medilink_user_info");
    localStorage.removeItem("medilink_user");
    localStorage.removeItem("user");
    window.location.replace("/login");
  };

  // Admin dashboard is gated on medilink_auth_token, set by loginPage.tsx
  // when an admin-role account logs in (its own api/api.ts reads this key
  // for the Authorization header on every admin-dashboard request).
  const isAdminLoggedIn = !!localStorage.getItem("medilink_auth_token");

  return (
    <Router>
      <RouteErrorBoundary>
        <Suspense fallback={<PageLoadingSpinner message="Loading…" />}>
          <Routes>
          {/* Default / auth */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<Patientdashboard />} />
          <Route path="/bookAppointment" element={<BookAppointment />} />
          <Route path="/history" element={<AppointmentHistory />} />
          <Route path="/Wellnesshub" element={<WellnessHub />} />
          <Route path="/assessments" element={<Assessments />} />

          {/* Wellness Hub Categories */}
          <Route path="/wellness/videos" element={<WellnessVideos />} />
          <Route path="/wellness/mindfulness" element={<WellnessMindfulness />} />
          <Route path="/wellness/sleep" element={<WellnessSleep />} />
          <Route path="/wellness/education" element={<WellnessEducation />} />
          <Route path="/wellness/self-care" element={<WellnessSelfCare />} />

          {/* Mood/wellness dashboard */}
          <Route path="/home" element={<MoodDashboard />} />
          <Route path="/mood-dashboard" element={<MoodDashboard />} />

          {/* Check-in flow */}
          <Route path="/check-in" element={<CheckInPage1 />} />
          <Route path="/check-in/details" element={<CheckInPage2 />} />
          <Route path="/check-in/details/2" element={<CheckInPage3 />} />
          <Route path="/check-in/summary" element={<CheckinSummary />} />

          {/* Core mood features */}
          <Route path="/mood-history" element={<MoodHistory />} />
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

          {/* Doctor portal — video calls, chatbot, journals (dev-dilshari) */}
          <Route
            path="/video-call/:sessionId"
            element={
              isDoctorLoggedIn
                ? doctorUserRole === "patient"
                  ? <PatientVideoCallScreen userName={doctorUserName} />
                  : <VideoCallScreen onLogout={handleDoctorLogout} userName={doctorUserName} />
                : <Navigate to="/login" />
            }
          />
          <Route
            path="/patient-join/:sessionId"
            element={isDoctorLoggedIn ? <PatientVideoCallScreen userName={doctorUserName} /> : <Navigate to="/login" />}
          />
          <Route
            path="/video-call"
            element={
              isDoctorLoggedIn
                ? buildSessionId(doctorInfo?.id)
                  ? <Navigate to={`/video-call/${buildSessionId(doctorInfo?.id)}`} />
                  : <VideoCallScreen onLogout={handleDoctorLogout} userName={doctorUserName} />
                : <Navigate to="/login" />
            }
          />
          <Route
            path="/VideoCallSetting"
            element={isDoctorLoggedIn ? <VideoCallSetting /> : <Navigate to="/login" />}
          />
          <Route
            path="/journals/*"
            element={isDoctorLoggedIn ? <JournalsRouter /> : <Navigate to="/login" />}
          />
          <Route
            path="/chatbot"
            element={isDoctorLoggedIn ? <ChatbotPage doctorName={doctorUserName} onLogout={handleDoctorLogout} /> : <Navigate to="/login" />}
          />
          {/* Doctor-portal treatment scheduling (dev-nawodya) */}
          <Route
            path="/doctor-dashboard"
            element={isDoctorLoggedIn ? <DoctorDashboardPage /> : <Navigate to="/login" />}
          />

          <Route
            path="/schedule"
            element={isDoctorLoggedIn ? <DoctorSchedulePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/view/:id"
            element={isDoctorLoggedIn ? <DoctorViewListPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/viewlist"
            element={isDoctorLoggedIn ? <DoctorViewListPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/patients"
            element={isDoctorLoggedIn ? <DoctorPatientsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/patients/:id/profile"
            element={isDoctorLoggedIn ? <DoctorPatientProfilePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/doctor-profile"
            element={isDoctorLoggedIn ? <DoctorOwnProfilePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/doctor-settings"
            element={isDoctorLoggedIn ? <DoctorSettingsPage /> : <Navigate to="/login" />}
          />

          {/* Admin dashboard (dev-pavindu) */}
          <Route
            path="/admin-dashboard"
            element={isAdminLoggedIn ? <AdminDashboardPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/manage-doctors"
            element={isAdminLoggedIn ? <ManageDoctorsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/doctor-approvals"
            element={isAdminLoggedIn ? <DoctorApprovalsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/approvals"
            element={isAdminLoggedIn ? <DoctorApprovalsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/manage-patients"
            element={isAdminLoggedIn ? <ManagePatientsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin-reports"
            element={isAdminLoggedIn ? <AdminReportsPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin-settings"
            element={isAdminLoggedIn ? <AdminSettingsPage /> : <Navigate to="/login" />}
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
      </RouteErrorBoundary>
    </Router>
  );
};

export default App;
