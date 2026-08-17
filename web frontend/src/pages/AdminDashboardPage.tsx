import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Stethoscope, Users, FileText, Settings, LogOut, Calendar, DollarSign, UserPlus, LogIn, Edit, Lock, FileEdit, Trash2, CalendarCheck, CalendarX, CalendarClock, Pill, FileBarChart, Shield, AlertTriangle, Key, ClipboardList, Activity, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import './AdminDashboardPage.css';

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  trendValue: string;
  backgroundColor: string;
}

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
  const [userName] = useState('Mr.David');
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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
          </div>
        </header>

        {/* Doctor Approvals Banner */}
        {pendingApprovals > 0 && (
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
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/doctor-approvals')}
              style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)' }}
            >
              <span>Review & Verify Doctors</span>
              <span>→</span>
            </button>
          </div>
        )}

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
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="analytics-pending">Analytics Pending...</p>
            )}
          </div>
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
            <h2 className="section-title">Recent System Activity</h2>
            <span className="activity-count">{activities.length} activities</span>
          </div>
          <div className="activity-list">
            {activities.length === 0 ? (
              <div className="activity-empty">
                <span className="activity-empty-icon"><ClipboardList size={24} color="#9ca3af" /></span>
                <p className="activity-empty-text">No recent activities yet</p>
                <p className="activity-empty-sub">System activities will appear here as actions are performed</p>
              </div>
            ) : (
              activities.map((activity) => {
                const config = activityConfig[activity.type] || { icon: <Activity size={16} />, color: '#6b7280', label: 'Activity' };
                return (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon-wrapper" style={{ backgroundColor: `${config.color}15` }}>
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