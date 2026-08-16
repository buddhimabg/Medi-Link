import React, { useState, useEffect, useRef } from 'react'; // debug reload 3
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { LayoutDashboard, Stethoscope, Users, FileText, Settings, LogOut, Download, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, clearAuthToken } from '../api/api';
import './ReportsPage.css';

interface StatCard {
  label: string;
  value: string;
  icon: string;
  trend: string;
  trendValue: string;
  backgroundColor: string;
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
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();
  const reportRef = useRef<HTMLElement>(null);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    // Wait for the DOM to update and charts to finish rendering/animating
    setTimeout(async () => {
      try {
        const opt = {
          margin:       [15, 15] as [number, number],
          filename:     'MediLink_Report.pdf',
          image:        { type: 'jpeg', quality: 1 },
          html2canvas:  { scale: 2, useCORS: true, logging: false },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        if (reportRef.current) {
          await (html2pdf() as any).set(opt).from(reportRef.current).save();
        }
      } catch (error) {
        console.error('Error generating PDF', error);
      } finally {
        setIsExporting(false);
      }
    }, 1500);
  };
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [appointmentTrendData, setAppointmentTrendData] = useState<{ month: string, value: number }[]>(() => {
    const months = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ month: monthNames[d.getMonth()], value: 0 });
    }
    return months;
  });

  const [appointmentStatusData, setAppointmentStatusData] = useState([
    { label: 'Completed', value: 0, color: '#4CAF50' },
    { label: 'Upcoming', value: 0, color: '#2196F3' },
    { label: 'Cancelled', value: 0, color: '#F44336' },
  ]);

  const [appointmentTypesData, setAppointmentTypesData] = useState([
    { label: 'Virtual Consultation', value: 0, color: '#2196F3' },
    { label: 'In-Person Visit', value: 0, color: '#4CAF50' },
  ]);

  const [revenueBreakdownData, setRevenueBreakdownData] = useState([
    { label: 'In-Person Consultations', value: 0, color: '#4CAF50' },
    { label: 'Video Consultations', value: 0, color: '#4CAF50' },
    { label: 'Phone Consultations', value: 0, color: '#4CAF50' },
  ]);

  const [paymentMethodsData, setPaymentMethodsData] = useState<{ label: string; value: number; color: string }[]>([]);

  const [specialtyPerformanceData, setSpecialtyPerformanceData] = useState<any[]>([]);
  const [topDoctors, setTopDoctors] = useState<Doctor[]>([]);
  const [satisfactionRatings, setSatisfactionRatings] = useState<SatisfactionRating[]>([]);
  const [satisfactionMetrics, setSatisfactionMetrics] = useState({ avgRating: 0, totalReviews: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await apiFetch<any>('/dashboard/stats').catch(() => null);
        if (statsRes?.success) setDashboardStats(statsRes.data);

        const trendsRes = await apiFetch<any>('/reports/analytics/appointments-trends').catch(() => null);
        if (trendsRes?.success && trendsRes.data) {
          setAppointmentTrendData(trendsRes.data);
        }

        const statusRes = await apiFetch<any>('/reports/analytics/appointment-status').catch(() => null);
        if (statusRes?.success && statusRes.data) {
          setAppointmentStatusData([
            { label: 'Completed', value: statusRes.data.completed || 0, color: '#4CAF50' },
            { label: 'Upcoming', value: statusRes.data.upcoming || 0, color: '#2196F3' },
            { label: 'Cancelled', value: statusRes.data.cancelled || 0, color: '#F44336' },
          ]);
        }

        const typesRes = await apiFetch<any>('/reports/analytics/appointment-types').catch(() => null);
        if (typesRes?.success && typesRes.data) {
          setAppointmentTypesData([
            { label: 'Virtual Consultation', value: typesRes.data.virtualConsultation || 0, color: '#2196F3' },
            { label: 'In-Person Visit', value: typesRes.data.inPersonVisit || 0, color: '#4CAF50' },
          ]);
        }

        const revTrendsRes = await apiFetch<any>('/reports/analytics/revenue-trends').catch(() => null);
        if (revTrendsRes?.success && revTrendsRes.data) {
          setRevenueTrendData(revTrendsRes.data);
        }

        const breakdownRes = await apiFetch<any>('/reports/analytics/revenue-breakdown').catch(() => null);
        if (breakdownRes?.success && breakdownRes.data) {
          const bd = breakdownRes.data;
          setRevenueBreakdownData([
            { label: 'In-Person Consultations', value: bd.consultations?.value || 0, color: '#4CAF50' },
            { label: 'Video Consultations', value: bd.videoConsultations?.value || 0, color: '#4CAF50' },
            { label: 'Phone Consultations', value: bd.phoneConsultations?.value || 0, color: '#4CAF50' },
          ]);
        }

        const paymentRes = await apiFetch<any>('/reports/analytics/payment-methods').catch(() => null);
        if (paymentRes?.success && paymentRes.data) {
          const colors = ['#2196F3', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#1E88E5', '#1565C0'];
          const items = Object.entries(paymentRes.data).map(([key, val]: [string, any], idx: number) => ({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value: val.value || 0,
            color: colors[idx % colors.length],
          }));
          setPaymentMethodsData(items);
        }

        const specialtyRes = await apiFetch<any>('/reports/analytics/specialty-performance').catch(() => null);
        if (specialtyRes?.success && specialtyRes.data) {
          setSpecialtyPerformanceData(specialtyRes.data);
        }

        const doctorsRes = await apiFetch<any>('/reports/analytics/top-doctors').catch(() => null);
        if (doctorsRes?.success && doctorsRes.data) {
          setTopDoctors(doctorsRes.data);
        }

        const satisfactionRes = await apiFetch<any>('/reports/analytics/patient-satisfaction').catch(() => null);
        if (satisfactionRes?.success && satisfactionRes.data) {
          setSatisfactionMetrics({
            avgRating: satisfactionRes.data.avgRating || 0,
            totalReviews: satisfactionRes.data.totalReviews || 0
          });
          if (satisfactionRes.data.ratingDistribution) {
            const dist = satisfactionRes.data.ratingDistribution;
            setSatisfactionRatings([
              { stars: 5, count: dist['5']?.count || 0, percentage: dist['5']?.percentage || 0 },
              { stars: 4, count: dist['4']?.count || 0, percentage: dist['4']?.percentage || 0 },
              { stars: 3, count: dist['3']?.count || 0, percentage: dist['3']?.percentage || 0 },
              { stars: 2, count: dist['2']?.count || 0, percentage: dist['2']?.percentage || 0 },
              { stars: 1, count: dist['1']?.count || 0, percentage: dist['1']?.percentage || 0 },
            ]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch reports data", error);
      }
    };

    fetchData(); // initial fetch
    const intervalId = setInterval(fetchData, 10000); // 10s polling for real-time updates
    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    navigate('/login');
  };

  const statCards: StatCard[] = [
    {
      label: 'Total Patients',
      value: dashboardStats?.totalPatients?.value?.toString() || '0',
      icon: '',
      trend: dashboardStats?.totalPatients?.change?.startsWith('-') ? 'down' : 'up',
      trendValue: dashboardStats?.totalPatients?.change?.replace(/^[+-]/, '') || '0% vs last month',
      backgroundColor: '#EBF3FF'
    },
    {
      label: 'Total Doctors',
      value: dashboardStats?.totalDoctors?.value?.toString() || '0',
      icon: '',
      trend: dashboardStats?.totalDoctors?.change?.startsWith('-') ? 'down' : 'up',
      trendValue: dashboardStats?.totalDoctors?.change?.replace(/^[+-]/, '') || '0% vs last month',
      backgroundColor: '#EBF3FF'
    },
    {
      label: 'Total Appointments',
      value: dashboardStats?.appointments?.value?.toString() || '0',
      icon: '',
      trend: dashboardStats?.appointments?.change?.startsWith('-') ? 'down' : 'up',
      trendValue: dashboardStats?.appointments?.change?.replace(/^[+-]/, '') || '0% vs last month',
      backgroundColor: '#E3F2FD'
    },
    {
      label: 'Total Revenue',
      value: dashboardStats?.revenue?.value?.toString() || '$0',
      icon: '',
      trend: dashboardStats?.revenue?.change?.startsWith('-') ? 'down' : 'up',
      trendValue: dashboardStats?.revenue?.change?.replace(/^[+-]/, '') || '0% vs last month',
      backgroundColor: '#E3F2FD'
    }
  ];

  const totalAppointmentStatus = Math.max(1, appointmentStatusData.reduce((acc, item) => acc + item.value, 0));
  const totalAppointmentTypes = Math.max(1, appointmentTypesData.reduce((acc, item) => acc + item.value, 0));

  const [revenueTrendData, setRevenueTrendData] = useState<{ month: string, value: number }[]>(() => {
    const months = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ month: monthNames[d.getMonth()], value: 0 });
    }
    return months;
  });

  // const _rawMaxApptValue = Math.max(...appointmentTrendData.map(d => d.value));

  return (
    <div className="reports-container">
      <aside className="sidebar">
        <div className="logo-section">
          <h2 className="logo">MediLink</h2>
        </div>


        <nav className="navigation">
          <ul className="nav-list">
            <li className="nav-item" onClick={() => navigate('/admin-dashboard')}>
              <span className="nav-icon"><LayoutDashboard size={20} /></span>
              <span className="nav-label">Dashboard</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/manage-doctors')}>
              <span className="nav-icon"><Stethoscope size={20} /></span>
              <span className="nav-label">Manage Doctors</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/doctor-approvals')}>
              <span className="nav-icon"><ShieldCheck size={20} /></span>
              <span className="nav-label">Doctor Approvals</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/manage-patients')}>
              <span className="nav-icon"><Users size={20} /></span>
              <span className="nav-label">Manage Patients</span>
            </li>
            <li className="nav-item nav-item-active" onClick={() => navigate('/admin-reports')}>
              <span className="nav-icon"><FileText size={20} /></span>
              <span className="nav-label">Reports</span>
              <span className="nav-arrow">›</span>
            </li>
            <li className="nav-item" onClick={() => navigate('/admin-settings')}>
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

      <main className="main-content" ref={reportRef}>
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">Reports & Analytics</h1>
            <p className="header-subtitle">View system reports and statistics</p>
          </div>
          {!isExporting && (
            <div className="header-actions">
              <select className="month-dropdown">
                <option>This Month</option>
                <option>Last Month</option>
                <option>This Quarter</option>
                <option>This Year</option>
              </select>
              <button className="export-btn" onClick={handleExportPDF}>
                <Download size={16} /> Export PDF
              </button>
            </div>
          )}
        </div>

        <div className="stats-grid">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="stat-card"
              style={{ backgroundColor: card.backgroundColor }}
            >
              <div className="stat-header">
                <h3 className="stat-label">{card.label}</h3>
              </div>
              <p className="stat-value">{card.value}</p>
            </div>
          ))}
        </div>

        {!isExporting && (
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
        )}

        {(isExporting || activeTab === 'appointments') && (
          <div className="tab-content">
            <div className="chart-card">
              <h3 className="chart-title">Appointment Trends</h3>
              <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
                <ResponsiveContainer>
                  <LineChart data={appointmentTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Appointments"
                      stroke="#2196F3"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#2196F3', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
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
                      <div className="bar" style={{ width: `${(item.value / totalAppointmentStatus) * 100}%`, backgroundColor: item.color }}></div>
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
                      <div className="bar" style={{ width: `${(item.value / totalAppointmentTypes) * 100}%`, backgroundColor: item.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(isExporting || activeTab === 'revenue') && (
          <div className="tab-content">
            <div className="chart-card">
              <h3 className="chart-title">Revenue Trends</h3>
              <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
                <ResponsiveContainer>
                  <BarChart data={revenueTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar
                      dataKey="value"
                      name="Revenue"
                      fill="#4CAF50"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="charts-row">
              <div className="bar-chart-card">
                <h3 className="chart-title">Revenue Breakdown</h3>
                {revenueBreakdownData.map((item, index) => {
                  const maxVal = Math.max(...revenueBreakdownData.map(d => d.value), 1);
                  return (
                    <div key={index} className="bar-item">
                      <div className="bar-label">
                        <span>{item.label}</span>
                        <span className="bar-value">${item.value}</span>
                      </div>
                      <div className="bar-background">
                        <div className="bar" style={{ width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bar-chart-card">
                <h3 className="chart-title">Revenue by Specialty</h3>
                {paymentMethodsData.length > 0 ? paymentMethodsData.map((item, index) => {
                  const maxVal = Math.max(...paymentMethodsData.map(d => d.value), 1);
                  return (
                    <div key={index} className="bar-item">
                      <div className="bar-label">
                        <span>{item.label}</span>
                        <span className="bar-value">${item.value}</span>
                      </div>
                      <div className="bar-background">
                        <div className="bar" style={{ width: `${(item.value / maxVal) * 100}%`, backgroundColor: item.color }}></div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="bar-item">
                    <div className="bar-label">
                      <span>No data available</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {(isExporting || activeTab === 'performance') && (
          <div className="tab-content">
            <div className="chart-card specialty-chart-wrapper">
              <h3 className="chart-title">Specialty Performance</h3>
              <div style={{ width: '100%', height: 450, marginTop: '20px' }}>
                <ResponsiveContainer>
                  <BarChart
                    data={specialtyPerformanceData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, bottom: 5, left: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={false} opacity={0.5} />
                    {specialtyPerformanceData.map((item, index) => (
                      <ReferenceLine key={index} y={item.specialty} stroke="#e5e7eb" strokeDasharray="3 3" />
                    ))}
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis
                      dataKey="specialty"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 500 }}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }}
                    />
                    <Bar
                      dataKey="value"
                      name="Appointments"
                      fill="#F59E0B"
                      radius={[0, 6, 6, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
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
                  <p className="satisfaction-value">{satisfactionMetrics.avgRating.toFixed(1)}</p>
                  <p className="satisfaction-label">Average Rating</p>
                  <p className="satisfaction-count">Based on {satisfactionMetrics.totalReviews.toLocaleString()} reviews</p>
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