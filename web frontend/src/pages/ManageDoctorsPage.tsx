import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertCircle, CheckCircle2, Search, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, clearAuthToken } from '../api/api';
import AdminSidebar from '../components/AdminSidebar';
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
  licenseNumber: string;
  isVerified: boolean;
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
  licenseNumber: string;
  specialty: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  rating: number;
}

type FormErrors = Partial<Record<keyof DoctorFormData, string>>;
type FormTouched = Partial<Record<keyof DoctorFormData, boolean>>;

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
  licenseNumber: '',
  specialty: 'General',
  status: 'Active',
  rating: 0
};

const ManageDoctors: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDoctorId, setEditDoctorId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
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
      const loadedDoctors: Doctor[] = (response.data || []).map((doctor: any) => {
        const name = doctor.name || doctor.userId?.name || 'Unknown';
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
            .toUpperCase()
            .substring(0, 2),
          specialty: doctor.specialty || doctor.specialization || 'Unknown',
          email: doctor.email || doctor.userId?.email || '',
          phone: doctor.phone || doctor.userId?.phone || '',
          address: doctor.address || doctor.userId?.address || '',
          nic: doctor.nic || '',
          licenseNumber: doctor.licenseNumber || '',
          isVerified: doctor.isVerified === true,
          rating: doctor.rating || 0,
          status,
          avatar: doctor.photo || doctor.userId?.profileImage || undefined
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

  const statuses = ['all', 'Active', 'On Leave'];

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.nic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'all' || doctor.specialty === selectedSpecialty;
    const matchesStatus = selectedStatus === 'all' || doctor.status === selectedStatus;
    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  // ─── REAL-TIME FIELD VALIDATOR ───
  const validateField = (fieldName: keyof DoctorFormData, val: any): string => {
    const strVal = typeof val === 'string' ? val : '';
    const trimmed = strVal.trim();

    switch (fieldName) {
      case 'name':
        if (!trimmed) return 'Doctor name is required';
        if (trimmed.length < 3) return 'Name must be at least 3 characters';
        if (!/^[a-zA-Z\s\.\-']+$/.test(trimmed)) {
          return 'Name should only contain letters, spaces, dots, and hyphens';
        }
        return '';

      case 'email':
        if (!trimmed) return 'Email address is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          return 'Please enter a valid email address (e.g. name@example.com)';
        }
        const emailDup = doctors.some(
          d => d.email && d.email.toLowerCase() === trimmed.toLowerCase() && d.id !== editDoctorId
        );
        if (emailDup) {
          return 'This email is already registered to another doctor';
        }
        return '';

      case 'phone':
        if (!trimmed) return ''; // Optional
        const phoneClean = trimmed.replace(/[\s\-()]/g, '');
        if (!/^(\+94\d{9}|0\d{9})$/.test(phoneClean)) {
          return 'Tel number must be +94 7X XXX XXXX (or 07X XXX XXXX)';
        }
        return '';

      case 'nic':
        if (!trimmed) return ''; // Optional
        const nicClean = trimmed.replace(/\s+/g, '').toUpperCase();
        const isNewNic = /^\d{12}$/.test(nicClean);
        const isOldNic = /^\d{9}[VX]$/.test(nicClean);
        if (!isNewNic && !isOldNic) {
          return 'NIC must be 12 digits (new NIC) or 9 digits + V/X (old NIC)';
        }
        const nicDup = doctors.some(
          d => d.nic && d.nic.replace(/\s+/g, '').toUpperCase() === nicClean && d.id !== editDoctorId
        );
        if (nicDup) {
          return 'This NIC is already registered to another doctor';
        }
        return '';

      case 'licenseNumber':
        if (!trimmed) return ''; // Optional
        if (trimmed.length < 4) {
          return 'License number must be at least 4 characters';
        }
        if (!/^[a-zA-Z0-9\-_/]+$/.test(trimmed)) {
          return 'License number can only contain letters, numbers, hyphens, and slashes';
        }
        const licenseDup = doctors.some(
          d => d.licenseNumber && d.licenseNumber.trim().toLowerCase() === trimmed.toLowerCase() && d.id !== editDoctorId
        );
        if (licenseDup) {
          return 'This SLMC license number already exists in the system';
        }
        return '';

      case 'address':
        if (!trimmed) return ''; // Optional
        if (trimmed.length < 5) {
          return 'Address must be at least 5 characters if provided';
        }
        return '';

      case 'specialty':
        if (!trimmed || !SPECIALTIES.includes(trimmed)) {
          return 'Please select a valid specialty';
        }
        return '';

      default:
        return '';
    }
  };

  // ─── VALIDATE ALL FIELDS ───
  const validateAll = (): boolean => {
    const fieldsToValidate: (keyof DoctorFormData)[] = ['name', 'email', 'phone', 'nic', 'licenseNumber', 'address', 'specialty'];
    const newErrors: FormErrors = {};
    const allTouched: FormTouched = {};
    let hasErrors = false;

    fieldsToValidate.forEach((field) => {
      allTouched[field] = true;
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        hasErrors = true;
      }
    });

    setTouched(allTouched);
    setFormErrors(newErrors);
    return !hasErrors;
  };

  // Helper to determine field validity status
  const isFieldValid = (name: keyof DoctorFormData): boolean => {
    const val = formData[name];
    const isTouched = !!touched[name];
    const hasError = !!formErrors[name];
    if (!isTouched || hasError) return false;
    // For optional fields, only show green valid indicator if user entered non-empty valid content
    if (typeof val === 'string' && !val.trim() && (name === 'phone' || name === 'nic' || name === 'licenseNumber' || name === 'address')) {
      return false;
    }
    return true;
  };

  const isFieldInvalid = (name: keyof DoctorFormData): boolean => {
    return !!touched[name] && !!formErrors[name];
  };

  // ─── OPEN ADD MODAL ───
  const handleAddDoctor = () => {
    setIsEditMode(false);
    setEditDoctorId(null);
    setFormData({ ...emptyForm });
    setFormErrors({});
    setTouched({});
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
      licenseNumber: doctor.licenseNumber || '',
      specialty: doctor.specialty,
      status: doctor.status,
      rating: doctor.rating || 0
    });
    setFormErrors({});
    setTouched({});
    setFormError(null);
    setIsModalOpen(true);
  };

  // ─── CLOSE MODAL ───
  const handleModalClose = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditDoctorId(null);
    setFormData({ ...emptyForm });
    setFormErrors({});
    setTouched({});
    setFormError(null);
  };

  // ─── FORM INPUT CHANGE (REAL-TIME VALIDATION) ───
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const nextValue = name === 'rating' ? Number(value) : value;

    setFormData(prev => ({ ...prev, [name]: nextValue }));
    setTouched(prev => ({ ...prev, [name]: true }));

    // Instant real-time validation calculation
    const fieldError = validateField(name as keyof DoctorFormData, nextValue);
    setFormErrors(prev => ({ ...prev, [name]: fieldError }));

    if (formError) setFormError(null);
  };

  // ─── FORM INPUT BLUR (MARK TOUCHED AND VALIDATE) ───
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const fieldError = validateField(name as keyof DoctorFormData, value);
    setFormErrors(prev => ({ ...prev, [name]: fieldError }));
  };

  // ─── SUBMIT (CREATE or UPDATE) ───
  const handleSubmitDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const isValid = validateAll();
    if (!isValid) {
      setFormError('Please resolve the highlighted validation errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && editDoctorId) {
        // ── UPDATE ──
        await apiFetch(`/doctors/${editDoctorId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            nic: formData.nic.trim().toUpperCase(),
            licenseNumber: formData.licenseNumber.trim() || undefined,
            specialization: formData.specialty,
            status: formData.status === 'On Leave' ? 'on-leave' : formData.status === 'Inactive' ? 'inactive' : 'active',
            rating: formData.rating
          })
        });
      } else {
        // ── CREATE (Admin added doctor is automatically verified) ──
        await apiFetch('/doctors', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            nic: formData.nic.trim().toUpperCase(),
            licenseNumber: formData.licenseNumber.trim() || `SLMC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
            specialization: formData.specialty,
            password: 'Doctor@123456',
            status: formData.status === 'On Leave' ? 'on-leave' : formData.status === 'Inactive' ? 'inactive' : 'active',
            rating: formData.rating,
            isVerified: true // Admin added doctors are already verified
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
    clearAuthToken();
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
      <AdminSidebar activeRoute="/manage-doctors" />

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
            <Search className="search-icon" size={18} />
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

        {/* Pending Approvals Notice Banner */}
        {doctors.filter(d => !d.isVerified).length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 600, fontSize: '0.88rem' }}>
              <AlertCircle size={18} color="#d97706" />
              <span>You have <strong>{doctors.filter(d => !d.isVerified).length} doctor(s)</strong> awaiting Medical Council license verification and approval.</span>
            </div>
            <button
              onClick={() => navigate('/doctor-approvals')}
              style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Review Approvals →
            </button>
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
                    <th>SLMC License</th>
                    <th>Specialty</th>
                    <th>Contact</th>
                    <th>NIC</th>
                    <th>Verification</th>
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
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '3px 7px', borderRadius: '5px', fontSize: '0.8rem' }}>
                          {doctor.licenseNumber || 'SLMC-PENDING'}
                        </span>
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
                        {doctor.isVerified ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700 }}>
                            <ShieldCheck size={12} /> Verified
                          </span>
                        ) : (
                          <span
                            onClick={() => navigate('/doctor-approvals')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                            title="Click to review in Doctor Approvals"
                          >
                            <ShieldAlert size={12} /> Pending Review
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(doctor.status)}`}>
                          {doctor.status}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="action-btn view-btn text-btn"
                          onClick={() => handleEditDoctor(doctor.id)}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          className="action-btn delete-btn text-btn"
                          onClick={() => handleDeleteDoctor(doctor.id)}
                          title="Delete"
                        >
                          Delete
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

              <form onSubmit={handleSubmitDoctor} noValidate className="add-doctor-form">
                {formError && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Doctor Name */}
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Doctor Name <span className="required-asterisk">*</span>
                  </label>
                  <div className="input-with-feedback">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="Dr. John Doe"
                      className={`form-input ${isFieldInvalid('name') ? 'input-error' : ''} ${isFieldValid('name') ? 'input-valid' : ''}`}
                    />
                    {isFieldValid('name') && <CheckCircle2 className="feedback-icon valid-icon" size={17} />}
                    {isFieldInvalid('name') && <AlertCircle className="feedback-icon invalid-icon" size={17} />}
                  </div>
                  {isFieldInvalid('name') && (
                    <div className="field-error-text">
                      <AlertCircle size={13} />
                      <span>{formErrors.name}</span>
                    </div>
                  )}
                </div>

                {/* Email Address */}
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email Address <span className="required-asterisk">*</span>
                  </label>
                  <div className="input-with-feedback">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="john@example.com"
                      className={`form-input ${isFieldInvalid('email') ? 'input-error' : ''} ${isFieldValid('email') ? 'input-valid' : ''}`}
                    />
                    {isFieldValid('email') && <CheckCircle2 className="feedback-icon valid-icon" size={17} />}
                    {isFieldInvalid('email') && <AlertCircle className="feedback-icon invalid-icon" size={17} />}
                  </div>
                  {isFieldInvalid('email') && (
                    <div className="field-error-text">
                      <AlertCircle size={13} />
                      <span>{formErrors.email}</span>
                    </div>
                  )}
                </div>

                {/* Phone and NIC */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">Tel Number</label>
                    <div className="input-with-feedback">
                      <input
                        type="text"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="+94 77 123 4567"
                        className={`form-input ${isFieldInvalid('phone') ? 'input-error' : ''} ${isFieldValid('phone') ? 'input-valid' : ''}`}
                      />
                      {isFieldValid('phone') && <CheckCircle2 className="feedback-icon valid-icon" size={17} />}
                      {isFieldInvalid('phone') && <AlertCircle className="feedback-icon invalid-icon" size={17} />}
                    </div>
                    {isFieldInvalid('phone') ? (
                      <div className="field-error-text">
                        <AlertCircle size={13} />
                        <span>{formErrors.phone}</span>
                      </div>
                    ) : (
                      <span className="field-hint">e.g. +94 77 123 4567</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="nic" className="form-label">NIC</label>
                    <div className="input-with-feedback">
                      <input
                        type="text"
                        id="nic"
                        name="nic"
                        value={formData.nic}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="200012345678"
                        className={`form-input ${isFieldInvalid('nic') ? 'input-error' : ''} ${isFieldValid('nic') ? 'input-valid' : ''}`}
                      />
                      {isFieldValid('nic') && <CheckCircle2 className="feedback-icon valid-icon" size={17} />}
                      {isFieldInvalid('nic') && <AlertCircle className="feedback-icon invalid-icon" size={17} />}
                    </div>
                    {isFieldInvalid('nic') ? (
                      <div className="field-error-text">
                        <AlertCircle size={13} />
                        <span>{formErrors.nic}</span>
                      </div>
                    ) : (
                      <span className="field-hint">12 digits (new) or 9 digits+V (old)</span>
                    )}
                  </div>
                </div>

                {/* Medical Council License Number (SLMC) */}
                <div className="form-group">
                  <label htmlFor="licenseNumber" className="form-label">
                    Medical Council License Number (SLMC)
                  </label>
                  <div className="input-with-feedback">
                    <input
                      type="text"
                      id="licenseNumber"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="SLMC-2026-12345 (optional, auto-generated if empty)"
                      className={`form-input ${isFieldInvalid('licenseNumber') ? 'input-error' : ''} ${isFieldValid('licenseNumber') ? 'input-valid' : ''}`}
                    />
                    {isFieldValid('licenseNumber') && <CheckCircle2 className="feedback-icon valid-icon" size={17} />}
                    {isFieldInvalid('licenseNumber') && <AlertCircle className="feedback-icon invalid-icon" size={17} />}
                  </div>
                  {isFieldInvalid('licenseNumber') ? (
                    <div className="field-error-text">
                      <AlertCircle size={13} />
                      <span>{formErrors.licenseNumber}</span>
                    </div>
                  ) : (
                    <span className="field-hint">Leave blank to auto-generate a valid SLMC registration license</span>
                  )}
                </div>

                {/* Address */}
                <div className="form-group">
                  <label htmlFor="address" className="form-label">Address</label>
                  <div className="input-with-feedback">
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="123 Main Street, Colombo"
                      className={`form-input ${isFieldInvalid('address') ? 'input-error' : ''} ${isFieldValid('address') ? 'input-valid' : ''}`}
                    />
                    {isFieldValid('address') && <CheckCircle2 className="feedback-icon valid-icon" size={17} />}
                    {isFieldInvalid('address') && <AlertCircle className="feedback-icon invalid-icon" size={17} />}
                  </div>
                  {isFieldInvalid('address') && (
                    <div className="field-error-text">
                      <AlertCircle size={13} />
                      <span>{formErrors.address}</span>
                    </div>
                  )}
                </div>

                {/* Specialty */}
                <div className="form-group">
                  <label htmlFor="specialty" className="form-label">
                    Specialty <span className="required-asterisk">*</span>
                  </label>
                  <div className="input-with-feedback">
                    <select
                      id="specialty"
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`form-input ${isFieldInvalid('specialty') ? 'input-error' : ''} ${isFieldValid('specialty') ? 'input-valid' : ''}`}
                    >
                      {SPECIALTIES.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                    {isFieldValid('specialty') && <CheckCircle2 className="feedback-icon valid-icon select-feedback-icon" size={17} />}
                    {isFieldInvalid('specialty') && <AlertCircle className="feedback-icon invalid-icon select-feedback-icon" size={17} />}
                  </div>
                  {isFieldInvalid('specialty') && (
                    <div className="field-error-text">
                      <AlertCircle size={13} />
                      <span>{formErrors.specialty}</span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <div className="radio-group" style={{ display: 'flex', gap: '10px', marginTop: '8px', width: '100%' }}>
                    <label style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', backgroundColor: formData.status === 'Active' ? '#eef2ff' : '#fff', borderColor: formData.status === 'Active' ? '#6366f1' : '#ccc', transition: 'all 0.2s' }}>
                      <input
                        type="radio"
                        name="status"
                        value="Active"
                        checked={formData.status === 'Active'}
                        onChange={handleInputChange}
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontWeight: formData.status === 'Active' ? '600' : 'normal', color: formData.status === 'Active' ? '#4f46e5' : '#333' }}>Active</span>
                    </label>
                    <label style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', backgroundColor: formData.status === 'On Leave' ? '#fffbeb' : '#fff', borderColor: formData.status === 'On Leave' ? '#f59e0b' : '#ccc', transition: 'all 0.2s' }}>
                      <input
                        type="radio"
                        name="status"
                        value="On Leave"
                        checked={formData.status === 'On Leave'}
                        onChange={handleInputChange}
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontWeight: formData.status === 'On Leave' ? '600' : 'normal', color: formData.status === 'On Leave' ? '#d97706' : '#333' }}>On Leave</span>
                    </label>
                  </div>
                </div>

                {/* Rating */}
                <div className="form-group">
                  <label className="form-label">Rating {formData.rating > 0 ? `(${formData.rating}/5)` : ''}</label>
                  <div className="rating-radio-group" style={{ display: 'flex', gap: '10px', marginTop: '8px', width: '100%' }}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <label key={num} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', backgroundColor: formData.rating === num ? '#eef2ff' : '#fff', borderColor: formData.rating === num ? '#6366f1' : '#ccc', transition: 'all 0.2s' }}>
                        <input
                          type="radio"
                          name="rating"
                          value={num}
                          checked={formData.rating === num}
                          onChange={handleInputChange}
                          style={{ display: 'none' }}
                        />
                        <span style={{ fontWeight: formData.rating === num ? '600' : 'normal', color: formData.rating === num ? '#4f46e5' : '#333' }}>{num}</span>
                      </label>
                    ))}
                  </div>
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