import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import './AdminDashboardPage.css';

interface StatCard {
  label: string;
  value: string;
  icon: string;
  trend: string;
  trendValue: string;
  backgroundColor: string;
}

interface ActivityItem {
  id: number;
  title: string;
  timestamp: string;
}



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
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes, statusRes] = await Promise.all([
          apiFetch<any>('/dashboard/stats').catch(() => null),
          apiFetch<any>('/dashboard/recent-activity').catch(() => null),
          apiFetch<any>('/dashboard/system-status').catch(() => null)
        ]);

        if (statsRes?.success) setDashboardStats(statsRes.data);
        if (activityRes?.success) {
           setActivities(activityRes.data.map((act: any, index: number) => ({
             id: index,
             title: act.text,
             timestamp: act.time
           })));
        }
        if (statusRes?.success) setSystemStatus(statusRes.data);
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
      icon: '👥',
      trend: dashboardStats?.totalPatients?.change?.startsWith('-') ? 'down' : 'up',
      trendValue: dashboardStats?.totalPatients?.change || '0% vs last month',
      backgroundColor: '#EBF3FF'
    },
    {
      label: 'Total Doctors',
      value: dashboardStats?.totalDoctors?.value?.toString() || '0',
      icon: '👨‍⚕️',
      trend: dashboardStats?.totalDoctors?.change?.startsWith('-') ? 'down' : 'up',
      trendValue: dashboardStats?.totalDoctors?.change || '0 vs last month',
      backgroundColor: '#EBF3FF'
    },
    {
      label: 'Appointments',
      value: dashboardStats?.appointments?.value?.toString() || '0',
      icon: '📅',
      trend: dashboardStats?.appointments?.change?.startsWith('-') ? 'down' : 'up',
      trendValue: dashboardStats?.appointments?.change || '0 vs last week',
      backgroundColor: '#E3F2FD'
    },
    {
      label: 'Revenue',
      value: dashboardStats?.revenue?.value?.toString() || 'LKR 0',
      icon: '💰',
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

        <div className="profile-section">
          <img
            src="https://i.pinimg.com/736x/98/d4/e3/98d4e3c28316349f3f7ccc976929e986.jpg"
            alt="Profile"
            className="profile-image"
          />
        </div>

        <nav className="navigation">
          <ul className="nav-list">
            <li className="nav-item nav-item-active" onClick={() => navigate('/admin-dashboard')}>
              <span className="nav-icon">📊</span>
              <span className="nav-label">Dashboard</span>
              <span className="nav-arrow">›</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/manage-doctors')}>
              <span className="nav-icon">👨‍⚕️</span>
              <span className="nav-label">Manage Doctors</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/manage-patients')}>
              <span className="nav-icon">👥</span>
              <span className="nav-label">Manage Patients</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/reports')}>
              <span className="nav-icon">📋</span>
              <span className="nav-label">Reports</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/settings')}>
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Settings</span>
            </li>
          </ul>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon">🚪</span>
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
                <p className="stat-trend">↑ {card.trendValue}</p>
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
          <h2 className="section-title">Recent System Activity</h2>
          <div className="activity-list">
            {activities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <span className="activity-dot"></span>
                <div className="activity-content">
                  <p className="activity-title">{activity.title}</p>
                  <p className="activity-time">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </section>


      </main>
    </div>
  );
};

export default Dashboard;