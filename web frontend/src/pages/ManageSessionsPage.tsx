import React, { useState, useEffect, useMemo } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  DollarSign,
  Mail,
  ShieldCheck,
  Calendar,
  CalendarCheck,
  Clock,
  MapPin,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  LogOut,
  User,
  Table as TableIcon,
  Grid as GridIcon,
  Building,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, clearAuthToken } from '../api/api';
import './ManageSessionsPage.css';

interface DoctorOption {
  id: string | number;
  _id?: string;
  name: string;
  specialty?: string;
  photo?: string;
}

interface SessionItem {
  _id: string;
  id: number;
  doctorId?: string | number;
  hospital: string;
  location?: string;
  date: string;
  day?: string;
  time: string;
  status: 'Available' | 'Booked' | 'Completed' | 'Cancelled';
  week?: string;
  totalPatients?: number;
  roomNumber?: string;
  notes?: string;
  doctor?: {
    id?: string | number;
    _id?: string;
    name: string;
    specialty: string;
    photo?: string;
    hospital?: string;
  };
}

interface SessionStats {
  total: number;
  available: number;
  booked: number;
  completed: number;
  cancelled: number;
  totalPatientsCapacity: number;
  hospitalStats?: Array<{ hospital: string; count: number }>;
  dayStats?: Record<string, number>;
}

const POPULAR_HOSPITALS = [
  'Nawaloka Hospital',
  'Lanka Hospital',
  'MindCare Clinic',
  'Asiri Surgical Hospital',
  'Calm Path Psychiatry',
  'Durdans Hospital',
  'Kings Hospital Colombo',
  'Central Hospital'
];

const TIME_PRESETS = [
  '06:00 AM - 08:00 AM',
  '08:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '02:00 PM - 04:00 PM',
  '05:00 PM - 07:00 PM',
  '08:00 PM - 10:00 PM'
];

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface SessionFormData {
  id: string;
  doctorId: string;
  hospital: string;
  customHospital: string;
  location: string;
  date: string;
  day: string;
  time: string;
  status: 'Available' | 'Booked' | 'Completed' | 'Cancelled';
  week: string;
  totalPatients: number;
  roomNumber: string;
  notes: string;
}

const emptyFormData: SessionFormData = {
  id: '',
  doctorId: '',
  hospital: 'Nawaloka Hospital',
  customHospital: '',
  location: 'Colombo 2',
  date: new Date().toISOString().split('T')[0],
  day: 'MON',
  time: '05:00 PM - 07:00 PM',
  status: 'Available',
  week: 'this',
  totalPatients: 0,
  roomNumber: '',
  notes: ''
};

export const ManageSessionsPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [doctorsList, setDoctorsList] = useState<DoctorOption[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    total: 0,
    available: 0,
    booked: 0,
    completed: 0,
    cancelled: 0,
    totalPatientsCapacity: 0
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const pageSize = 15;

  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [currentEditSessionId, setCurrentEditSessionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SessionFormData>({ ...emptyFormData });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation
  const [sessionToDelete, setSessionToDelete] = useState<SessionItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── HELPER: Derive Day of Week ───
  const computeDayFromDate = (dateStr: string): string => {
    if (!dateStr) return 'MON';
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'MON';
    return days[d.getDay()];
  };

  // ─── HELPER: Auto-calculate Relative Week ───
  const computeWeekFromDate = (dateStr: string): string => {
    if (!dateStr) return 'this';
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return 'this';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() + distanceToMonday);

    const currentWeekSunday = new Date(currentWeekMonday);
    currentWeekSunday.setDate(currentWeekMonday.getDate() + 6);
    currentWeekSunday.setHours(23, 59, 59, 999);

    if (target < currentWeekMonday) return 'last';
    if (target >= currentWeekMonday && target <= currentWeekSunday) return 'this';
    return 'next';
  };

  // ─── FETCH DOCTORS LIST ───
  const fetchDoctors = async () => {
    try {
      const res = await apiFetch<any>('/doctors');
      if (res && res.data) {
        const docs: DoctorOption[] = res.data.map((d: any) => ({
          id: d.id !== undefined ? d.id : d._id,
          _id: d._id,
          name: d.name || d.userId?.name || 'Dr. Medical Officer',
          specialty: d.specialty || d.specialization || 'General',
          photo: d.photo || d.userId?.profileImage || ''
        }));
        setDoctorsList(docs);
      }
    } catch (err) {
      console.warn('Could not load doctors list for sessions:', err);
    }
  };

  // ─── FETCH STATS ───
  const fetchStats = async () => {
    try {
      const res = await apiFetch<{ success: boolean; data: SessionStats }>('/sessions/stats');
      if (res && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Could not load session stats:', err);
    }
  };

  // ─── FETCH SESSIONS (Sorted by Session ID Descending) ───
  const fetchSessions = async (page = 1) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        sortBy: 'id',
        sortOrder: 'desc'
      });

      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (hospitalFilter !== 'all') params.append('hospital', hospitalFilter);
      if (dayFilter !== 'all') params.append('day', dayFilter);

      const res = await apiFetch<{
        success: boolean;
        data: SessionItem[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/sessions?${params.toString()}`);

      if (res && res.data) {
        setSessions(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || res.data.length);
          setCurrentPage(res.pagination.page || 1);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch sessions:', err);
      setErrorMessage(err.message || 'Failed to load sessions from server.');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchStats();
    apiFetch<any>('/doctors/approval-stats')
      .then((res) => {
        if (res?.data?.pending !== undefined) {
          setPendingApprovals(res.data.pending);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, hospitalFilter, dayFilter]);

  // ─── OPEN CREATE MODAL ───
  const handleOpenCreateModal = async () => {
    setIsEditMode(false);
    setCurrentEditSessionId(null);
    setFormErrors({});

    let nextId = 120;
    try {
      const idRes = await apiFetch<{ success: boolean; nextId: number }>('/sessions/next-id');
      if (idRes && idRes.nextId) {
        nextId = idRes.nextId;
      }
    } catch {
      // Fallback
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const initialDay = computeDayFromDate(todayStr);
    const initialWeek = computeWeekFromDate(todayStr);

    setFormData({
      ...emptyFormData,
      id: String(nextId),
      date: todayStr,
      day: initialDay,
      week: initialWeek,
      doctorId: doctorsList.length > 0 ? String(doctorsList[0].id) : ''
    });
    setIsModalOpen(true);
  };

  // ─── OPEN EDIT MODAL ───
  const handleOpenEditModal = (session: SessionItem) => {
    setIsEditMode(true);
    setCurrentEditSessionId(session._id || String(session.id));
    setFormErrors({});

    const isCustomHospital = !POPULAR_HOSPITALS.includes(session.hospital);

    setFormData({
      id: String(session.id || ''),
      doctorId: session.doctorId !== undefined ? String(session.doctorId) : '',
      hospital: isCustomHospital ? 'Other' : session.hospital,
      customHospital: isCustomHospital ? session.hospital : '',
      location: session.location || 'Colombo',
      date: session.date || new Date().toISOString().split('T')[0],
      day: session.day || computeDayFromDate(session.date),
      time: session.time || '05:00 PM - 07:00 PM',
      status: session.status || 'Available',
      week: session.week || computeWeekFromDate(session.date),
      totalPatients: session.totalPatients || 0,
      roomNumber: session.roomNumber || '',
      notes: session.notes || ''
    });

    setIsModalOpen(true);
  };

  // ─── FORM VALIDATION & SUBMISSION ───
  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-compute day and week when date changes
      if (field === 'date') {
        updated.day = computeDayFromDate(value);
        updated.week = computeWeekFromDate(value);
      }
      return updated;
    });

    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const errors: Record<string, string> = {};
    const effectiveHospital =
      formData.hospital === 'Other' ? formData.customHospital.trim() : formData.hospital.trim();

    if (!effectiveHospital) {
      errors.hospital = 'Please enter or select a hospital name.';
    }
    if (!formData.date) {
      errors.date = 'Please select a session date.';
    }
    if (!formData.time || !formData.time.trim()) {
      errors.time = 'Please enter or select a session time range.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);

    const payload = {
      id: formData.id ? Number(formData.id) : undefined,
      doctorId: formData.doctorId ? formData.doctorId : null,
      hospital: effectiveHospital,
      location: formData.location.trim() || 'Colombo',
      date: formData.date,
      day: formData.day,
      time: formData.time.trim(),
      status: formData.status,
      week: formData.week || 'this',
      totalPatients: Number(formData.totalPatients) || 0,
      roomNumber: formData.roomNumber.trim() || undefined,
      notes: formData.notes.trim() || undefined
    };

    try {
      if (isEditMode && currentEditSessionId) {
        await apiFetch(`/sessions/${currentEditSessionId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast(`Session #${formData.id || ''} updated successfully.`, 'success');
      } else {
        await apiFetch('/sessions', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast(`Session #${formData.id || ''} created successfully!`, 'success');
      }

      setIsModalOpen(false);
      fetchSessions(currentPage);
      fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to save session.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── QUICK STATUS UPDATE ───
  const handleQuickStatusChange = async (session: SessionItem, newStatus: string) => {
    try {
      await apiFetch(`/sessions/${session._id || session.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      setSessions((prev) =>
        prev.map((s) => (s._id === session._id ? { ...s, status: newStatus as any } : s))
      );
      showToast(`Session #${session.id} status changed to ${newStatus}.`, 'info');
      fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to update session status.', 'error');
    }
  };

  // ─── DELETE SESSION ───
  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await apiFetch(`/sessions/${sessionToDelete._id || sessionToDelete.id}`, {
        method: 'DELETE'
      });
      showToast(`Session #${sessionToDelete.id} deleted successfully.`, 'info');
      setIsDeleteModalOpen(false);
      setSessionToDelete(null);
      fetchSessions(currentPage);
      fetchStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete session.', 'error');
    }
  };

  // ─── EXPORT CSV ───
  const handleExportCSV = () => {
    if (sessions.length === 0) {
      showToast('No sessions available to export.', 'info');
      return;
    }

    const headers = ['Session ID', 'Hospital', 'Location', 'Date', 'Day', 'Time', 'Doctor', 'Patients', 'Status'];
    const rows = sessions.map((s) => [
      s.id,
      `"${s.hospital || ''}"`,
      `"${s.location || ''}"`,
      s.date,
      s.day || '',
      `"${s.time}"`,
      `"${s.doctor?.name || 'Unassigned'}"`,
      s.totalPatients || 0,
      s.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `medilink-sessions-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported sessions list to CSV.', 'success');
  };

  const handleLogout = () => {
    clearAuthToken();
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/login');
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="manage-sessions-container">
      {/* ─── UNIVERSAL ADMIN SIDEBAR ─── */}
      <AdminSidebar activeRoute="/manage-sessions" />

      {/* ─── MAIN CONTENT ─── */}
      <main className="sessions-main-content">
        {/* Header */}
        <header className="sessions-header">
          <div className="sessions-header-left">
            <h1>Session Management & Schedules</h1>
            <p>Create, organize, and monitor hospital medical sessions and patient booking quotas &bull; {currentDate}</p>
          </div>
          <div className="sessions-header-right">
            <button className="btn-header-secondary" onClick={handleExportCSV}>
              <Download size={16} />
              Export CSV
            </button>
            <button className="btn-header-secondary" onClick={() => { fetchSessions(currentPage); fetchStats(); }}>
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button className="btn-create-session" onClick={handleOpenCreateModal}>
              <Plus size={18} />
              + Create Session
            </button>
          </div>
        </header>

        {/* Stats Section */}
        <section className="sessions-stats-grid">
          <div className="session-stat-card">
            <div className="session-stat-icon-wrap" style={{ background: '#eff6ff', color: '#0c5bd5' }}>
              <Calendar size={22} />
            </div>
            <div className="session-stat-info">
              <h4>Total Sessions</h4>
              <div className="session-stat-number">{stats.total}</div>
            </div>
          </div>

          <div className="session-stat-card">
            <div className="session-stat-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
              <CheckCircle2 size={22} />
            </div>
            <div className="session-stat-info">
              <h4>
                Available
                <span className="session-stat-badge" style={{ background: '#d1fae5', color: '#047857' }}>
                  {stats.total > 0 ? `${Math.round((stats.available / stats.total) * 100)}%` : '0%'}
                </span>
              </h4>
              <div className="session-stat-number" style={{ color: '#059669' }}>{stats.available}</div>
            </div>
          </div>

          <div className="session-stat-card">
            <div className="session-stat-icon-wrap" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <Clock size={22} />
            </div>
            <div className="session-stat-info">
              <h4>Booked Slots</h4>
              <div className="session-stat-number" style={{ color: '#4f46e5' }}>{stats.booked}</div>
            </div>
          </div>

          <div className="session-stat-card">
            <div className="session-stat-icon-wrap" style={{ background: '#f8fafc', color: '#64748b' }}>
              <CalendarCheck size={22} />
            </div>
            <div className="session-stat-info">
              <h4>Completed</h4>
              <div className="session-stat-number" style={{ color: '#64748b' }}>{stats.completed}</div>
            </div>
          </div>
        </section>

        {/* Toolbar & Filters */}
        <div className="sessions-toolbar">
          <div className="toolbar-left">
            <div className="session-search-box">
              <Search size={16} className="session-search-icon" />
              <input
                type="text"
                placeholder="Search by ID, hospital, location, or time..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="toolbar-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Available">🟢 Available</option>
              <option value="Booked">🔵 Booked</option>
              <option value="Completed">⚪ Completed</option>
              <option value="Cancelled">🔴 Cancelled</option>
            </select>

            <select
              className="toolbar-select"
              value={hospitalFilter}
              onChange={(e) => setHospitalFilter(e.target.value)}
            >
              <option value="all">All Hospitals</option>
              {POPULAR_HOSPITALS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <select
              className="toolbar-select"
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
            >
              <option value="all">All Days</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="toolbar-right">
            <div className="view-toggle-btns">
              <button
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <TableIcon size={16} />
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Card Grid View"
              >
                <GridIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 18px', color: '#991b1b', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
            <button className="btn-header-secondary" onClick={() => fetchSessions(1)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Retry
            </button>
          </div>
        )}

        {/* Main Content Render: Loading, Empty, Table or Grid */}
        {isLoading ? (
          <div className="sessions-spinner" />
        ) : sessions.length === 0 ? (
          <div className="sessions-table-wrapper">
            <div className="sessions-empty-state">
              <div className="sessions-empty-icon">
                <Calendar size={32} />
              </div>
              <h3 style={{ color: '#0f172a', margin: '0 0 6px 0', fontWeight: 700 }}>No Sessions Found</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem' }}>
                {searchQuery || statusFilter !== 'all' || hospitalFilter !== 'all' || dayFilter !== 'all'
                  ? 'Try clearing your search query or filters to find more sessions.'
                  : 'Start by creating the first medical session for your hospital network.'}
              </p>
              <button className="btn-create-session" onClick={handleOpenCreateModal} style={{ margin: '0 auto' }}>
                <Plus size={16} />
                Create First Session
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="sessions-table-wrapper">
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Date & Day</th>
                  <th>Time Slot</th>
                  <th>Hospital & Location</th>
                  <th>Assigned Doctor</th>
                  <th>Patients</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s._id || s.id}>
                    <td>
                      <span className="session-id-badge">#{s.id}</span>
                    </td>
                    <td>
                      <div className="session-date-cell">
                        <span style={{ fontWeight: 600 }}>{s.date}</span>
                        {s.day && <span className="session-day-tag">{s.day}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="session-time-cell">
                        <Clock size={14} color="#0c5bd5" />
                        <span>{s.time}</span>
                      </div>
                    </td>
                    <td>
                      <div className="session-hospital-cell">
                        <strong>{s.hospital}</strong>
                        <span className="session-location-tag">
                          <MapPin size={12} />
                          {s.location || 'Colombo'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {s.doctor ? (
                        <div className="session-doctor-cell">
                          <div className="session-doctor-avatar">
                            {s.doctor.photo ? (
                              <img src={s.doctor.photo} alt={s.doctor.name} />
                            ) : (
                              s.doctor.name.replace('Dr.', '').trim().charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="session-doctor-name">{s.doctor.name}</span>
                            <span className="session-doctor-spec">{s.doctor.specialty}</span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>General Doctor Pool</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                        <Users size={12} color="#64748b" />
                        <span>{s.totalPatients || 0}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${s.status ? s.status.toLowerCase() : 'available'}`}>
                        <span className="status-dot" />
                        {s.status || 'Available'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-cell" style={{ justifyContent: 'flex-end' }}>
                        <select
                          className="inline-status-select"
                          value={s.status}
                          onChange={(e) => handleQuickStatusChange(s, e.target.value)}
                          title="Quick update status"
                        >
                          <option value="Available">Available</option>
                          <option value="Booked">Booked</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>

                        <button
                          className="btn-action-icon"
                          onClick={() => handleOpenEditModal(s)}
                          title="Edit Session"
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          className="btn-action-icon delete"
                          onClick={() => {
                            setSessionToDelete(s);
                            setIsDeleteModalOpen(true);
                          }}
                          title="Delete Session"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="sessions-pagination">
              <div>
                Showing <strong>{sessions.length}</strong> of <strong>{totalCount}</strong> sessions
              </div>
              <div className="pagination-controls">
                <button
                  className="btn-page"
                  disabled={currentPage <= 1}
                  onClick={() => fetchSessions(currentPage - 1)}
                >
                  &larr; Previous
                </button>
                <span style={{ padding: '6px 12px', fontWeight: 600 }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn-page"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchSessions(currentPage + 1)}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Card Grid View */
          <div>
            <div className="sessions-card-grid">
              {sessions.map((s) => (
                <div key={s._id || s.id} className="session-card-item">
                  <div className="session-card-header">
                    <span className="session-id-badge">#{s.id}</span>
                    <span className={`status-pill ${s.status ? s.status.toLowerCase() : 'available'}`}>
                      <span className="status-dot" />
                      {s.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="session-card-hospital">{s.hospital}</h3>
                    <div className="session-location-tag">
                      <MapPin size={13} />
                      {s.location || 'Colombo'}
                    </div>
                  </div>

                  <div className="session-card-details-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Calendar size={14} color="#0c5bd5" />
                      <span>{s.date}</span>
                      {s.day && <span className="session-day-tag">{s.day}</span>}
                    </div>
                  </div>

                  <div className="session-card-details-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Clock size={14} color="#0c5bd5" />
                      <span>{s.time}</span>
                    </div>
                  </div>

                  {s.doctor ? (
                    <div className="session-doctor-cell" style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                      <div className="session-doctor-avatar">
                        {s.doctor.photo ? (
                          <img src={s.doctor.photo} alt={s.doctor.name} />
                        ) : (
                          s.doctor.name.replace('Dr.', '').trim().charAt(0)
                        )}
                      </div>
                      <div>
                        <span className="session-doctor-name">{s.doctor.name}</span>
                        <span className="session-doctor-spec">{s.doctor.specialty}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      General Doctor Pool
                    </div>
                  )}

                  <div className="session-card-footer">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                      <Users size={14} color="#64748b" />
                      <span>{s.totalPatients || 0} Patients</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-action-icon" onClick={() => handleOpenEditModal(s)}>
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn-action-icon delete"
                        onClick={() => {
                          setSessionToDelete(s);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="sessions-pagination" style={{ marginTop: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div>
                Showing <strong>{sessions.length}</strong> of <strong>{totalCount}</strong> sessions
              </div>
              <div className="pagination-controls">
                <button
                  className="btn-page"
                  disabled={currentPage <= 1}
                  onClick={() => fetchSessions(currentPage - 1)}
                >
                  &larr; Previous
                </button>
                <span style={{ padding: '6px 12px', fontWeight: 600 }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn-page"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchSessions(currentPage + 1)}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── CREATE / EDIT SESSION MODAL ─── */}
      {isModalOpen && (
        <div className="session-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="session-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="session-modal-header">
              <h2>
                <CalendarCheck size={22} color="#0c5bd5" />
                {isEditMode ? `Edit Session #${formData.id}` : 'Create New Medical Session'}
              </h2>
              <button className="btn-modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="session-modal-body">
              <div className="session-form-grid">
                {/* Session ID */}
                <div className="form-group">
                  <label htmlFor="sess-id">Session ID (Numeric)</label>
                  <input
                    id="sess-id"
                    type="number"
                    value={formData.id}
                    onChange={(e) => handleFormChange('id', e.target.value)}
                    placeholder="e.g. 120"
                  />
                </div>

                {/* Assigned Doctor */}
                <div className="form-group">
                  <label htmlFor="sess-doc">Assigned Doctor</label>
                  <select
                    id="sess-doc"
                    value={formData.doctorId}
                    onChange={(e) => handleFormChange('doctorId', e.target.value)}
                  >
                    <option value="">-- General Pool (Unassigned) --</option>
                    {doctorsList.map((doc) => (
                      <option key={String(doc.id)} value={String(doc.id)}>
                        {doc.name} ({doc.specialty})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hospital Selection */}
                <div className={`form-group ${formErrors.hospital ? 'has-error' : ''}`}>
                  <label htmlFor="sess-hospital">Hospital / Medical Center *</label>
                  <select
                    id="sess-hospital"
                    value={formData.hospital}
                    onChange={(e) => handleFormChange('hospital', e.target.value)}
                  >
                    {POPULAR_HOSPITALS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                    <option value="Other">Other (Specify Custom Name)</option>
                  </select>
                  {formErrors.hospital && <span className="form-error-text">{formErrors.hospital}</span>}
                </div>

                {/* Custom Hospital Input if Other */}
                {formData.hospital === 'Other' && (
                  <div className="form-group">
                    <label htmlFor="sess-custom-hospital">Custom Hospital Name *</label>
                    <input
                      id="sess-custom-hospital"
                      type="text"
                      placeholder="e.g. Asiri Central Hospital"
                      value={formData.customHospital}
                      onChange={(e) => handleFormChange('customHospital', e.target.value)}
                    />
                  </div>
                )}

                {/* Location */}
                <div className="form-group">
                  <label htmlFor="sess-location">Location / Area</label>
                  <input
                    id="sess-location"
                    type="text"
                    placeholder="e.g. Colombo 2, Colombo 5, Kandy"
                    value={formData.location}
                    onChange={(e) => handleFormChange('location', e.target.value)}
                  />
                </div>

                {/* Date (Past dates blocked) */}
                <div className={`form-group ${formErrors.date ? 'has-error' : ''}`}>
                  <label htmlFor="sess-date">Session Date *</label>
                  <input
                    id="sess-date"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                  />
                  {formErrors.date && <span className="form-error-text">{formErrors.date}</span>}
                </div>

                {/* Day of Week (Auto-computed) */}
                <div className="form-group">
                  <label htmlFor="sess-day">
                    Day of Week
                    <span style={{ fontSize: '0.72rem', color: '#0c5bd5', fontWeight: 600, marginLeft: '4px' }}>
                      (Auto)
                    </span>
                  </label>
                  <select
                    id="sess-day"
                    value={formData.day}
                    onChange={(e) => handleFormChange('day', e.target.value)}
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Time Slot Range */}
                <div className={`form-group form-group-full ${formErrors.time ? 'has-error' : ''}`}>
                  <label htmlFor="sess-time">Time Slot Range *</label>
                  <input
                    id="sess-time"
                    type="text"
                    placeholder="e.g. 05:00 PM - 07:00 PM"
                    value={formData.time}
                    onChange={(e) => handleFormChange('time', e.target.value)}
                  />
                  {formErrors.time && <span className="form-error-text">{formErrors.time}</span>}

                  {/* Time Presets */}
                  <div className="time-presets-row">
                    <span style={{ fontSize: '0.78rem', color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>Quick Presets:</span>
                    {TIME_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="btn-time-preset"
                        onClick={() => handleFormChange('time', preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="form-group">
                  <label htmlFor="sess-status">Session Status</label>
                  <select
                    id="sess-status"
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value as any)}
                  >
                    <option value="Available">Available</option>
                    <option value="Booked">Booked</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Patient Capacity / Limit */}
                <div className="form-group">
                  <label htmlFor="sess-capacity">Total Patients / Capacity</label>
                  <input
                    id="sess-capacity"
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    value={formData.totalPatients}
                    onChange={(e) => handleFormChange('totalPatients', e.target.value)}
                  />
                </div>

                {/* Consultation Room (Optional) */}
                <div className="form-group form-group-full">
                  <label htmlFor="sess-room">Consultation Room (Optional)</label>
                  <input
                    id="sess-room"
                    type="text"
                    placeholder="e.g. Room 204 / OPD 3"
                    value={formData.roomNumber}
                    onChange={(e) => handleFormChange('roomNumber', e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div className="form-group form-group-full">
                  <label htmlFor="sess-notes">Additional Notes / Instructions</label>
                  <textarea
                    id="sess-notes"
                    rows={2}
                    placeholder="Any special instructions for doctors or receptionists..."
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                  />
                </div>
              </div>

              <div className="session-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving Session...
                    </>
                  ) : isEditMode ? (
                    'Save Changes'
                  ) : (
                    '+ Create Session'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      {isDeleteModalOpen && sessionToDelete && (
        <div className="session-modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="session-modal-container" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="session-modal-header" style={{ background: '#fef2f2' }}>
              <h2 style={{ color: '#991b1b' }}>
                <AlertCircle size={22} color="#dc2626" />
                Delete Session #{sessionToDelete.id}
              </h2>
              <button className="btn-modal-close" onClick={() => setIsDeleteModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="session-modal-body">
              <p style={{ color: '#475569', fontSize: '0.95rem', margin: '0 0 12px 0' }}>
                Are you sure you want to delete session <strong>#{sessionToDelete.id}</strong> at <strong>{sessionToDelete.hospital}</strong> ({sessionToDelete.date} {sessionToDelete.time})?
              </p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', color: '#b91c1c' }}>
                ⚠️ This action cannot be undone and will permanently remove this session slot from the database.
              </div>
            </div>

            <div className="session-modal-footer">
              <button className="btn-modal-cancel" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-modal-submit"
                style={{ background: '#dc2626' }}
                onClick={handleConfirmDelete}
              >
                Yes, Delete Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST NOTIFICATION ─── */}
      {toast && (
        <div className={`session-toast ${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={18} />}
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.type === 'info' && <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default ManageSessionsPage;
