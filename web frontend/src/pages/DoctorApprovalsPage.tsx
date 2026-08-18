import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  UserCheck,
  Award,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  Phone,
  Mail,
  MapPin,
  Grid,
  List,
  CheckSquare,
  Square,
  AlertTriangle,
  DollarSign,
  CalendarCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import DoctorLicenseCard, { type DoctorLicenseInfo } from '../components/DoctorLicenseCard';
import './DoctorApprovalsPage.css';

interface DoctorData extends DoctorLicenseInfo {
  id: string;
  status: 'active' | 'on-leave' | 'inactive';
  rating?: number;
  totalPatients?: number;
  bio?: string;
  consultationFee?: number;
  languages?: string[];
  availableSlots?: string[];
  createdAt?: string;
  rejectionReason?: string;
  verificationNotes?: string;
}

interface ApprovalStats {
  total: number;
  pending: number;
  verified: number;
  active: number;
  onLeave: number;
  inactive: number;
}

const SPECIALTIES = [
  'All Specialties',
  'General',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Dermatology',
  'Oncology',
  'Urology',
  'Counselor',
  'Consultant Psychiatrist',
  'Clinical Psychologist'
];

export const DoctorApprovalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorData[]>([]);
  const [stats, setStats] = useState<ApprovalStats>({
    total: 0,
    pending: 0,
    verified: 0,
    active: 0,
    onLeave: 0,
    inactive: 0
  });

  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected doctor for verification modal
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Checklist state for modal review
  const [checklist, setChecklist] = useState({
    licenseChecked: true,
    nicChecked: true,
    qualificationsChecked: true,
    experienceChecked: true
  });

  // ─── FETCH DOCTORS & STATS ───
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [doctorsRes, statsRes] = await Promise.all([
        apiFetch<{ success: boolean; data: any[] }>('/doctors?limit=100'),
        apiFetch<{ success: boolean; data: ApprovalStats }>('/doctors/approval-stats').catch(() => null)
      ]);

      const loadedDoctors: DoctorData[] = (doctorsRes.data || []).map((doc: any) => {
        const name = doc.name || doc.userId?.name || 'Unknown Doctor';
        return {
          id: doc._id || doc.id,
          name,
          licenseNumber: doc.licenseNumber || `SLMC-${Date.now().toString().slice(-6)}`,
          specialty: doc.specialty || doc.specialization || 'Medical Practitioner',
          specialization: doc.specialization || doc.specialty || 'Medical Practitioner',
          nic: doc.nic || '',
          email: doc.email || doc.userId?.email || '',
          phone: doc.phone || doc.userId?.phone || '',
          address: doc.address || doc.userId?.address || '',
          qualifications: doc.qualifications || ['MBBS'],
          experience: doc.experience ?? doc.yearsOfExperience ?? 0,
          yearsOfExperience: doc.yearsOfExperience ?? doc.experience ?? 0,
          photo: doc.photo || doc.userId?.profileImage || undefined,
          avatar: doc.photo || doc.userId?.profileImage || undefined,
          isVerified: doc.isVerified === true,
          verifiedAt: doc.verifiedAt,
          licenseDocument: doc.licenseDocument,
          status: doc.status || 'active',
          rating: doc.rating || 0,
          totalPatients: doc.totalPatients || 0,
          bio: doc.bio || '',
          consultationFee: doc.consultationFee || 0,
          languages: doc.languages || ['English', 'Sinhala'],
          availableSlots: doc.availableSlots || [],
          createdAt: doc.createdAt,
          rejectionReason: doc.rejectionReason,
          verificationNotes: doc.verificationNotes
        };
      });

      setDoctors(loadedDoctors);

      if (statsRes?.data) {
        setStats(statsRes.data);
      } else {
        // Fallback stats computation
        const pending = loadedDoctors.filter(d => !d.isVerified).length;
        const verified = loadedDoctors.filter(d => d.isVerified).length;
        setStats({
          total: loadedDoctors.length,
          pending,
          verified,
          active: loadedDoctors.filter(d => d.status === 'active').length,
          onLeave: loadedDoctors.filter(d => d.status === 'on-leave').length,
          inactive: loadedDoctors.filter(d => d.status === 'inactive').length
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch doctor approval records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── FILTER DOCTORS ───
  const filteredDoctors = doctors.filter((doc) => {
    // Tab filter
    if (activeTab === 'pending' && doc.isVerified) return false;
    if (activeTab === 'verified' && !doc.isVerified) return false;

    // Specialty filter
    if (selectedSpecialty !== 'All Specialties' && doc.specialty !== selectedSpecialty) {
      return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchLicense = doc.licenseNumber.toLowerCase().includes(q);
      const matchNic = (doc.nic || '').toLowerCase().includes(q);
      const matchEmail = doc.email?.toLowerCase().includes(q);
      const matchSpecialty = doc.specialty?.toLowerCase().includes(q);
      return matchName || matchLicense || matchNic || matchEmail || matchSpecialty;
    }

    return true;
  });

  // ─── OPEN VERIFICATION MODAL ───
  const handleOpenModal = (doctor: DoctorData) => {
    setSelectedDoctor(doctor);
    setVerificationNotes(doctor.verificationNotes || '');
    setRejectionReason(doctor.rejectionReason || '');
    setChecklist({
      licenseChecked: true,
      nicChecked: true,
      qualificationsChecked: true,
      experienceChecked: true
    });
    setActionSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDoctor(null);
    setVerificationNotes('');
    setRejectionReason('');
    setActionSuccessMsg(null);
  };

  // ─── EXECUTE APPROVAL / REJECTION ───
  const handleVerifyDoctor = async (doctorId: string, approve: boolean) => {
    setIsProcessing(true);
    try {
      await apiFetch(`/doctors/${doctorId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({
          isVerified: approve,
          verificationNotes,
          rejectionReason: !approve ? (rejectionReason || 'Application details did not meet regulatory standards.') : undefined,
          status: approve ? 'active' : 'inactive'
        })
      });

      setActionSuccessMsg(approve ? 'Doctor successfully verified and approved!' : 'Doctor verification application rejected.');
      
      // Refresh local lists
      await fetchData();

      setTimeout(() => {
        handleCloseModal();
      }, 1200);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickApprove = async (e: React.MouseEvent, doctor: DoctorData) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to approve Dr. ${doctor.name} (License: ${doctor.licenseNumber})?`)) {
      return;
    }
    try {
      await apiFetch(`/doctors/${doctor.id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({
          isVerified: true,
          status: 'active',
          verificationNotes: 'Quick approved by Administrator'
        })
      });
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Quick approval failed');
    }
  };

  const toggleChecklistItem = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="approvals-page-container">
      {/* ─── SIDEBAR ─── */}
      <AdminSidebar activeRoute="/doctor-approvals" />

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header">
          <div className="header-left">
            <div className="title-row">
              <h1 className="page-title">Doctor Approvals & License Verification</h1>
              {stats.pending > 0 && (
                <span className="pending-alert-tag">
                  <AlertCircle size={14} /> {stats.pending} Awaiting Review
                </span>
              )}
            </div>
            <p className="header-subtitle">
              {currentDate} • Verify Sri Lanka Medical Council (SLMC) practitioner credentials, validate licenses, and grant doctor approvals.
            </p>
          </div>

          <div className="header-actions">
            <button className="refresh-btn" onClick={fetchData} title="Refresh records">
              <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* ─── STATS METRIC CARDS ─── */}
        <section className="stats-row">
          <div className="approval-stat-card pending-card">
            <div className="stat-card-icon pending-icon-bg">
              <ShieldAlert size={24} color="#d97706" />
            </div>
            <div className="stat-card-data">
              <span className="stat-card-val">{stats.pending}</span>
              <span className="stat-card-lbl">Pending Approvals</span>
              <span className="stat-card-sub">Requires admin license check</span>
            </div>
          </div>

          <div className="approval-stat-card verified-card">
            <div className="stat-card-icon verified-icon-bg">
              <ShieldCheck size={24} color="#16a34a" />
            </div>
            <div className="stat-card-data">
              <span className="stat-card-val">{stats.verified}</span>
              <span className="stat-card-lbl">Verified Practitioners</span>
              <span className="stat-card-sub">SLMC credentials active</span>
            </div>
          </div>

          <div className="approval-stat-card total-card">
            <div className="stat-card-icon total-icon-bg">
              <Award size={24} color="#2563eb" />
            </div>
            <div className="stat-card-data">
              <span className="stat-card-val">{stats.total}</span>
              <span className="stat-card-lbl">Total Doctor Records</span>
              <span className="stat-card-sub">{stats.active} Active in system</span>
            </div>
          </div>

          <div className="approval-stat-card rate-card">
            <div className="stat-card-icon rate-icon-bg">
              <UserCheck size={24} color="#9333ea" />
            </div>
            <div className="stat-card-data">
              <span className="stat-card-val">
                {stats.total > 0 ? `${Math.round((stats.verified / stats.total) * 100)}%` : '100%'}
              </span>
              <span className="stat-card-lbl">Verification Rate</span>
              <span className="stat-card-sub">Compliance score</span>
            </div>
          </div>
        </section>

        {/* ─── TABS & CONTROLS ─── */}
        <section className="controls-section">
          <div className="tabs-container">
            <button
              className={`tab-item ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <ShieldAlert size={16} />
              <span>Pending Review</span>
              {stats.pending > 0 && (
                <span className="tab-counter-badge">{stats.pending}</span>
              )}
            </button>
            <button
              className={`tab-item ${activeTab === 'verified' ? 'active' : ''}`}
              onClick={() => setActiveTab('verified')}
            >
              <ShieldCheck size={16} />
              <span>Verified Doctors</span>
              <span className="tab-counter-badge gray">{stats.verified}</span>
            </button>
            <button
              className={`tab-item ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <FileSpreadsheet size={16} />
              <span>All Records</span>
              <span className="tab-counter-badge gray">{stats.total}</span>
            </button>
          </div>

          <div className="filters-and-views">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search name, SLMC license, NIC, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>
              )}
            </div>

            <div className="select-wrapper">
              <Filter size={14} className="filter-icon" />
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="specialty-dropdown"
              >
                {SPECIALTIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="layout-toggle">
              <button
                className={`layout-btn ${viewLayout === 'grid' ? 'active' : ''}`}
                onClick={() => setViewLayout('grid')}
                title="Grid Cards View"
              >
                <Grid size={16} />
              </button>
              <button
                className={`layout-btn ${viewLayout === 'table' ? 'active' : ''}`}
                onClick={() => setViewLayout('table')}
                title="Data Table View"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* ─── ERROR STATE ─── */}
        {error && (
          <div className="error-alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button onClick={fetchData} className="retry-btn">Retry</button>
          </div>
        )}

        {/* ─── LOADING STATE ─── */}
        {isLoading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading doctor verification records...</p>
          </div>
        )}

        {/* ─── MAIN LIST VIEW ─── */}
        {!isLoading && !error && (
          <>
            {filteredDoctors.length === 0 ? (
              <div className="empty-state-box">
                <div className="empty-icon">🎉</div>
                <h3>No doctors match your criteria</h3>
                <p>
                  {activeTab === 'pending'
                    ? 'All registered doctors have been verified! No pending applications awaiting review.'
                    : 'Try clearing your search or adjusting the specialty filter.'}
                </p>
                {activeTab === 'pending' && (
                  <button className="view-verified-btn" onClick={() => setActiveTab('verified')}>
                    View Verified Doctors
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 1. GRID CARDS VIEW */}
                {viewLayout === 'grid' && (
                  <div className="doctor-approval-grid">
                    {filteredDoctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        className={`doctor-review-card ${doctor.isVerified ? 'verified' : 'pending'}`}
                      >
                        <div className="card-doctor-header">
                          <div className="doc-avatar-wrap">
                            {doctor.photo || doctor.avatar ? (
                              <img src={doctor.photo || doctor.avatar} alt={doctor.name} className="doc-avatar-img" />
                            ) : (
                              <div className="doc-avatar-fallback">
                                {doctor.name.replace(/^(Dr\.\s*)/i, '').substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className={`online-status-dot ${doctor.status}`} />
                          </div>

                          <div className="doc-header-text">
                            <h3 className="doc-name">{doctor.name}</h3>
                            <span className="doc-spec-badge">{doctor.specialty}</span>
                          </div>

                          <div className={`verification-badge-pill ${doctor.isVerified ? 'verified' : 'pending'}`}>
                            {doctor.isVerified ? <CheckCircle size={14} /> : <Clock size={14} />}
                            <span>{doctor.isVerified ? 'Verified' : 'Pending'}</span>
                          </div>
                        </div>

                        {/* Embedded SLMC License Badge */}
                        <div className="license-component-wrapper">
                          <DoctorLicenseCard
                            doctor={doctor}
                            compact={true}
                            onViewDetails={() => handleOpenModal(doctor)}
                          />
                        </div>

                        {/* Doctor Quick Details */}
                        <div className="card-quick-meta">
                          <div className="quick-meta-item">
                            <Mail size={13} className="meta-icon" />
                            <span>{doctor.email || 'No email provided'}</span>
                          </div>
                          {doctor.phone && (
                            <div className="quick-meta-item">
                              <Phone size={13} className="meta-icon" />
                              <span>{doctor.phone}</span>
                            </div>
                          )}
                          {doctor.address && (
                            <div className="quick-meta-item">
                              <MapPin size={13} className="meta-icon" />
                              <span>{doctor.address}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Footer Actions */}
                        <div className="card-action-footer">
                          <button
                            className="btn-inspect-details"
                            onClick={() => handleOpenModal(doctor)}
                          >
                            <Eye size={15} />
                            <span>Review & Verify</span>
                          </button>

                          {!doctor.isVerified && (
                            <button
                              className="btn-quick-approve"
                              onClick={(e) => handleQuickApprove(e, doctor)}
                              title="Instantly Approve Doctor"
                            >
                              <CheckCircle size={15} />
                              <span>Approve</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. TABLE VIEW */}
                {viewLayout === 'table' && (
                  <div className="table-wrapper">
                    <table className="approvals-data-table">
                      <thead>
                        <tr>
                          <th>Doctor Profile</th>
                          <th>SLMC License No.</th>
                          <th>Specialization</th>
                          <th>NIC Number</th>
                          <th>Experience</th>
                          <th>Qualifications</th>
                          <th>Verification Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDoctors.map((doctor) => (
                          <tr key={doctor.id} className={doctor.isVerified ? '' : 'row-pending'}>
                            <td className="doc-cell">
                              <div className="table-doc-info">
                                <div className="table-avatar">
                                  {doctor.photo || doctor.avatar ? (
                                    <img src={doctor.photo || doctor.avatar} alt={doctor.name} />
                                  ) : (
                                    <span>{doctor.name.replace(/^(Dr\.\s*)/i, '').substring(0, 2).toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="table-doc-names">
                                  <strong>{doctor.name}</strong>
                                  <span className="table-email">{doctor.email}</span>
                                </div>
                              </div>
                            </td>

                            <td className="license-cell">
                              <span className="license-mono-code">{doctor.licenseNumber}</span>
                            </td>

                            <td>
                              <span className="spec-tag">{doctor.specialty}</span>
                            </td>

                            <td>{doctor.nic || '—'}</td>

                            <td>{doctor.yearsOfExperience || doctor.experience || 0} Years</td>

                            <td>
                              <div className="qual-cell-chips">
                                {(doctor.qualifications || []).slice(0, 2).map((q, idx) => (
                                  <span key={idx} className="small-chip">{q}</span>
                                ))}
                              </div>
                            </td>

                            <td>
                              <span className={`status-pill-table ${doctor.isVerified ? 'verified' : 'pending'}`}>
                                {doctor.isVerified ? 'Verified' : 'Pending Review'}
                              </span>
                            </td>

                            <td className="actions-table-cell">
                              <button
                                className="action-btn-inspect"
                                onClick={() => handleOpenModal(doctor)}
                              >
                                <Eye size={14} /> Review
                              </button>
                              {!doctor.isVerified && (
                                <button
                                  className="action-btn-approve"
                                  onClick={(e) => handleQuickApprove(e, doctor)}
                                >
                                  Approve
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ─── FULL "REVIEW & VERIFY" MODAL ─── */}
        {isModalOpen && selectedDoctor && (
          <div className="modal-backdrop" onClick={handleCloseModal}>
            <div className="modal-dialog-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-bar">
                <div className="modal-header-title">
                  <ShieldCheck size={22} color="#2563eb" />
                  <div>
                    <h2>Practitioner Credentials & License Verification</h2>
                    <p>Review full SLMC credentials and authorize clinical practice for Dr. {selectedDoctor.name}</p>
                  </div>
                </div>
                <button className="close-x-btn" onClick={handleCloseModal}>✕</button>
              </div>

              {actionSuccessMsg && (
                <div className="modal-success-banner">
                  <CheckCircle size={18} />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              <div className="modal-scrollable-body">
                {/* 1. License Card & Certificate Display */}
                <div className="modal-section-card">
                  <div className="section-title-strip">
                    <Award size={18} />
                    <h3>Medical Council License & Registration Record</h3>
                  </div>
                  <DoctorLicenseCard doctor={selectedDoctor} compact={false} />
                </div>

                {/* 2. Doctor Detailed Profile Overview */}
                <div className="modal-section-card">
                  <div className="section-title-strip">
                    <Stethoscope size={18} />
                    <h3>Doctor Profile & Clinical Information</h3>
                  </div>

                  <div className="profile-details-grid">
                    <div className="profile-field">
                      <span className="lbl">Full Name</span>
                      <span className="val">{selectedDoctor.name}</span>
                    </div>

                    <div className="profile-field">
                      <span className="lbl">Specialization</span>
                      <span className="val">{selectedDoctor.specialty}</span>
                    </div>

                    <div className="profile-field">
                      <span className="lbl">National Identity Card (NIC)</span>
                      <span className="val">{selectedDoctor.nic || 'Not Provided'}</span>
                    </div>

                    <div className="profile-field">
                      <span className="lbl">Registration / License</span>
                      <span className="val highlight">{selectedDoctor.licenseNumber}</span>
                    </div>

                    <div className="profile-field">
                      <span className="lbl">Clinical Experience</span>
                      <span className="val">{selectedDoctor.yearsOfExperience || selectedDoctor.experience || 0} Years</span>
                    </div>

                    <div className="profile-field">
                      <span className="lbl">Consultation Fee</span>
                      <span className="val">LKR {selectedDoctor.consultationFee?.toLocaleString() || '0'}</span>
                    </div>

                    <div className="profile-field">
                      <span className="lbl">Official Email</span>
                      <span className="val">{selectedDoctor.email || '—'}</span>
                    </div>

                    <div className="profile-field">
                      <span className="lbl">Contact Telephone</span>
                      <span className="val">{selectedDoctor.phone || '—'}</span>
                    </div>

                    <div className="profile-field full-width">
                      <span className="lbl">Clinic / Residential Address</span>
                      <span className="val">{selectedDoctor.address || '—'}</span>
                    </div>

                    {selectedDoctor.bio && (
                      <div className="profile-field full-width">
                        <span className="lbl">Professional Bio</span>
                        <p className="bio-paragraph">{selectedDoctor.bio}</p>
                      </div>
                    )}

                    {selectedDoctor.languages && selectedDoctor.languages.length > 0 && (
                      <div className="profile-field full-width">
                        <span className="lbl">Languages Spoken</span>
                        <div className="lang-chips-row">
                          {selectedDoctor.languages.map((l, i) => (
                            <span key={i} className="lang-chip">{l}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Verification Checklist & Notes */}
                <div className="modal-section-card">
                  <div className="section-title-strip">
                    <CheckSquare size={18} />
                    <h3>Administrator Verification Checklist</h3>
                  </div>

                  <div className="verification-checklist">
                    <label className="checklist-item" onClick={() => toggleChecklistItem('licenseChecked')}>
                      {checklist.licenseChecked ? (
                        <CheckSquare size={18} color="#16a34a" />
                      ) : (
                        <Square size={18} color="#94a3b8" />
                      )}
                      <span>Medical Council (SLMC) License Number format and practitioner validity verified</span>
                    </label>

                    <label className="checklist-item" onClick={() => toggleChecklistItem('nicChecked')}>
                      {checklist.nicChecked ? (
                        <CheckSquare size={18} color="#16a34a" />
                      ) : (
                        <Square size={18} color="#94a3b8" />
                      )}
                      <span>National Identity Card (NIC) authenticated against registry records</span>
                    </label>

                    <label className="checklist-item" onClick={() => toggleChecklistItem('qualificationsChecked')}>
                      {checklist.qualificationsChecked ? (
                        <CheckSquare size={18} color="#16a34a" />
                      ) : (
                        <Square size={18} color="#94a3b8" />
                      )}
                      <span>Recognized medical degree (MBBS/MD) and specialty credentials verified</span>
                    </label>

                    <label className="checklist-item" onClick={() => toggleChecklistItem('experienceChecked')}>
                      {checklist.experienceChecked ? (
                        <CheckSquare size={18} color="#16a34a" />
                      ) : (
                        <Square size={18} color="#94a3b8" />
                      )}
                      <span>Clinical experience & background clearance confirmed</span>
                    </label>
                  </div>

                  <div className="admin-notes-block">
                    <label htmlFor="notes">Administrator Verification Notes / Audit Trail:</label>
                    <textarea
                      id="notes"
                      rows={2}
                      placeholder="Add any verification observations, SLMC registry confirmation reference, etc..."
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="modal-footer-bar">
                <button className="btn-cancel" onClick={handleCloseModal} disabled={isProcessing}>
                  Cancel
                </button>

                <div className="footer-action-buttons">
                  {selectedDoctor.isVerified ? (
                    <button
                      className="btn-revoke"
                      onClick={() => handleVerifyDoctor(selectedDoctor.id, false)}
                      disabled={isProcessing}
                    >
                      <XCircle size={16} />
                      <span>{isProcessing ? 'Revoking...' : 'Revoke Verification'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn-reject"
                        onClick={() => handleVerifyDoctor(selectedDoctor.id, false)}
                        disabled={isProcessing}
                      >
                        <XCircle size={16} />
                        <span>{isProcessing ? 'Processing...' : 'Reject Application'}</span>
                      </button>

                      <button
                        className="btn-approve-primary"
                        onClick={() => handleVerifyDoctor(selectedDoctor.id, true)}
                        disabled={isProcessing}
                      >
                        <CheckCircle size={18} />
                        <span>{isProcessing ? 'Verifying...' : 'Approve & Verify Doctor'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorApprovalsPage;
