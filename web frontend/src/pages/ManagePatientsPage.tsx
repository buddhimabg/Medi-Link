import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Stethoscope, Users, FileText, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import './ManagePatientsPage.css';

interface Patient {
  id: string;
  initials: string;
  name: string;
  age: number | null;
  gender: 'Male' | 'Female' | 'Other';
  email: string;
  assignedDoctor: string;
  status: 'Active' | 'Inactive' | 'Suspended';
}

const ManagePatients: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [_isLoadingPatients, _setIsLoadingPatients] = useState(true);
  const [_patientError, _setPatientError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    inactivePatients: 0,
    newThisMonth: 0
  });

  const fetchPatients = async () => {
    _setIsLoadingPatients(true);
    try {
      const [patientsRes, statsRes] = await Promise.all([
        apiFetch<any>('/patients'),
        apiFetch<any>('/patients/statistics').catch(() => null)
      ]);

      if (patientsRes?.data) {
        const mappedPatients = patientsRes.data.map((p: any) => {
          const name = typeof p.name === 'string' ? p.name : (p.userId?.name || 'Unknown Patient');
          const initials = name
            .split(' ')
            .map((part: string) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
          const rawStatus = typeof p.status === 'string' ? p.status.toLowerCase() : 'active';
          const status = rawStatus === 'inactive' ? 'Inactive' : rawStatus === 'suspended' ? 'Suspended' : 'Active';

          let assignedDoctor = 'Dr. Not Assigned';
          const doc = p.primaryDoctorId || p.assignedDoctor || p.doctor;
          if (doc) {
            if (typeof doc === 'string') {
              assignedDoctor = doc;
            } else if (typeof doc === 'object') {
              assignedDoctor = doc.name || doc.userId?.name || doc.fullName || 'Dr. Assigned';
            }
          }

          return {
            id: p._id || p.id || String(Math.random()),
            initials,
            name,
            age: typeof p.age === 'number' ? p.age : (p.dateOfBirth ? Math.max(0, new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()) : null),
            gender: typeof p.gender === 'string' ? (p.gender.charAt(0).toUpperCase() + p.gender.slice(1).toLowerCase()) : 'Other',
            email: typeof p.email === 'string' ? p.email : (p.userId?.email || ''),
            assignedDoctor,
            status
          };
        });
        setPatients(mappedPatients);
      }

      if (statsRes?.data) {
        setStats(statsRes.data);
      }
      _setPatientError(null);
    } catch (err: any) {
      _setPatientError(err?.message || 'Failed to fetch patients');
    } finally {
      _setIsLoadingPatients(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '' || patient.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleViewPatient = (id: string) => {
    const patient = patients.find(p => p.id === id);
    if (patient) {
      setSelectedPatient(patient);
      setIsViewModalOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${patient.name}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await apiFetch(`/patients/${id}`, { method: 'DELETE' });
      await fetchPatients();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete patient');
    }
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedPatient(null);
  };

  return (
    <div className="manage-patients-container">

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
            <li className="nav-item nav-item-active" onClick={() => navigate('/manage-patients')}>
              <span className="nav-icon"><Users size={20} /></span>
              <span className="nav-label">Manage Patients</span>
              <span className="nav-arrow">›</span>
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

        <button className="logout-btn" onClick={() => navigate('/login')}>
          <span className="logout-icon"><LogOut size={20} /></span>
          <span className="logout-text">Log Out</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">Manage Patients</h1>
            <p className="header-date">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="stats-grid">
          <StatCard value={stats.totalPatients} label="Total Patients" bgColor="#E3F2FD" textColor="#1976D2" />
          <StatCard value={stats.activePatients} label="Active" bgColor="#E8F5E9" textColor="#388E3C" />
          <StatCard value={stats.inactivePatients} label="Inactive" bgColor="#E3F2FD" textColor="#1976D2" />
          <StatCard value={stats.newThisMonth} label="New This Month" bgColor="#FFEBEE" textColor="#D32F2F" />
        </div>

        {/* Search and Filter Bar */}
        <div className="search-filter-bar">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search Patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Patients Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr className="table-header">
                <th className="th">Patient</th>
                <th className="th">Age/Gender</th>
                <th className="th">Contact</th>
                <th className="th">Assigned Doctor</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="table-row">
                  <td className="td">
                    <div className="patient-cell">
                      <div className="avatar">
                        {patient.initials}
                      </div>
                      <span className="patient-name">{patient.name}</span>
                    </div>
                  </td>
                  <td className="td">
                    {patient.age}/{patient.gender}
                  </td>
                  <td className="td">{patient.email}</td>
                  <td className="td">{patient.assignedDoctor}</td>
                  <td className="td">
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: patient.status === 'Active' ? '#4CAF50' : '#9E9E9E',
                      }}
                    >
                      {patient.status}
                    </span>
                  </td>
                  <td className="td">
                    <div className="actions-cell">
                      <button
                        onClick={() => handleViewPatient(patient.id)}
                        className="action-btn view-btn text-btn"
                        title="View"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(patient.id)}
                        className="action-btn delete-btn text-btn"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View Patient Modal */}
        {isViewModalOpen && selectedPatient && (
          <div className="modal-overlay" onClick={closeViewModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Patient Details</h2>
                <button className="modal-close-btn" onClick={closeViewModal}>
                  ✕
                </button>
              </div>
              <div className="add-doctor-form">
                <div className="form-group">
                  <label>Patient Name</label>
                  <input type="text" readOnly value={selectedPatient.name} />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="text" readOnly value={selectedPatient.email} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Age</label>
                    <input type="text" readOnly value={selectedPatient.age || 'N/A'} />
                  </div>
                  <div className="form-group">
                    <label>Gender</label>
                    <input type="text" readOnly value={selectedPatient.gender} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Assigned Doctor</label>
                    <input type="text" readOnly value={selectedPatient.assignedDoctor} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <input type="text" readOnly value={selectedPatient.status} />
                  </div>
                </div>
                <div className="modal-footer" style={{ borderTop: 'none', padding: '0', paddingTop: '20px' }}>
                  <button className="btn-cancel" onClick={closeViewModal}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  value: number;
  label: string;
  bgColor: string;
  textColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, bgColor, textColor }) => {
  return (
    <div className="stat-card" style={{ backgroundColor: bgColor }}>
      <p className="stat-value" style={{ color: textColor }}>
        {value.toLocaleString()}
      </p>
      <p className="stat-label">{label}</p>
    </div>
  );
};

export default ManagePatients;