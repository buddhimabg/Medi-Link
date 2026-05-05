import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ReportsPage.css';

interface MetricCard {
  label: string;
  value: string;
  change: string;
  icon: string;
  changeColor: string;
}

interface TabContent {
  appointments: boolean;
  revenue: boolean;
  performance: boolean;
}

interface Doctor {
  name: string;
  patients: number;
  rating: number;
}

interface SatisfactionRating {
  stars: number;
  count: number;
  percentage: number;
}

const ReportsAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<keyof TabContent>('appointments');
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  const metrics: MetricCard[] = [
    {
      label: 'Total Revenue',
      value: 'LKR 304K',
      change: '+15% from last month',
      icon: '📈',
      changeColor: '#4CAF50',
    },
    {
      label: 'Appointments',
      value: '2,638',
      change: '+8% from last month',
      icon: '📅',
      changeColor: '#4CAF50',
    },
    {
      label: 'New Patients',
      value: '234',
      change: '+12% from last month',
      icon: '👥',
      changeColor: '#4CAF50',
    },
    {
      label: 'Prescriptions',
      value: '1,542',
      change: '+5% from last month',
      icon: '📋',
      changeColor: '#4CAF50',
    },
  ];

  const appointmentStatusData = [
    { label: 'Completed', value: 2145, color: '#4CAF50' },
    { label: 'Upcoming', value: 325, color: '#2196F3' },
    { label: 'Cancelled', value: 168, color: '#F44336' },
  ];

  const appointmentTypesData = [
    { label: 'Virtual Consultation', value: 1456, color: '#2196F3' },
    { label: 'In-Person Visit', value: 1182, color: '#4CAF50' },
  ];

  const revenueBreakdownData = [
    { label: 'Consultations', value: 198500, color: '#4CAF50' },
    { label: 'Prescriptions', value: 61000, color: '#4CAF50' },
    { label: 'Lab Tests', value: 30500, color: '#4CAF50' },
    { label: 'Other Services', value: 15000, color: '#4CAF50' },
  ];

  const paymentMethodsData = [
    { label: 'Insurance', value: 182400, color: '#2196F3' },
    { label: 'Credit Card', value: 91200, color: '#2196F3' },
    { label: 'Cash', value: 30400, color: '#2196F3' },
  ];

  const specialtyPerformanceData = [
    { specialty: 'radiology', value: 145, maxValue: 160 },
    { specialty: 'pediatrics', value: 130, maxValue: 160 },
    { specialty: 'orthopedics', value: 110, maxValue: 160 },
    { specialty: 'urology', value: 92, maxValue: 160 },
    { specialty: 'General', value: 155, maxValue: 160 },
  ];

  const topDoctors: Doctor[] = [
    { name: 'Dr. Sarah Johnson', patients: 245, rating: 4.8 },
    { name: 'Dr. Priya Sharma', patients: 334, rating: 4.9 },
    { name: 'Dr. Michael Chen', patients: 312, rating: 4.9 },
    { name: 'Dr. James Wilson', patients: 279, rating: 4.6 },
    { name: 'Dr. Emily Rodriguez', patients: 198, rating: 4.7 },
  ];

  const satisfactionRatings: SatisfactionRating[] = [
    { stars: 5, count: 856, percentage: 70 },
    { stars: 4, count: 278, percentage: 23 },
    { stars: 3, count: 87, percentage: 7 },
    { stars: 2, count: 19, percentage: 2 },
    { stars: 1, count: 5, percentage: 0 },
  ];

  const appointmentTrendData = [
    { month: 'Jan', value: 420 },
    { month: 'Feb', value: 480 },
    { month: 'Mar', value: 510 },
    { month: 'Apr', value: 490 },
    { month: 'May', value: 570 },
    { month: 'Jun', value: 610 },
  ];

  const revenueTrendData = [
    { month: 'Jan', value: 42000 },
    { month: 'Feb', value: 48000 },
    { month: 'Mar', value: 51000 },
    { month: 'Apr', value: 49000 },
    { month: 'May', value: 54000 },
    { month: 'Jun', value: 58000 },
  ];

  const maxAppointmentValue = Math.max(...appointmentTrendData.map(d => d.value));
  const maxRevenueValue = Math.max(...revenueTrendData.map(d => d.value));

  return (
    <div className="reports-container">
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
            <li className="nav-item" onClick={() => navigate('/admin-dashboard')}>
              <span className="nav-icon">📊</span>
              <span className="nav-label">Dashboard</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/manage-doctors')}>
              <span className="nav-icon">👨‍⚕️</span>
              <span className="nav-label">Manage Doctors</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/manage-patients')}>
              <span className="nav-icon">👥</span>
              <span className="nav-label">Manage Patients</span>
            </li>
            <li className="nav-item nav-item-active" onClick={() => navigate('/reports')}>
              <span className="nav-icon">📋</span>
              <span className="nav-label">Reports</span>
              <span className="nav-arrow">›</span>
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

      <main className="main-content">
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">Reports & Analytics</h1>
            <p className="header-subtitle">View system reports and statistics</p>
          </div>
          <div className="header-actions">
            <select className="month-dropdown">
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
            <button className="export-btn">
              <span>⬇️</span> Export
            </button>
          </div>
        </div>

        <div className="metrics-grid">
          {metrics.map((metric, index) => (
            <div key={index} className="metric-card">
              <div className="metric-content">
                <p className="metric-label">{metric.label}</p>
                <h3 className="metric-value">{metric.value}</h3>
                <p className="metric-change" style={{ color: metric.changeColor }}>
                  {metric.change}
                </p>
              </div>
              <div className="metric-icon">{metric.icon}</div>
            </div>
          ))}
        </div>

        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            Appointments
          </button>
          <button
            className={`tab-button ${activeTab === 'revenue' ? 'active' : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            Revenue
          </button>
          <button
            className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
        </div>

        {activeTab === 'appointments' && (
          <div className="tab-content">
            <div className="chart-card">
              <h3 className="chart-title">Appointment Trends</h3>
              <div className="line-chart-container">
                <div className="y-axis-label">600</div>
                <svg viewBox="0 0 1000 400" className="line-svg">
                  <line x1="50" y1="50" x2="950" y2="50" stroke="#e0e0e0" strokeDasharray="5,5" />
                  <line x1="50" y1="120" x2="950" y2="120" stroke="#e0e0e0" strokeDasharray="5,5" />
                  <line x1="50" y1="190" x2="950" y2="190" stroke="#e0e0e0" strokeDasharray="5,5" />
                  <line x1="50" y1="260" x2="950" y2="260" stroke="#e0e0e0" strokeDasharray="5,5" />
                  <line x1="50" y1="330" x2="950" y2="330" stroke="#e0e0e0" strokeDasharray="5,5" />

                  <polyline
                    points={appointmentTrendData
                      .map((d, i) => {
                        const x = 50 + (i * 900) / (appointmentTrendData.length - 1);
                        const y = 330 - (d.value / maxAppointmentValue) * 280;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#2196F3"
                    strokeWidth="3"
                  />

                  {appointmentTrendData.map((d, i) => {
                    const x = 50 + (i * 900) / (appointmentTrendData.length - 1);
                    const y = 330 - (d.value / maxAppointmentValue) * 280;
                    return <circle key={i} cx={x} cy={y} r="5" fill="#2196F3" />;
                  })}

                  {appointmentTrendData.map((d, i) => {
                    const x = 50 + (i * 900) / (appointmentTrendData.length - 1);
                    return (
                      <text key={i} x={x} y="370" textAnchor="middle" fontSize="12" fill="#666">
                        {d.month}
                      </text>
                    );
                  })}

                  <text x="20" y="55" textAnchor="end" fontSize="12" fill="#666">
                    600
                  </text>
                  <text x="20" y="195" textAnchor="end" fontSize="12" fill="#666">
                    300
                  </text>
                  <text x="20" y="335" textAnchor="end" fontSize="12" fill="#666">
                    0
                  </text>
                </svg>
              </div>
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#2196F3' }}></span>
                  appointments
                </span>
              </div>
            </div>

            <div className="charts-row">
              <div className="bar-chart-card">
                <h3 className="chart-title">Appointment Status</h3>
                {appointmentStatusData.map((item, index) => (
                  <div key={index} className="bar-item">
                    <div className="bar-label">
                      <span>{item.label}</span>
                      <span className="bar-value">{item.value}</span>
                    </div>
                    <div className="bar-background">
                      <div className="bar" style={{ width: `${(item.value / 2500) * 100}%`, backgroundColor: item.color }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bar-chart-card">
                <h3 className="chart-title">Appointment Types</h3>
                {appointmentTypesData.map((item, index) => (
                  <div key={index} className="bar-item">
                    <div className="bar-label">
                      <span>{item.label}</span>
                      <span className="bar-value">{item.value}</span>
                    </div>
                    <div className="bar-background">
                      <div className="bar" style={{ width: `${(item.value / 1500) * 100}%`, backgroundColor: item.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="tab-content">
            <div className="chart-card">
              <h3 className="chart-title">Revenue Trends</h3>
              <div className="bar-chart-container-large">
                <svg viewBox="0 0 1000 400" className="bar-svg">
                  <line x1="50" y1="50" x2="950" y2="50" stroke="#e0e0e0" strokeDasharray="5,5" />
                  <line x1="50" y1="120" x2="950" y2="120" stroke="#e0e0e0" strokeDasharray="5,5" />
                  <line x1="50" y1="190" x2="950" y2="190" stroke="#e0e0e0" strokeDasharray="5,5" />
                  <line x1="50" y1="260" x2="950" y2="260" stroke="#e0e0e0" strokeDasharray="5,5" />
                  <line x1="50" y1="330" x2="950" y2="330" stroke="#e0e0e0" strokeDasharray="5,5" />

                  {revenueTrendData.map((d, i) => {
                    const barWidth = 80;
                    const x = 50 + (i * 900) / (revenueTrendData.length - 1) - barWidth / 2;
                    const barHeight = (d.value / maxRevenueValue) * 280;
                    const y = 330 - barHeight;
                    return <rect key={i} x={x} y={y} width={barWidth} height={barHeight} fill="#4CAF50" />;
                  })}

                  {revenueTrendData.map((d, i) => {
                    const x = 50 + (i * 900) / (revenueTrendData.length - 1);
                    return (
                      <text key={i} x={x} y="370" textAnchor="middle" fontSize="12" fill="#666">
                        {d.month}
                      </text>
                    );
                  })}

                  <text x="30" y="55" textAnchor="end" fontSize="12" fill="#666">
                    60000
                  </text>
                  <text x="30" y="195" textAnchor="end" fontSize="12" fill="#666">
                    30000
                  </text>
                  <text x="30" y="335" textAnchor="end" fontSize="12" fill="#666">
                    0
                  </text>
                </svg>
              </div>
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#4CAF50' }}></span>
                  revenue
                </span>
              </div>
            </div>

            <div className="charts-row">
              <div className="bar-chart-card">
                <h3 className="chart-title">Revenue Breakdown</h3>
                {revenueBreakdownData.map((item, index) => (
                  <div key={index} className="bar-item">
                    <div className="bar-label">
                      <span>{item.label}</span>
                      <span className="bar-value">${(item.value / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="bar-background">
                      <div className="bar" style={{ width: `${(item.value / 200000) * 100}%`, backgroundColor: item.color }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bar-chart-card">
                <h3 className="chart-title">Payment Methods</h3>
                {paymentMethodsData.map((item, index) => (
                  <div key={index} className="bar-item">
                    <div className="bar-label">
                      <span>{item.label}</span>
                      <span className="bar-value">${(item.value / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="bar-background">
                      <div className="bar" style={{ width: `${(item.value / 200000) * 100}%`, backgroundColor: item.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="tab-content">
            <div className="chart-card">
              <h3 className="chart-title">Specialty Performance</h3>
              <div className="horizontal-chart-container">
                <svg viewBox="0 0 1000 300" className="horizontal-bar-svg">
                  {specialtyPerformanceData.map((item, i) => {
                    const barHeight = 40;
                    const y = 20 + i * (barHeight + 20);
                    const barWidth = (item.value / item.maxValue) * 850;
                    return (
                      <g key={i}>
                        <rect x="100" y={y} width={barWidth} height={barHeight} fill="#FFC107" />
                        <text x="5" y={y + barHeight / 2 + 5} fontSize="12" fill="#666">
                          {item.specialty}
                        </text>
                        <text x={110 + barWidth} y={y + barHeight / 2 + 5} fontSize="12" fill="#666">
                          {item.value}
                        </text>
                      </g>
                    );
                  })}

                  <line x1="100" y1="280" x2="950" y2="280" stroke="#ddd" strokeWidth="1" />
                  <text x="100" y="300" fontSize="12" fill="#999">0</text>
                  <text x="400" y="300" fontSize="12" fill="#999">80</text>
                  <text x="700" y="300" fontSize="12" fill="#999">160</text>
                </svg>
              </div>
            </div>

            <div className="charts-row">
              <div className="performance-card">
                <h3 className="chart-title">Top Performing Doctors</h3>
                {topDoctors.map((doctor, index) => (
                  <div key={index} className="doctor-item">
                    <div>
                      <p className="doctor-name">{doctor.name}</p>
                      <p className="doctor-patients">{doctor.patients} patients</p>
                    </div>
                    <div className="doctor-rating">
                      <span className="rating-value">{doctor.rating}</span>
                      <span className="rating-icon">⭐</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="performance-card">
                <h3 className="chart-title">Patient Satisfaction</h3>
                <div className="satisfaction-highlight">
                  <p className="satisfaction-value">4.7</p>
                  <p className="satisfaction-label">Average Rating</p>
                  <p className="satisfaction-count">Based on 1,245 reviews</p>
                </div>
                <div className="rating-breakdown">
                  {satisfactionRatings.map((rating, index) => (
                    <div key={index} className="rating-row">
                      <span className="rating-stars">{rating.stars} ⭐</span>
                      <div className="rating-bar-bg">
                        <div
                          className="rating-bar"
                          style={{
                            width: `${rating.percentage}%`,
                            backgroundColor:
                              rating.stars === 5
                                ? '#FFC107'
                                : rating.stars === 4
                                ? '#66BB6A'
                                : rating.stars === 3
                                ? '#FFA726'
                                : rating.stars === 2
                                ? '#FF7043'
                                : '#EF5350',
                          }}
                        ></div>
                      </div>
                      <span className="rating-count">{rating.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};



export default ReportsAnalytics;