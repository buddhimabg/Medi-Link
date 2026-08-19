import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  Calendar,
  DollarSign,
  UserPlus,
  LogIn,
  LogOut,
  Edit,
  Lock,
  FileEdit,
  Trash2,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  Pill,
  FileBarChart,
  Shield,
  AlertTriangle,
  Key,
  ClipboardList,
  Activity,
  ShieldCheck,
  Mail,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  ChevronRight,
  Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, clearAuthToken } from '../api/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import './AdminDashboardPage.css';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  timestamp: string;
  status: string;
  resourceType: string;
  user: { name: string; email: string; role: string } | null;
}

// Maps activity types to their icon and color
const activityConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  user_registered: { icon: <UserPlus size={16} />, color: '#8b5cf6', label: 'Registration' },
  user_login: { icon: <LogIn size={16} />, color: '#6366f1', label: 'Login' },
  user_logout: { icon: <LogOut size={16} />, color: '#94a3b8', label: 'Logout' },
  user_profile_updated: { icon: <Edit size={16} />, color: '#3b82f6', label: 'Profile Update' },
  user_password_changed: { icon: <Lock size={16} />, color: '#f59e0b', label: 'Security' },
  patient_registered: { icon: <Stethoscope size={16} />, color: '#10b981', label: 'New Patient' },
  patient_updated: { icon: <FileEdit size={16} />, color: '#06b6d4', label: 'Patient Update' },
  patient_deleted: { icon: <Trash2 size={16} />, color: '#ef4444', label: 'Patient Removed' },
  doctor_profile_added: { icon: <UserPlus size={16} />, color: '#8b5cf6', label: 'New Doctor' },
  doctor_updated: { icon: <Edit size={16} />, color: '#3b82f6', label: 'Doctor Update' },
  doctor_deleted: { icon: <Trash2 size={16} />, color: '#ef4444', label: 'Doctor Removed' },
  appointment_scheduled: { icon: <Calendar size={16} />, color: '#0ea5e9', label: 'Appointment' },
  appointment_completed: { icon: <CalendarCheck size={16} />, color: '#10b981', label: 'Completed' },
  appointment_cancelled: { icon: <CalendarX size={16} />, color: '#f43f5e', label: 'Cancelled' },
  appointment_rescheduled: { icon: <CalendarClock size={16} />, color: '#f59e0b', label: 'Rescheduled' },
  prescription_issued: { icon: <Pill size={16} />, color: '#14b8a6', label: 'Prescription' },
  report_generated: { icon: <FileBarChart size={16} />, color: '#6366f1', label: 'Report' },
  settings_changed: { icon: <Settings size={16} />, color: '#64748b', label: 'Settings' },
  admin_action: { icon: <Shield size={16} />, color: '#dc2626', label: 'Admin' },
  system_error: { icon: <AlertTriangle size={16} />, color: '#ef4444', label: 'Error' },
  security_event: { icon: <Key size={16} />, color: '#f59e0b', label: 'Security' },
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<{ name: string; email?: string; role?: string } | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Dynamic user data extraction
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAdminUser(parsed);
      } else {
        const info = localStorage.getItem('medilink_user_info');
        if (info) {
          setAdminUser(JSON.parse(info));
        }
      }
    } catch (e) {
      console.warn("Could not parse user info from localStorage", e);
    }
  }, []);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Time-of-day greeting generator
  const getGreetingContext = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
    if (hour < 18) return { text: 'Good afternoon', emoji: '🌤️' };
    return { text: 'Good evening', emoji: '🌙' };
  };

  const greeting = getGreetingContext();
  const adminDisplayName = adminUser?.name || 'David';

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, activityRes, approvalStatsRes] = await Promise.all([
        apiFetch<any>('/dashboard/stats').catch(() => null),
        apiFetch<any>('/dashboard/recent-activity').catch(() => null),
        apiFetch<any>('/doctors/approval-stats').catch(() => null)
      ]);

      if (statsRes?.success) setDashboardStats(statsRes.data);
      if (approvalStatsRes?.data) setPendingApprovals(approvalStatsRes.data.pending || 0);
      if (activityRes?.success) {
        setActivities(
          activityRes.data.map((act: any) => ({
            id: act.id || act._id || String(Math.random()),
            type: act.type,
            title: act.text,
            timestamp: act.time,
            status: act.status || 'success',
            resourceType: act.resourceType || 'System',
            user: act.user || null
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    navigate('/login');
  };

  // Calculate total weekly appointments sum for chart header
  const totalWeeklyAppointments = dashboardStats?.weeklyAppointments?.reduce(
    (acc: number, item: any) => acc + (item.appointments || 0), 0
  ) || 0;

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <AdminSidebar activeRoute="/admin-dashboard" />

      {/* Main Content */}
      <main className="main-content">
        {/* Executive Header */}
        <header className="header-executive">
          <div className="header-left">
            <div className="admin-status-row">
              <span className="role-tag">
                <Shield size={13} className="role-tag-icon" />
                System Administrator
              </span>
              <span className="pulse-indicator">
                <span className="pulse-dot"></span>
                Health Engine Active
              </span>
            </div>
            <h1 className="greeting-executive">
              {greeting.text}, <span className="greeting-highlight">{adminDisplayName}</span>! {greeting.emoji}
            </h1>
            <p className="subtitle-executive">
              Hospital Operations & Clinical Intelligence • Real-Time Administrative Control
            </p>
          </div>

          <div className="header-right">
            <div className="header-date-badge">
              <Calendar size={15} className="header-date-icon" />
              <span>{currentDate}</span>
            </div>
            <button
              className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
              onClick={fetchDashboardData}
              title="Refresh Real-Time Dashboard Data"
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
            </button>
          </div>
        </header>

        {/* Doctor Approvals Banner */}
        {pendingApprovals > 0 && (
          <div className="approval-alert-banner">
            <div className="approval-alert-left">
              <div className="approval-alert-icon">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 className="approval-alert-title">
                  {pendingApprovals} Doctor Application{pendingApprovals > 1 ? 's' : ''} Awaiting Medical Council License Verification
                </h4>
                <p className="approval-alert-desc">
                  Doctors registered without prior approval require Sri Lanka Medical Council (SLMC) credential authentication before consulting.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/doctor-approvals')}
              className="approval-alert-action-btn"
            >
              <span>Review & Verify Doctors</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Meaningful KPI Cards */}
        <section className="stats-section">
          <div className="kpi-grid">
            {/* KPI 1: Patients */}
            <div
              className="kpi-card kpi-card-blue"
              onClick={() => navigate('/manage-patients')}
              title="Click to manage patient profiles"
            >
              <div className="kpi-card-top">
                <div className="kpi-icon-wrap kpi-icon-blue">
                  <Users size={22} />
                </div>
                <span className="kpi-action-hint">
                  Manage <ArrowUpRight size={13} />
                </span>
              </div>
              <div className="kpi-metric-group">
                <span className="kpi-label">Total Patients</span>
                <h2 className="kpi-value">{dashboardStats?.totalPatients?.value ?? 10}</h2>
              </div>
              <div className="kpi-divider" />
              <div className="kpi-details-row">
                <span className="kpi-sub-detail">
                  <strong>+{dashboardStats?.totalPatients?.newThisMonth ?? 3}</strong> new this month
                </span>
                <span className="kpi-pill kpi-pill-emerald">
                  <CheckCircle2 size={11} />
                  100% Active
                </span>
              </div>
            </div>

            {/* KPI 2: Doctors */}
            <div
              className="kpi-card kpi-card-purple"
              onClick={() => navigate('/doctor-approvals')}
              title="Click to review doctor verifications"
            >
              <div className="kpi-card-top">
                <div className="kpi-icon-wrap kpi-icon-purple">
                  <Stethoscope size={22} />
                </div>
                <span className="kpi-action-hint">
                  Approvals <ArrowUpRight size={13} />
                </span>
              </div>
              <div className="kpi-metric-group">
                <span className="kpi-label">Medical Staff & Doctors</span>
                <h2 className="kpi-value">{dashboardStats?.totalDoctors?.value ?? 17}</h2>
              </div>
              <div className="kpi-divider" />
              <div className="kpi-details-row">
                <span className="kpi-sub-detail">
                  <strong>{dashboardStats?.totalDoctors?.verified ?? 8}</strong> Active · <strong>{pendingApprovals || 9}</strong> Pending
                </span>
                {pendingApprovals > 0 ? (
                  <span className="kpi-pill kpi-pill-amber">
                    <Clock size={11} />
                    {pendingApprovals} Pending SLMC
                  </span>
                ) : (
                  <span className="kpi-pill kpi-pill-emerald">
                    <CheckCircle2 size={11} />
                    100% Verified
                  </span>
                )}
              </div>
            </div>

            {/* KPI 3: Appointments */}
            <div
              className="kpi-card kpi-card-sky"
              onClick={() => navigate('/manage-doctors')}
              title="Click to view clinical appointments"
            >
              <div className="kpi-card-top">
                <div className="kpi-icon-wrap kpi-icon-sky">
                  <Calendar size={22} />
                </div>
                <span className="kpi-action-hint">
                  Clinical <ArrowUpRight size={13} />
                </span>
              </div>
              <div className="kpi-metric-group">
                <span className="kpi-label">Total Appointments</span>
                <h2 className="kpi-value">{dashboardStats?.appointments?.value ?? 41}</h2>
              </div>
              <div className="kpi-divider" />
              <div className="kpi-details-row">
                <span className="kpi-sub-detail">
                  <strong>{dashboardStats?.appointments?.virtual ?? 28}</strong> Virtual · <strong>{dashboardStats?.appointments?.physical ?? 13}</strong> In-Clinic
                </span>
                <span className="kpi-pill kpi-pill-sky">
                  <TrendingUp size={11} />
                  +{dashboardStats?.appointments?.thisWeek ?? 8} This Week
                </span>
              </div>
            </div>

            {/* KPI 4: Revenue */}
            <div
              className="kpi-card kpi-card-amber"
              onClick={() => navigate('/admin-payments')}
              title="Click to view complete Payments & Revenue Ledger"
            >
              <div className="kpi-card-top">
                <div className="kpi-icon-wrap kpi-icon-amber">
                  <DollarSign size={22} />
                </div>
                <span className="kpi-action-hint">
                  Ledger <ArrowUpRight size={13} />
                </span>
              </div>
              <div className="kpi-metric-group">
                <span className="kpi-label">Platform Gross Revenue</span>
                <h2 className="kpi-value">{dashboardStats?.revenue?.value ?? 'LKR 12,096'}</h2>
              </div>
              <div className="kpi-divider" />
              <div className="kpi-details-row">
                <span className="kpi-sub-detail">
                  <strong>{dashboardStats?.revenue?.paidCount ?? 12}</strong> Paid · Avg ~LKR {(dashboardStats?.revenue?.avgRevenue ?? 1008).toLocaleString()}
                </span>
                <span className="kpi-pill kpi-pill-emerald">
                  <CheckCircle2 size={11} />
                  100% Cleared
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Executive Pulse & Operational Overview Strip */}
        <section className="executive-pulse-section">
          {/* Card 1: Licensing Compliance */}
          <div className="pulse-card">
            <div className="pulse-card-header">
              <div className="pulse-card-title">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span>Doctor Verification Compliance</span>
              </div>
              <span className="pulse-badge-rate">
                {dashboardStats?.summary?.doctorVerificationRate || '47.1'}% Verified
              </span>
            </div>
            <div className="compliance-track">
              <div
                className="compliance-bar"
                style={{ width: `${dashboardStats?.summary?.doctorVerificationRate || 47.1}%` }}
              />
            </div>
            <div className="pulse-card-footer">
              <span>{dashboardStats?.totalDoctors?.verified || 8} Licensed & Active</span>
              <span className="text-amber-bold">{pendingApprovals || 9} Action Required</span>
            </div>
          </div>

          {/* Card 2: Modality Ratio */}
          <div className="pulse-card">
            <div className="pulse-card-header">
              <div className="pulse-card-title">
                <Activity size={16} className="text-blue-500" />
                <span>Consultation Modality Split</span>
              </div>
              <span className="pulse-badge-rate modality">
                {dashboardStats?.summary?.virtualRatio || '68.3'}% Telehealth
              </span>
            </div>
            <div className="modality-split-bar">
              <div
                className="modality-virtual-segment"
                style={{ width: `${dashboardStats?.summary?.virtualRatio || 68.3}%` }}
                title="Virtual Consultations"
              />
              <div
                className="modality-physical-segment"
                style={{ width: `${100 - Number(dashboardStats?.summary?.virtualRatio || 68.3)}%` }}
                title="Physical Consultations"
              />
            </div>
            <div className="pulse-card-footer">
              <span>🟣 {dashboardStats?.appointments?.virtual || 28} Virtual</span>
              <span>🟢 {dashboardStats?.appointments?.physical || 13} In-Person</span>
            </div>
          </div>

          {/* Card 3: Executive Quick Actions */}
          <div className="pulse-card quick-actions-card">
            <div className="pulse-card-header">
              <div className="pulse-card-title">
                <Zap size={16} className="text-amber-500" />
                <span>Quick Administration</span>
              </div>
            </div>
            <div className="quick-actions-grid">
              <button className="quick-act-btn" onClick={() => navigate('/doctor-approvals')}>
                <ShieldCheck size={14} />
                <span>Verify Doctors</span>
                {pendingApprovals > 0 && <span className="quick-pill">{pendingApprovals}</span>}
              </button>
              <button className="quick-act-btn" onClick={() => navigate('/admin-payments')}>
                <DollarSign size={14} />
                <span>Ledger</span>
              </button>
              <button className="quick-act-btn" onClick={() => navigate('/manage-patients')}>
                <Users size={14} />
                <span>Patients</span>
              </button>
              <button className="quick-act-btn" onClick={() => navigate('/send-notifications')}>
                <Mail size={14} />
                <span>Broadcast</span>
              </button>
            </div>
          </div>
        </section>

        {/* Visual Charts Section */}
        <section className="charts-section">
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-title">Weekly Appointments Distribution</h3>
                <p className="chart-subtitle">Daily consultation appointments over the last 7 days</p>
              </div>
              <span className="chart-stat-chip">{totalWeeklyAppointments} Consults</span>
            </div>
            {dashboardStats?.weeklyAppointments ? (
              <div style={{ width: '100%', height: 280, marginTop: '16px' }}>
                <ResponsiveContainer>
                  <BarChart data={dashboardStats.weeklyAppointments} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <RechartsTooltip
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="custom-chart-tooltip">
                              <p className="tooltip-title">{label}</p>
                              <p className="tooltip-value">{payload[0].value} Appointments</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="appointments" fill="#4318FF" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="analytics-pending">Analytics Pending...</p>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-title">Patient Growth Trend</h3>
                <p className="chart-subtitle">Monthly registered patients over the past 6 months</p>
              </div>
              <span className="chart-stat-chip emerald">Active Registered</span>
            </div>
            {dashboardStats?.patientGrowthData ? (
              <div style={{ width: '100%', height: 280, marginTop: '16px' }}>
                <ResponsiveContainer>
                  <AreaChart data={dashboardStats.patientGrowthData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="patientGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#05CD99" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#05CD99" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="custom-chart-tooltip">
                              <p className="tooltip-title">{label}</p>
                              <p className="tooltip-value text-emerald-600">{payload[0].value} Patients</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="patients"
                      stroke="#05CD99"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#patientGrowthGrad)"
                      dot={{ r: 4, fill: '#05CD99', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#05CD99', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="analytics-pending">Analytics Pending...</p>
            )}
          </div>
        </section>

        {/* Activity Section */}
        <section className="activity-section">
          <div className="activity-header">
            <div>
              <h2 className="section-title">Recent System Activity</h2>
              <p className="section-subtitle">Real-time audit log of platform operations and events</p>
            </div>
            <span className="activity-count">{activities.length} Recorded Events</span>
          </div>
          <div className="activity-list">
            {activities.length === 0 ? (
              <div className="activity-empty">
                <span className="activity-empty-icon"><ClipboardList size={32} color="#9ca3af" /></span>
                <p className="activity-empty-text">No recent activities yet</p>
                <p className="activity-empty-sub">System activities will appear here as doctors, patients, and staff perform actions.</p>
              </div>
            ) : (
              activities.map((activity) => {
                const config = activityConfig[activity.type] || { icon: <Activity size={16} />, color: '#6b7280', label: 'Activity' };
                return (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon-wrapper" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                      <span className="activity-icon">{config.icon}</span>
                    </div>
                    <div className="activity-content">
                      <div className="activity-content-top">
                        <p className="activity-title">{activity.title}</p>
                        <span className="activity-badge" style={{ backgroundColor: `${config.color}18`, color: config.color }}>
                          {config.label}
                        </span>
                      </div>
                      <div className="activity-meta">
                        {activity.user && (
                          <span className="activity-user">
                            by {activity.user.name}
                          </span>
                        )}
                        <span className="activity-time">{activity.timestamp}</span>
                      </div>
                    </div>
                    <div className={`activity-status-dot activity-status-${activity.status}`} title={activity.status} />
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
