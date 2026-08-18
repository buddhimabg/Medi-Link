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
<<<<<<< Updated upstream
  const [userName] = useState('Mr.David');
=======
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

>>>>>>> Stashed changes
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
<<<<<<< Updated upstream
  const navigate = useNavigate();

  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [_systemStatus, _setSystemStatus] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes, statusRes, approvalStatsRes] = await Promise.all([
          apiFetch<any>('/dashboard/stats').catch(() => null),
          apiFetch<any>('/dashboard/recent-activity').catch(() => null),
          apiFetch<any>('/dashboard/system-status').catch(() => null),
          apiFetch<any>('/doctors/approval-stats').catch(() => null)
        ]);

        if (statsRes?.success) setDashboardStats(statsRes.data);
        if (approvalStatsRes?.data) setPendingApprovals(approvalStatsRes.data.pending || 0);
        if (activityRes?.success) {
           setActivities(activityRes.data.map((act: any) => ({
             id: act.id || act._id || String(Math.random()),
             type: act.type,
             title: act.text,
             timestamp: act.time,
             status: act.status || 'success',
             resourceType: act.resourceType || 'System',
             user: act.user || null
           })));
        }
        if (statusRes?.success) _setSystemStatus(statusRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      }
    };
    fetchData();
  }, []);

  const statCards: StatCard[] = [
    {
      label: 'Total Patients',
      value: dashboardStats?.totalPatients?.value?.toString() || '0',
      icon: <Users size={20} color="#6366f1" />,
      trend: dashboardStats?.totalPatients?.change?.startsWith('-') ? 'down' : 'up',
      trendValue: dashboardStats?.totalPatients?.change || '0% vs last month',
      backgroundColor: '#EBF3FF'
    },
    {
      label: 'Total Doctors',
      value: dashboardStats?.totalDoctors?.value?.toString() || '0',
      icon: <Stethoscope size={20} color="#8b5cf6" />,
      trend: dashboardStats?.totalDoctors?.change?.startsWith('-') ? 'down' : 'up',
      trendValue: dashboardStats?.totalDoctors?.change || '0 vs last month',
      backgroundColor: '#EBF3FF'
    },
    {
      label: 'Appointments',
      value: dashboardStats?.appointments?.value?.toString() || '0',
      icon: <Calendar size={20} color="#0ea5e9" />,
      trend: dashboardStats?.appointments?.change?.startsWith('-') ? 'down' : 'up',
      trendValue: dashboardStats?.appointments?.change || '0 vs last week',
      backgroundColor: '#E3F2FD'
    },
    {
      label: 'Revenue',
      value: dashboardStats?.revenue?.value?.toString() || 'LKR 0',
      icon: <DollarSign size={20} color="#f59e0b" />,
      trend: dashboardStats?.revenue?.change?.startsWith('-') ? 'down' : 'up',
      trendValue: dashboardStats?.revenue?.change || '0% vs last month',
      backgroundColor: '#E3F2FD'
    }
  ];


  const handleLogout = () => {
    // Add logout logic here
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <h2 className="logo">MediLink</h2>
        </div>


        <nav className="navigation">
          <ul className="nav-list">
            <li className="nav-item nav-item-active" onClick={() => navigate('/admin-dashboard')}>
              <span className="nav-icon"><LayoutDashboard size={20} /></span>
              <span className="nav-label">Dashboard</span>
              <span className="nav-arrow">›</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/manage-doctors')}>
              <span className="nav-icon"><Stethoscope size={20} /></span>
              <span className="nav-label">Manage Doctors</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/doctor-approvals')}>
              <span className="nav-icon"><ShieldCheck size={20} /></span>
              <span className="nav-label">Doctor Approvals</span>
              {pendingApprovals > 0 && (
                <span style={{ marginLeft: 'auto', background: '#f59e0b', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 7px', borderRadius: '9999px' }}>
                  {pendingApprovals}
                </span>
              )}
            </li>
            <li className="nav-item" onClick={() => navigate('/manage-patients')}>
              <span className="nav-icon"><Users size={20} /></span>
              <span className="nav-label">Manage Patients</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/reports')}>
              <span className="nav-icon"><FileText size={20} /></span>
              <span className="nav-label">Reports</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/settings')}>
              <span className="nav-icon"><Settings size={20} /></span>
              <span className="nav-label">Settings</span>
            </li>
          </ul>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon"><LogOut size={20} /></span>
          <span className="logout-text">Log Out</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <h1 className="greeting">Welcome, {userName}!</h1>
            <p className="date">{currentDate}</p>
=======

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
>>>>>>> Stashed changes
          </div>
        </header>

        {/* Doctor Approvals Banner */}
        {pendingApprovals > 0 && (
<<<<<<< Updated upstream
          <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#92400e' }}>
                  {pendingApprovals} Doctor Application{pendingApprovals > 1 ? 's' : ''} Awaiting Medical Council License Verification
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#b45309' }}>
                  Doctors registered without prior approval require SLMC license authentication.
=======
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
>>>>>>> Stashed changes
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/doctor-approvals')}
<<<<<<< Updated upstream
              style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)' }}
            >
              <span>Review & Verify Doctors</span>
              <span>→</span>
=======
              className="approval-alert-action-btn"
            >
              <span>Review & Verify Doctors</span>
              <ChevronRight size={16} />
>>>>>>> Stashed changes
            </button>
          </div>
        )}

<<<<<<< Updated upstream
        {/* Stats Cards */}
        <section className="stats-section">
          <div className="stats-grid">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="stat-card"
                style={{ backgroundColor: card.backgroundColor }}
              >
                <div className="stat-header">
                  <h3 className="stat-label">{card.label}</h3>
                  <span className="stat-icon">{card.icon}</span>
                </div>
                <p className="stat-value">{card.value}</p>
                <p 
                  className="stat-trend" 
                  style={{ color: card.trend === 'down' ? '#e11d48' : '#10b981' }}
                >
                  {card.trend === 'down' ? '↓' : '↑'} {card.trendValue.replace(/^[+-]/, '')}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Charts Section */}
        <section className="charts-section">
          <div className="chart-card">
            <h3 className="chart-title">Weekly Appointments</h3>
            {dashboardStats?.weeklyAppointments ? (
              <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
                <ResponsiveContainer>
                  <BarChart data={dashboardStats.weeklyAppointments} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip cursor={{fill: '#f4f7fe'}} />
                    <Bar dataKey="appointments" fill="#4318FF" radius={[4, 4, 0, 0]} barSize={30} />
=======
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
>>>>>>> Stashed changes
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="analytics-pending">Analytics Pending...</p>
            )}
          </div>
<<<<<<< Updated upstream
          <div className="chart-card">
            <h3 className="chart-title">Patient Growth Trend</h3>
            {dashboardStats?.patientGrowthData ? (
              <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
                <ResponsiveContainer>
                  <LineChart data={dashboardStats.patientGrowthData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="patients" stroke="#05CD99" strokeWidth={3} dot={{ r: 4, fill: '#05CD99', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
=======

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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
            <h2 className="section-title">Recent System Activity</h2>
            <span className="activity-count">{activities.length} activities</span>
=======
            <div>
              <h2 className="section-title">Recent System Activity</h2>
              <p className="section-subtitle">Real-time audit log of platform operations and events</p>
            </div>
            <span className="activity-count">{activities.length} Recorded Events</span>
>>>>>>> Stashed changes
          </div>
          <div className="activity-list">
            {activities.length === 0 ? (
              <div className="activity-empty">
<<<<<<< Updated upstream
                <span className="activity-empty-icon"><ClipboardList size={24} color="#9ca3af" /></span>
                <p className="activity-empty-text">No recent activities yet</p>
                <p className="activity-empty-sub">System activities will appear here as actions are performed</p>
=======
                <span className="activity-empty-icon"><ClipboardList size={32} color="#9ca3af" /></span>
                <p className="activity-empty-text">No recent activities yet</p>
                <p className="activity-empty-sub">System activities will appear here as doctors, patients, and staff perform actions.</p>
>>>>>>> Stashed changes
              </div>
            ) : (
              activities.map((activity) => {
                const config = activityConfig[activity.type] || { icon: <Activity size={16} />, color: '#6b7280', label: 'Activity' };
                return (
                  <div key={activity.id} className="activity-item">
<<<<<<< Updated upstream
                    <div className="activity-icon-wrapper" style={{ backgroundColor: `${config.color}15` }}>
=======
                    <div className="activity-icon-wrapper" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream


=======
>>>>>>> Stashed changes
      </main>
    </div>
  );
};

<<<<<<< Updated upstream
export default Dashboard;
=======
export default Dashboard;
>>>>>>> Stashed changes
