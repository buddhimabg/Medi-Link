import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import './ManageDoctorsPage.css';

interface Doctor {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  email: string;
  phone: string;
  address: string;
  nic: string;
  rating: number;
  status: 'Active' | 'On Leave' | 'Inactive';
  avatar?: string;
}

interface DoctorFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  nic: string;
  specialty: string;
}

const SPECIALTIES = [
  'General',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Dermatology',
  'Oncology',
  'Urology',
  'Counselor'
];

const emptyForm: DoctorFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  nic: '',
  specialty: 'General'
};

const ManageDoctors: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDoctorId, setEditDoctorId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>({ ...emptyForm });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [doctorError, setDoctorError] = useState<string | null>(null);

  // ─── FETCH DOCTORS FROM BACKEND ───
  const fetchDoctors = async () => {
    setIsLoadingDoctors(true);
    try {
      const response = await apiFetch<{ success: boolean; data: any[] }>('/doctors');
      const loadedDoctors: Doctor[] = (response.data || []).map((doctor) => {
        const name = doctor.userId?.name || 'Unknown';
        const status: 'Active' | 'On Leave' | 'Inactive' =
          doctor.status === 'on-leave'
            ? 'On Leave'
            : doctor.status === 'inactive'
            ? 'Inactive'
            : 'Active';
        return {
          id: doctor._id || doctor.id,
          name,
          initials: name
            .split(' ')
            .map((part: string) => part[0])
            .join('')
            .toUpperCase(),
          specialty: doctor.specialization || 'Unknown',
          email: doctor.userId?.email || '',
          phone: doctor.userId?.phone || '',
          address: doctor.userId?.address || '',
          nic: doctor.nic || '',
          rating: doctor.rating || 0,
          status,
          avatar: doctor.userId?.profileImage || undefined
        };
      });
      setDoctors(loadedDoctors);
      setDoctorError(null);
    } catch (error) {
      setDoctorError(error instanceof Error ? error.message : 'Failed to load doctor data');
      setDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // ─── STATS ───
  const stats = [
    {
      label: 'Total Doctors',
      value: doctors.length,
      color: '#3b82f6'
    },
    {
      label: 'Active',
      value: doctors.filter(d => d.status === 'Active').length,
      color: '#06b6d4'
    },
    {
      label: 'On Leave',
      value: doctors.filter(d => d.status === 'On Leave').length,
      color: '#f59e0b'
    },
    {
      label: 'Avg Rating',
      value: doctors.length > 0
        ? (doctors.reduce((acc, d) => acc + d.rating, 0) / doctors.length).toFixed(1)
        : '0.0',
      color: '#4CAF50'
    }
  ];

  const statuses = ['all', 'Active', 'On Leave', 'Inactive'];

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.nic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'all' || doctor.specialty === selectedSpecialty;
    const matchesStatus = selectedStatus === 'all' || doctor.status === selectedStatus;
    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  // ─── OPEN ADD MODAL ───
  const handleAddDoctor = () => {
    setIsEditMode(false);
    setEditDoctorId(null);
    setFormData({ ...emptyForm });
    setFormError(null);
    setIsModalOpen(true);
  };

  // ─── OPEN EDIT MODAL ───
  const handleEditDoctor = (id: string) => {
    const doctor = doctors.find(d => d.id === id);
    if (!doctor) return;

    setIsEditMode(true);
    setEditDoctorId(id);
    setFormData({
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      address: doctor.address,
      nic: doctor.nic,
      specialty: doctor.specialty
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // ─── CLOSE MODAL ───
  const handleModalClose = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditDoctorId(null);
    setFormData({ ...emptyForm });
    setFormError(null);
  };

  // ─── FORM INPUT CHANGE ───
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ─── SUBMIT (CREATE or UPDATE) ───
  const handleSubmitDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.email || !formData.specialty) {
      setFormError('Please fill in Name, Email, and Specialty');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && editDoctorId) {
        // ── UPDATE ──
        await apiFetch(`/doctors/${editDoctorId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            nic: formData.nic,
            specialization: formData.specialty
          })
        });
      } else {
        // ── CREATE ──
        await apiFetch('/doctors', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            nic: formData.nic,
            specialization: formData.specialty,
            password: 'Doctor@123456'
          })
        });
      }

      handleModalClose();
      await fetchDoctors(); // Refresh from DB
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── DELETE ───
  const handleDeleteDoctor = async (id: string) => {
    const doctor = doctors.find(d => d.id === id);
    if (!doctor) return;

    const confirmed = window.confirm(`Are you sure you want to delete Dr. ${doctor.name}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await apiFetch(`/doctors/${id}`, { method: 'DELETE' });
      await fetchDoctors(); // Refresh from DB
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete doctor');
    }
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const getStatusClass = (status: string) => {
    if (status === 'Active') return 'status-active';
    if (status === 'On Leave') return 'status-on-leave';
    return 'status-inactive';
  };

  const getAvatarColor = (initials: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="manage-doctors-container">
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
            <li className="nav-item" onClick={() => navigate('/admin-dashboard')}>
              <span className="nav-icon">📊</span>
              <span className="nav-label">Dashboard</span>
            </li>
            <li className="nav-item nav-item-active" onClick={() => navigate('/manage-doctors')}>
              <span className="nav-icon">👨‍⚕️</span>
              <span className="nav-label">Manage Doctors</span>
              <span className="nav-arrow">›</span>
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
        <header className="page-header">
          <div className="header-left">
            <h1 className="page-title">Manage Doctors</h1>
            <p className="header-date">{currentDate}</p>
          </div>
          <button className="add-doctor-btn" onClick={handleAddDoctor}>
            + Add Doctor
          </button>
        </header>

        {/* Stats Cards */}
        <section className="stats-section">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <p className="stat-value" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <p className="stat-label">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Search and Filters */}
        <div className="search-filter-bar">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, email, or NIC..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
          >
            <option value="all">All Specialties</option>
            {SPECIALTIES.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            {statuses.filter(s => s !== 'all').map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        {doctorError && (
          <div className="error-banner">
            <span>⚠️ {doctorError}</span>
            <button onClick={fetchDoctors} className="retry-btn">Retry</button>
          </div>
        )}

        {/* Loading State */}
        {isLoadingDoctors && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading doctors...</p>
          </div>
        )}

        {/* Doctors Table */}
        {!isLoadingDoctors && (
          <section className="doctors-section">
            <div className="table-wrapper">
              <table className="doctors-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Specialty</th>
                    <th>Contact</th>
                    <th>NIC</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map((doctor) => (
                    <tr key={doctor.id}>
                      <td className="doctor-name-cell">
                        <div className="doctor-avatar" style={{ backgroundColor: getAvatarColor(doctor.initials) }}>
                          {doctor.initials}
                        </div>
                        <span>{doctor.name}</span>
                      </td>
                      <td>
                        <span className="specialty-badge">{doctor.specialty}</span>
                      </td>
                      <td className="contact-cell">
                        <div className="contact-email">{doctor.email}</div>
                        {doctor.phone && <div className="contact-phone">{doctor.phone}</div>}
                      </td>
                      <td className="nic-cell">{doctor.nic || '—'}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(doctor.status)}`}>
                          {doctor.status}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="action-btn view-btn"
                          onClick={() => handleEditDoctor(doctor.id)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteDoctor(doctor.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredDoctors.length === 0 && !doctorError && (
              <div className="no-results">
                <p>No doctors found matching your criteria.</p>
              </div>
            )}
          </section>
        )}

        {/* Add/Edit Doctor Modal */}
        {isModalOpen && (
          <div className="modal-overlay" onClick={handleModalClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{isEditMode ? 'Edit Doctor' : 'Add New Doctor'}</h2>
                <button className="modal-close-btn" onClick={handleModalClose}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitDoctor} className="add-doctor-form">
                {formError && (
                  <div className="form-error">
                    <span>⚠️ {formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="name">Doctor Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Dr. John Doe"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Tel Number</label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+94 77 123 4567"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="nic">NIC</label>
                    <input
                      type="text"
                      id="nic"
                      name="nic"
                      value={formData.nic}
                      onChange={handleInputChange}
                      placeholder="200012345678"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main Street, Colombo"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="specialty">Specialty *</label>
                  <select
                    id="specialty"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                  >
                    {SPECIALTIES.map((spec) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleModalClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? (isEditMode ? 'Updating...' : 'Adding...')
                      : (isEditMode ? 'Update Doctor' : 'Add Doctor')
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageDoctors;