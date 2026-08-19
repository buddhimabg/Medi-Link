import React, { useState, useEffect, useRef } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  Mail,
  DollarSign,
  CreditCard,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Check,
  Copy,
  Printer,
  X,
  CalendarCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, clearAuthToken } from '../api/api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import './PaymentsPage.css';

interface PaymentItem {
  _id: string;
  paymentId: string;
  appointmentId: string | null;
  amount: number;
  currency: string;
  status: 'Success' | 'Pending' | 'Canceled' | 'Failed' | 'Refunded' | string;
  method: string;
  cardMasked: string;
  cardHolderName: string;
  createdAt: string;
  updatedAt: string;
  appointment: {
    id: string | null;
    doctorName: string;
    specialty: string;
    type: string;
    slot: string;
    userId: string;
    doctorId?: string;
  };
}

interface AnalyticsData {
  currency: string;
  summary: {
    totalRevenue: number;
    totalRevenueFormatted: string;
    successfulCount: number;
    pendingRevenue: number;
    pendingCount: number;
    canceledRevenue: number;
    canceledCount: number;
    failedRevenue: number;
    failedCount: number;
    totalTransactions: number;
    successRate: number;
    avgTransactionValue: number;
    avgTransactionValueFormatted: string;
    todayRevenue: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    revenueGrowth: string;
  };
  revenueTimeline: Array<{
    month: string;
    shortMonth: string;
    revenue: number;
    pending: number;
    transactions: number;
  }>;
  paymentMethods: Array<{
    name: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  statusDistribution: Array<{
    name: string;
    count: number;
    amount: number;
    color: string;
  }>;
  topDoctorsByRevenue: Array<{
    doctorName: string;
    revenue: number;
    appointmentsCount: number;
  }>;
}

const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Data States
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Analytics Tab State
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'timeline' | 'status' | 'methods' | 'doctors'>('timeline');

  // Selected Transaction for Modal
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusUpdateValue, setStatusUpdateValue] = useState<string>('');
  const [statusUpdateNote, setStatusUpdateNote] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Ref for PDF printing
  const receiptRef = useRef<HTMLDivElement>(null);

  // Fetch Analytics & Payments
  const fetchAnalytics = async () => {
    try {
      const res = await apiFetch<{ success: boolean; data: AnalyticsData }>('/payments/analytics');
      if (res?.success) {
        setAnalytics(res.data);
      }
    } catch (err: any) {
      console.warn('Analytics fetch error:', err.message);
    }
  };

  const fetchPayments = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (methodFilter && methodFilter !== 'all') {
        params.append('method', methodFilter);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      // Date preset logic
      if (datePreset === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.append('startDate', today);
      } else if (datePreset === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.append('startDate', d.toISOString().split('T')[0]);
      } else if (datePreset === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.append('startDate', d.toISOString().split('T')[0]);
      }

      const [paymentRes, approvalsRes] = await Promise.all([
        apiFetch<{ success: boolean; data: PaymentItem[]; pagination: any }>(`/payments?${params.toString()}`),
        apiFetch<any>('/doctors/approval-stats').catch(() => null)
      ]);

      if (paymentRes?.success) {
        setPayments(paymentRes.data || []);
        if (paymentRes.pagination) {
          setTotalPages(paymentRes.pagination.totalPages || 1);
          setTotalCount(paymentRes.pagination.total || 0);
        }
      }
      if (approvalsRes?.data) {
        setPendingApprovals(approvalsRes.data.pending || 0);
      }
    } catch (err: any) {
      console.error('Failed to load payments:', err);
      setError(err.message || 'Failed to load payments data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [currentPage, pageSize, statusFilter, methodFilter, datePreset, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1);
      fetchPayments();
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleLogout = () => {
    clearAuthToken();
    navigate('/login');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openPaymentModal = (item: PaymentItem) => {
    setSelectedPayment(item);
    setStatusUpdateValue(item.status);
    setStatusUpdateNote('');
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedPayment) return;
    setIsUpdatingStatus(true);
    try {
      await apiFetch(`/payments/${selectedPayment._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: statusUpdateValue,
          note: statusUpdateNote
        })
      });
      // Refresh current data
      await Promise.all([fetchPayments(), fetchAnalytics()]);
      setSelectedPayment(prev => prev ? { ...prev, status: statusUpdateValue } : null);
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await apiFetch<{ success: boolean; data: any[] }>(`/payments/export?status=${statusFilter}`);
      if (!res?.success || !res.data || res.data.length === 0) {
        alert('No payment records available to export.');
        return;
      }

      const headers = Object.keys(res.data[0]);
      const csvRows = [];
      csvRows.push(headers.join(','));

      for (const row of res.data) {
        const values = headers.map(header => {
          const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
          const escaped = val.replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', `MediLink_Payments_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const handlePrintPDFReceipt = () => {
    if (!receiptRef.current) return;
    const opt = {
      margin: [10, 10] as [number, number],
      filename: `MediLink_Receipt_${selectedPayment?.paymentId || 'Invoice'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
    };
    (html2pdf() as any).set(opt).from(receiptRef.current).save();
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'success' || s === 'paid' || s === 'completed') {
      return (
        <span className="pay-status-badge pay-status-success">
          <CheckCircle2 size={13} />
          <span>Success</span>
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="pay-status-badge pay-status-pending">
          <Clock size={13} />
          <span>Pending</span>
        </span>
      );
    }
    if (s === 'canceled' || s === 'cancelled') {
      return (
        <span className="pay-status-badge pay-status-canceled">
          <XCircle size={13} />
          <span>Canceled</span>
        </span>
      );
    }
    if (s === 'refunded') {
      return (
        <span className="pay-status-badge pay-status-refunded">
          <AlertCircle size={13} />
          <span>Refunded</span>
        </span>
      );
    }
    return (
      <span className="pay-status-badge pay-status-failed">
        <AlertCircle size={13} />
        <span>{status || 'Failed'}</span>
      </span>
    );
  };

  const getMethodIcon = (method: string) => {
    const m = (method || '').toLowerCase();
    if (m.includes('visa')) return <span className="pay-method-pill visa">VISA</span>;
    if (m.includes('master')) return <span className="pay-method-pill mastercard">MC</span>;
    if (m.includes('payhere')) return <span className="pay-method-pill payhere">PayHere</span>;
    return <span className="pay-method-pill default"><CreditCard size={12} /></span>;
  };

  return (
    <div className="payments-container">
      {/* Sidebar */}
      <AdminSidebar activeRoute="/admin-payments" />

      {/* Main Content */}
      <main className="payments-main-content">
        {/* Header */}
        <header className="payments-header">
          <div className="header-left">
            <div className="header-badge">Financial Intelligence</div>
            <h1 className="header-title">Payments & Revenue Overview</h1>
            <p className="header-subtitle">Real-time payment ledger, collection metrics, and transaction monitoring.</p>
          </div>
          <div className="header-right">
            <div className="date-indicator">
              <Calendar size={15} />
              <span>{currentDate}</span>
            </div>
            <button
              className="refresh-btn"
              onClick={() => {
                fetchPayments(true);
                fetchAnalytics();
              }}
              title="Refresh ledger"
            >
              <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button className="export-btn" onClick={handleExportCSV}>
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </header>

        {/* Top KPI Cards */}
        <section className="pay-kpi-grid">
          {/* Total Revenue */}
          <div className="pay-kpi-card highlight-emerald">
            <div className="pay-kpi-header">
              <span className="pay-kpi-label">Total Realized Revenue</span>
              <div className="pay-kpi-icon-wrap emerald">
                <DollarSign size={22} />
              </div>
            </div>
            <div className="pay-kpi-value-row">
              <h2 className="pay-kpi-value">
                {analytics ? analytics.summary.totalRevenueFormatted : 'LKR 0'}
              </h2>
            </div>
            <div className="pay-kpi-footer">
              <span className="pay-trend-badge positive">
                <TrendingUp size={13} />
                <span>{analytics?.summary.revenueGrowth || '+0.0%'} vs last month</span>
              </span>
              <span className="pay-kpi-subtext">Collected in LKR</span>
            </div>
          </div>

          {/* Successful Payments */}
          <div className="pay-kpi-card">
            <div className="pay-kpi-header">
              <span className="pay-kpi-label">Successful Transactions</span>
              <div className="pay-kpi-icon-wrap blue">
                <CheckCircle2 size={22} />
              </div>
            </div>
            <div className="pay-kpi-value-row">
              <h2 className="pay-kpi-value">
                {analytics ? analytics.summary.successfulCount : 0}
              </h2>
              <span className="pay-kpi-unit">/ {analytics ? analytics.summary.totalTransactions : 0} attempts</span>
            </div>
            <div className="pay-kpi-footer">
              <span className="pay-rate-pill">
                Conversion Rate: <strong>{analytics?.summary.successRate || 0}%</strong>
              </span>
            </div>
          </div>

          {/* Pending Volume */}
          <div className="pay-kpi-card">
            <div className="pay-kpi-header">
              <span className="pay-kpi-label">Pending / In-Flight</span>
              <div className="pay-kpi-icon-wrap amber">
                <Clock size={22} />
              </div>
            </div>
            <div className="pay-kpi-value-row">
              <h2 className="pay-kpi-value">
                {analytics ? analytics.summary.pendingCount : 0}
              </h2>
              <span className="pay-kpi-unit">
                (LKR {analytics ? analytics.summary.pendingRevenue.toLocaleString() : 0})
              </span>
            </div>
            <div className="pay-kpi-footer">
              <span className="pay-kpi-subtext warning">Awaiting gateway confirmation</span>
            </div>
          </div>

          {/* Canceled / Failed */}
          <div className="pay-kpi-card">
            <div className="pay-kpi-header">
              <span className="pay-kpi-label">Canceled & Failed</span>
              <div className="pay-kpi-icon-wrap rose">
                <XCircle size={22} />
              </div>
            </div>
            <div className="pay-kpi-value-row">
              <h2 className="pay-kpi-value">
                {analytics ? analytics.summary.canceledCount + analytics.summary.failedCount : 0}
              </h2>
              <span className="pay-kpi-unit">
                (LKR {analytics ? (analytics.summary.canceledRevenue + analytics.summary.failedRevenue).toLocaleString() : 0})
              </span>
            </div>
            <div className="pay-kpi-footer">
              <span className="pay-kpi-subtext">Released appointment slots</span>
            </div>
          </div>

          {/* Average Transaction Value */}
          <div className="pay-kpi-card">
            <div className="pay-kpi-header">
              <span className="pay-kpi-label">Avg Transaction Value</span>
              <div className="pay-kpi-icon-wrap purple">
                <CreditCard size={22} />
              </div>
            </div>
            <div className="pay-kpi-value-row">
              <h2 className="pay-kpi-value">
                {analytics ? analytics.summary.avgTransactionValueFormatted : 'LKR 0'}
              </h2>
            </div>
            <div className="pay-kpi-footer">
              <span className="pay-kpi-subtext">Per successful booking</span>
            </div>
          </div>
        </section>

        {/* Analytics Interactive Charts Section */}
        <section className="pay-charts-section">
          <div className="pay-charts-card">
            <div className="charts-card-header">
              <div className="charts-title-group">
                <h3 className="charts-title">Revenue & Channel Analytics</h3>
                <p className="charts-subtitle">Visual trends and distribution from live payment gateway records.</p>
              </div>
              <div className="analytics-tabs">
                <button
                  className={`tab-btn ${activeAnalyticsTab === 'timeline' ? 'active' : ''}`}
                  onClick={() => setActiveAnalyticsTab('timeline')}
                >
                  Revenue Trends
                </button>
                <button
                  className={`tab-btn ${activeAnalyticsTab === 'status' ? 'active' : ''}`}
                  onClick={() => setActiveAnalyticsTab('status')}
                >
                  Status Share
                </button>
                <button
                  className={`tab-btn ${activeAnalyticsTab === 'methods' ? 'active' : ''}`}
                  onClick={() => setActiveAnalyticsTab('methods')}
                >
                  Payment Methods
                </button>
                <button
                  className={`tab-btn ${activeAnalyticsTab === 'doctors' ? 'active' : ''}`}
                  onClick={() => setActiveAnalyticsTab('doctors')}
                >
                  Doctor Revenue
                </button>
              </div>
            </div>

            <div className="charts-body">
              {activeAnalyticsTab === 'timeline' && (
                <div className="chart-wrapper">
                  <div className="chart-legend-top">
                    <span className="legend-item"><span className="dot dot-emerald"></span> Realized Revenue (LKR)</span>
                    <span className="legend-item"><span className="dot dot-amber"></span> Pending Value (LKR)</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart
                      data={analytics?.revenueTimeline || []}
                      margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f2f5" />
                      <XAxis dataKey="shortMonth" stroke="#64748b" fontSize={12} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(val) => `Rs.${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                      <RechartsTooltip
                        formatter={(val: any) => [`LKR ${Number(val).toLocaleString()}`, '']}
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" name="Realized Revenue" />
                      <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPending)" name="Pending Volume" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeAnalyticsTab === 'status' && (
                <div className="chart-grid-two">
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={analytics?.statusDistribution || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="count"
                        >
                          {(analytics?.statusDistribution || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(val: any, name: any, item: any) => [
                            `${val} transactions (LKR ${item.payload.amount.toLocaleString()})`,
                            item.payload.name
                          ]}
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="status-legend-table">
                    <h4>Status Breakdown</h4>
                    <div className="legend-table-rows">
                      {(analytics?.statusDistribution || []).map((s, idx) => (
                        <div key={idx} className="status-row">
                          <div className="status-info">
                            <span className="status-color-box" style={{ backgroundColor: s.color }}></span>
                            <span className="status-name">{s.name}</span>
                          </div>
                          <div className="status-counts">
                            <span className="status-count">{s.count} txns</span>
                            <span className="status-amount">LKR {s.amount.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeAnalyticsTab === 'methods' && (
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={analytics?.paymentMethods || []}
                      margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f2f5" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                      <RechartsTooltip
                        formatter={(val: any, name: any, item: any) => [
                          `${val} transactions (${item.payload.percentage}%)`,
                          'Usage Count'
                        ]}
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeAnalyticsTab === 'doctors' && (
                <div className="top-doctors-list">
                  {(!analytics?.topDoctorsByRevenue || analytics.topDoctorsByRevenue.length === 0) ? (
                    <div className="empty-mini">No doctor revenue attribution recorded yet.</div>
                  ) : (
                    <div className="doctors-revenue-cards">
                      {analytics.topDoctorsByRevenue.map((doc, idx) => (
                        <div key={idx} className="doc-rev-item">
                          <div className="doc-rev-rank">#{idx + 1}</div>
                          <div className="doc-rev-info">
                            <h4 className="doc-name">{doc.doctorName}</h4>
                            <p className="doc-appts">{doc.appointmentsCount} successful consultation{doc.appointmentsCount > 1 ? 's' : ''}</p>
                          </div>
                          <div className="doc-rev-amount">
                            <span>LKR {doc.revenue.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Transactions Table & Filters Card */}
        <section className="pay-table-card">
          {/* Controls Bar */}
          <div className="table-controls-bar">
            {/* Search Input */}
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search Payment ID, Doctor, Patient, Card..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="filter-group">
              {/* Status Filter */}
              <div className="select-pill-wrap">
                <span className="select-label">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="filter-select"
                >
                  <option value="all">All Statuses ({totalCount})</option>
                  <option value="Success">Success / Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Canceled">Canceled</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="select-pill-wrap">
                <span className="select-label">Date:</span>
                <select
                  value={datePreset}
                  onChange={(e) => {
                    setDatePreset(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="filter-select"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="select-pill-wrap">
                <span className="select-label">Sort:</span>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order as 'asc' | 'desc');
                    setCurrentPage(1);
                  }}
                  className="filter-select"
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="amount-desc">Highest Amount</option>
                  <option value="amount-asc">Lowest Amount</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status Quick Filter Buttons */}
          <div className="quick-status-tabs">
            <button
              className={`quick-tab ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
            >
              All Records
            </button>
            <button
              className={`quick-tab success ${statusFilter === 'Success' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('Success');
                setCurrentPage(1);
              }}
            >
              <CheckCircle2 size={13} />
              <span>Success ({analytics?.summary.successfulCount || 0})</span>
            </button>
            <button
              className={`quick-tab pending ${statusFilter === 'Pending' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('Pending');
                setCurrentPage(1);
              }}
            >
              <Clock size={13} />
              <span>Pending ({analytics?.summary.pendingCount || 0})</span>
            </button>
            <button
              className={`quick-tab canceled ${statusFilter === 'Canceled' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('Canceled');
                setCurrentPage(1);
              }}
            >
              <XCircle size={13} />
              <span>Canceled ({analytics?.summary.canceledCount || 0})</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="table-responsive">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Consultation & Doctor</th>
                  <th>Type</th>
                  <th>Method & Card</th>
                  <th>Date & Time</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="table-loading-cell">
                      <div className="loading-state">
                        <RefreshCw size={24} className="spin" />
                        <span>Loading payment records from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="table-error-cell">
                      <AlertCircle size={20} />
                      <span>{error}</span>
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty-cell">
                      <Receipt size={36} className="empty-icon" />
                      <h4>No matching payments found</h4>
                      <p>Try adjusting your search query, status filters, or date range.</p>
                      <button
                        className="reset-filters-btn"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                          setDatePreset('all');
                          setCurrentPage(1);
                        }}
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const formattedDate = p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'N/A';
                    const formattedTime = p.createdAt
                      ? new Date(p.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '';

                    return (
                      <tr key={p._id} className="payment-row">
                        {/* Transaction ID */}
                        <td className="cell-tx-id">
                          <div className="tx-id-box">
                            <span className="tx-id-text">{p.paymentId}</span>
                            <button
                              className="copy-btn"
                              title="Copy transaction ID"
                              onClick={() => handleCopy(p.paymentId, p._id)}
                            >
                              {copiedId === p._id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            </button>
                          </div>
                          <span className="db-id-sub">DB: {p._id.slice(-6)}</span>
                        </td>

                        {/* Consultation & Doctor */}
                        <td className="cell-doctor">
                          <div className="doctor-cell-group">
                            <div className="doctor-avatar-circle">
                              {p.appointment.doctorName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="doctor-info-text">
                              <span className="doc-name">{p.appointment.doctorName}</span>
                              <span className="doc-specialty">{p.appointment.specialty}</span>
                            </div>
                          </div>
                        </td>

                        {/* Consultation Type */}
                        <td className="cell-type">
                          <span className={`type-badge ${p.appointment.type === 'Virtual' ? 'virtual' : 'physical'}`}>
                            {p.appointment.type || 'Virtual'}
                          </span>
                        </td>

                        {/* Payment Method & Masked Card */}
                        <td className="cell-method">
                          <div className="method-info">
                            <div className="method-top">
                              {getMethodIcon(p.method)}
                              <span className="method-name">{p.method}</span>
                            </div>
                            <span className="card-masked">{p.cardMasked}</span>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="cell-date">
                          <div className="date-time-group">
                            <span className="date-text">{formattedDate}</span>
                            <span className="time-text">{formattedTime}</span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="cell-amount">
                          <div className="amount-group">
                            <span className="amount-val">
                              {p.currency} {Number(p.amount).toLocaleString()}.00
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="cell-status">{getStatusBadge(p.status)}</td>

                        {/* Actions */}
                        <td className="cell-actions">
                          <button
                            className="view-receipt-btn"
                            onClick={() => openPaymentModal(p)}
                            title="View receipt & details"
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="table-pagination-footer">
            <div className="pagination-info">
              Showing <strong>{payments.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
              <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> transactions
            </div>
            <div className="pagination-controls">
              <div className="page-size-selector">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="page-buttons">
                <button
                  className="page-nav-btn"
                  disabled={currentPage <= 1 || isLoading}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="current-page-indicator">
                  Page <strong>{currentPage}</strong> of {totalPages}
                </span>
                <button
                  className="page-nav-btn"
                  disabled={currentPage >= totalPages || isLoading}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Transaction & Receipt Detail Modal */}
      {isModalOpen && selectedPayment && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <Receipt size={20} className="modal-icon" />
                <h3>Transaction Details & Invoice</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Printable Receipt Area */}
            <div className="modal-body-scrollable" ref={receiptRef}>
              {/* Receipt Header */}
              <div className="receipt-paper">
                <div className="receipt-brand-row">
                  <div className="receipt-logo-title">
                    <h2>MediLink Health</h2>
                    <p>Official Patient Consultation Receipt</p>
                  </div>
                  <div className="receipt-status-wrap">
                    {getStatusBadge(selectedPayment.status)}
                  </div>
                </div>

                <div className="receipt-divider"></div>

                {/* Key Metadata Grid */}
                <div className="receipt-meta-grid">
                  <div className="meta-col">
                    <span className="meta-label">Payment ID:</span>
                    <span className="meta-value bold">{selectedPayment.paymentId}</span>
                  </div>
                  <div className="meta-col">
                    <span className="meta-label">Database Ref:</span>
                    <span className="meta-value">{selectedPayment._id}</span>
                  </div>
                  <div className="meta-col">
                    <span className="meta-label">Transaction Date:</span>
                    <span className="meta-value">
                      {selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="meta-col">
                    <span className="meta-label">Payment Method:</span>
                    <span className="meta-value">{selectedPayment.method} ({selectedPayment.cardMasked})</span>
                  </div>
                </div>

                <div className="receipt-divider"></div>

                {/* Consultation Details */}
                <div className="receipt-section">
                  <h4 className="section-heading">Consultation Information</h4>
                  <div className="receipt-details-list">
                    <div className="detail-row">
                      <span className="detail-name">Consulting Doctor:</span>
                      <span className="detail-val font-semibold">{selectedPayment.appointment.doctorName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-name">Medical Specialty:</span>
                      <span className="detail-val">{selectedPayment.appointment.specialty}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-name">Consultation Mode:</span>
                      <span className="detail-val">{selectedPayment.appointment.type} Appointment</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-name">Scheduled Slot:</span>
                      <span className="detail-val">{selectedPayment.appointment.slot || 'Booked Slot'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-name">Card Holder / Customer:</span>
                      <span className="detail-val">{selectedPayment.cardHolderName}</span>
                    </div>
                  </div>
                </div>

                <div className="receipt-divider"></div>

                {/* Financial Itemization */}
                <div className="receipt-section">
                  <h4 className="section-heading">Fee Breakdown</h4>
                  <div className="fee-table">
                    <div className="fee-row">
                      <span>Doctor Consultation Fee</span>
                      <span>{selectedPayment.currency} {Number(selectedPayment.amount).toLocaleString()}.00</span>
                    </div>
                    <div className="fee-row muted">
                      <span>MediLink Service & Platform Fee</span>
                      <span>Included</span>
                    </div>
                    <div className="fee-row muted">
                      <span>Gateway Processing & Tax</span>
                      <span>Included</span>
                    </div>
                    <div className="fee-row total-row">
                      <span>Total Amount Paid</span>
                      <span className="total-amount">
                        {selectedPayment.currency} {Number(selectedPayment.amount).toLocaleString()}.00
                      </span>
                    </div>
                  </div>
                </div>

                <div className="receipt-footer-note">
                  <p>This is a computer-generated receipt issued through MediLink Healthcare Gateway.</p>
                </div>
              </div>

              {/* Admin Override Status Section */}
              <div className="admin-status-override-box">
                <h4 className="override-title">Admin Status Management</h4>
                <p className="override-desc">
                  Manually adjust the ledger status for this transaction if manual reconciliation is required.
                </p>
                <div className="override-form">
                  <div className="override-select-wrap">
                    <label>Update Status to:</label>
                    <select
                      value={statusUpdateValue}
                      onChange={(e) => setStatusUpdateValue(e.target.value)}
                      className="override-select"
                    >
                      <option value="Success">Success (Paid)</option>
                      <option value="Pending">Pending</option>
                      <option value="Canceled">Canceled</option>
                      <option value="Refunded">Refunded</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                  <div className="override-note-wrap">
                    <label>Audit Note / Reason:</label>
                    <input
                      type="text"
                      placeholder="e.g. Verified with bank / Patient requested refund"
                      value={statusUpdateNote}
                      onChange={(e) => setStatusUpdateNote(e.target.value)}
                      className="override-input"
                    />
                  </div>
                  <button
                    className="save-status-btn"
                    onClick={handleUpdateStatus}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? 'Saving...' : 'Apply Status Update'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handlePrintPDFReceipt}>
                <Printer size={15} />
                <span>Print / Download PDF Receipt</span>
              </button>
              <button className="btn-primary" onClick={() => setIsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
