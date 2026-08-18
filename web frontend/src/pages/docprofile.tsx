import React, { useState, useEffect } from 'react';
import {
  Phone, Mail, Edit3, Save, X,
  Award, Users, Calendar, Clock, Star, BadgeCheck
} from 'lucide-react';
import { api } from '../services/api';
import Sidebar from '../components/DoctorPortalSidebar';
import './docprofile.css';

// DOCTOR DATA STRUCTURE 
interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  licenseNumber: string;
  yearsOfExperience: number;
  qualifications: string[];
  languages: string[];
  bio: string;
  totalPatients: number;
  sessionsThisMonth: number;
  rating: number;
  availableDays: string[];
}

//  FALLBACK DATA (if API fails)
const mockDoctor: Doctor = {
  id: "1",
  name: 'Dr. Nimal Perera',
  specialty: 'Consultant Psychiatrist',
  email: 'nimal.perera@medilink.lk',
  phone: '+94 77 123 4567',
  licenseNumber: 'SLMC-2014-08842',
  yearsOfExperience: 12,
  qualifications: ['MBBS', 'MD (Psychiatry)', 'MRCPsych'],
  languages: ['Sinhala', 'English', 'Tamil'],
  bio: 'Dr. Nimal Perera is a consultant psychiatrist with over 12 years of experience...',
  totalPatients: 352,
  sessionsThisMonth: 28,
  rating: 4.9,
  availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
};

// MAIN COMPONENT 
const DoctorProfile: React.FC = () => {
  // State variables
  const [doctor, setDoctor] = useState<Doctor | null>(null);        // Doctor data
  const [loading, setLoading] = useState(true);                     // Loading state
  const [editing, setEditing] = useState(false);                    // Edit mode on/off
  const [saving, setSaving] = useState(false);                      // Saving state
  const [editForm, setEditForm] = useState({ phone: '', bio: '', email: '', specialty: '', licenseNumber: '', yearsOfExperience: 0 }); // Form data
  const [validationErrors, setValidationErrors] = useState<{ phone?: string; email?: string; specialty?: string; licenseNumber?: string; yearsOfExperience?: string }>({});
  const [saveSuccess, setSaveSuccess] = useState(false);            // 👈 SUCCESS POPUP TRIGGER
  const [saveError, setSaveError] = useState<string | null>(null);  // Error message

  // FETCH DOCTOR DATA 
  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const user_id = localStorage.getItem("user_id");
        const data = await api.getDoctorProfile(user_id);
        if (!data) {
          setDoctor(mockDoctor);
          setEditForm({ phone: mockDoctor.phone, bio: mockDoctor.bio, email: mockDoctor.email, specialty: mockDoctor.specialty, licenseNumber: mockDoctor.licenseNumber, yearsOfExperience: mockDoctor.yearsOfExperience });
        } else {
          setDoctor(data);
          setEditForm({ phone: data.phone, bio: data.bio, email: data.email, specialty: data.specialty, licenseNumber: data.licenseNumber || '', yearsOfExperience: data.yearsOfExperience || 0 });
        }
      } catch (error) {
        console.error('Failed to fetch doctor profile:', error);
        setDoctor(mockDoctor);
        setEditForm(prev => ({
          ...prev,
          phone: mockDoctor.phone,
          bio: mockDoctor.bio,
          email: mockDoctor.email,
          specialty: mockDoctor.specialty,
          licenseNumber: mockDoctor.licenseNumber,
          yearsOfExperience: mockDoctor.yearsOfExperience,
        }));
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, []);

  // EDIT MODE 
  const handleEdit = () => {
    if (doctor) {
      setEditForm({ phone: doctor.phone, bio: doctor.bio, email: doctor.email, specialty: doctor.specialty, licenseNumber: doctor.licenseNumber, yearsOfExperience: doctor.yearsOfExperience });
      setEditing(true);  // Show input fields
    }
  };

  //  CANCEL EDIT 
  const handleCancel = () => {
    setEditing(false);
    setSaveError(null);
  };

  //  SAVE CHANGES
  
  const handleSave = async () => {
    if (!doctor) return;
    setSaving(true);
    setSaveError(null);

    console.log('🔍 Doctor ID being sent:', doctor.id);  
    console.log('🔍 Edit Form Data:', editForm);         

    try {
      const updated = await api.updateDoctorProfile(doctor.id, editForm);
      if (updated) {
        setDoctor(updated);
      } else {
        setDoctor({ ...doctor, ...editForm });
      }
      setEditing(false);
      
      //  SUCCESS POPUP NOTIFICATION 
      setSaveSuccess(true);  //  THIS TRIGGERS THE GREEN POPUP TOAST
      // Auto-hide after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
      // END OF POPUP NOTIFICATION 
      
    } catch (error) {
      console.error('Failed to update profile:', error);
      setSaveError('Unable to save changes. Please make sure the backend is running.');
    } finally {
      setSaving(false);
    }
  };

  // Get first 2 letters of name for avatar
  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Loading state
  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="dp-container">
          <div className="dp-loading">
            <div className="dp-loading-spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (!doctor) {
    return (
      <>
        <Sidebar />
        <div className="dp-container">
          <div className="dp-loading"><p>Profile not found.</p></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
        <div className="dp-container">
          <div className="dp-content">
          {/*  SUCCESS POPUP TOAST NOTIFICATION  */}
          {/* This green popup appears in top-right corner when saveSuccess = true */}
          {/* It disappears automatically after 3 seconds */}
          {saveSuccess && (
            <div className="dp-toast">
              <BadgeCheck size={18} />
              Profile updated successfully!
            </div>
          )}
          {/* END OF POPUP NOTIFICATION  */}

          {/* ===== HERO SECTION ===== */}
          <div className="dp-hero">
            <div className="dp-hero-bg"></div>
            <div className="dp-hero-body">
              {/* Avatar */}
              <div className="dp-avatar-wrapper">
                <div className="dp-avatar">
                  {<span>{getInitials(doctor.name)}</span>}
                </div>
                <div className="dp-verified-badge">
                  <BadgeCheck size={20} />
                </div>
              </div>

              {/* Doctor info */}
              <div className="dp-hero-info">
                <div className="dp-hero-name-row">
                  <h1>{doctor.name}</h1>
                  <span className="dp-specialty-chip">{doctor.specialty}</span>
                </div>
                <p className="dp-license">License No: {doctor.licenseNumber}</p>
                <div className="dp-qualifications">
                  {doctor.qualifications.map((q, i) => (
                    <span key={i} className="dp-qual-chip">{q}</span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="dp-hero-actions">
                {!editing ? (
                  <button className="dp-edit-btn" onClick={handleEdit}>
                    <Edit3 size={16} />
                    Edit Profile
                  </button>
                ) : (
                  <div className="dp-edit-actions">
                    <button className="dp-save-btn" onClick={handleSave} disabled={saving}>
                      <Save size={16} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button className="dp-cancel-btn" onClick={handleCancel}>
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {saveError && <div className="dp-save-error">{saveError}</div>}
            </div>
          </div>

          {/* ===== STATS ROW ===== */}
          <div className="dp-stats-row">
            <div className="dp-stat-card">
              <div className="dp-stat-icon dp-stat-blue"><Users size={22} /></div>
              <div className="dp-stat-info">
                <div className="dp-stat-number">{doctor.totalPatients}</div>
                <div className="dp-stat-label">Total Patients</div>
              </div>
            </div>
            <div className="dp-stat-card">
              <div className="dp-stat-icon dp-stat-green"><Calendar size={22} /></div>
              <div className="dp-stat-info">
                <div className="dp-stat-number">{doctor.sessionsThisMonth}</div>
                <div className="dp-stat-label">Sessions This Month</div>
              </div>
            </div>
            <div className="dp-stat-card">
              <div className="dp-stat-icon dp-stat-orange"><Clock size={22} /></div>
              <div className="dp-stat-info">
                <div className="dp-stat-number">{doctor.yearsOfExperience}</div>
                <div className="dp-stat-label">Years Experience</div>
              </div>
            </div>
            <div className="dp-stat-card">
              <div className="dp-stat-icon dp-stat-yellow"><Star size={22} /></div>
              <div className="dp-stat-info">
                <div className="dp-stat-number">{doctor.rating}</div>
                <div className="dp-stat-label">Patient Rating</div>
              </div>
            </div>
          </div>

          {/* ===== MAIN GRID ===== */}
          <div className="dp-grid">

            {/* Left Column */}
            <div className="dp-col-left">

              {/* Bio Section */}
              <div className="dp-card">
                <div className="dp-card-header">
                  <h3>About</h3>
                  {editing && <span className="dp-editable-tag">Editable</span>}
                </div>
                {editing ? (
                  <textarea
                    className="dp-textarea"
                    value={editForm.bio}
                    onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={5}
                    placeholder="Write a short bio..."
                  />
                ) : (
                  <p className="dp-bio-text">{doctor.bio}</p>
                )}
              </div>

              {/* Contact Information */}
              <div className="dp-card">
                <div className="dp-card-header">
                  <h3>Contact Information</h3>
                </div>
                <div className="dp-contact-list">
                  {/* Phone - Editable */}
                  <div className="dp-contact-item">
                    <div className="dp-contact-icon"><Phone size={16} /></div>
                    <div className="dp-contact-detail">
                      <span className="dp-contact-label">Phone</span>
                      {editing ? (
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="dp-input"
                          value={editForm.phone}
                          onChange={e => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setEditForm(prev => ({ ...prev, phone: digits }));
                            if (!/^\d{10}$/.test(digits)) {
                              setValidationErrors(prev => ({ ...prev, phone: 'Phone must be exactly 10 digits' }));
                            } else {
                              setValidationErrors(prev => ({ ...prev, phone: undefined }));
                            }
                          }}
                          placeholder="0771234567"
                        />
                      ) : (
                        <span className="dp-contact-value">{doctor.phone}</span>
                      )}
                    </div>
                    {editing && <span className="dp-editable-tag">Editable</span>}
                  </div>

                  {/* Email - Admin only (not editable) */}
                  <div className="dp-contact-item">
                    <div className="dp-contact-icon"><Mail size={16} /></div>
                    <div className="dp-contact-detail">
                      <span className="dp-contact-label">Email</span>
                      {editing ? (
                        <input
                          type="email"
                          className="dp-input"
                          value={editForm.email}
                          onChange={e => {
                            setEditForm({ ...editForm, email: e.target.value });
                            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                              setValidationErrors(prev => ({ ...prev, email: 'Invalid email address' }));
                            } else {
                              setValidationErrors(prev => ({ ...prev, email: undefined }));
                            }
                          }}
                          placeholder="you@domain.com"
                        />
                      ) : (
                        <span className="dp-contact-value">{doctor.email}</span>
                      )}
                    </div>
                    {editing && <span className="dp-editable-tag">Editable</span>}
                  </div>
                  {/* Validation messages */}
                  {editing && (validationErrors.phone || validationErrors.email) && (
                    <div className="dp-validation-errors">
                      {validationErrors.phone && <div className="dp-error">{validationErrors.phone}</div>}
                      {validationErrors.email && <div className="dp-error">{validationErrors.email}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="dp-col-right">

              {/* Professional Details */}
              <div className="dp-card">
                <div className="dp-card-header">
                  <h3>Professional Details</h3>
                  {editing && <span className="dp-editable-tag">Editable</span>}
                </div>
                <div className="dp-detail-list">
                  <div className="dp-detail-row">
                    <span className="dp-detail-label">Specialty</span>
                    {editing ? (
                      <input
                        type="text"
                        className="dp-input dp-input-inline"
                        value={editForm.specialty}
                        onChange={e => {
                          const val = e.target.value;
                          setEditForm(prev => ({ ...prev, specialty: val }));
                          if (!val || val.trim().length < 2) {
                            setValidationErrors(prev => ({ ...prev, specialty: 'Specialty must be at least 2 characters' }));
                          } else {
                            setValidationErrors(prev => ({ ...prev, specialty: undefined }));
                          }
                        }}
                      />
                    ) : (
                      <span className="dp-detail-value dp-specialty-value">{doctor.specialty}</span>
                    )}
                    {editing && validationErrors.specialty && (
                      <div className="dp-error" style={{ marginTop: 6 }}>{validationErrors.specialty}</div>
                    )}
                  </div>
                  <div className="dp-detail-row">
                    <span className="dp-detail-label">License Number</span>
                    {editing ? (
                      <input
                        type="text"
                        className="dp-input dp-input-inline"
                        value={editForm.licenseNumber}
                        onChange={e => {
                          const val = e.target.value;
                          setEditForm(prev => ({ ...prev, licenseNumber: val }));
                          if (!val || val.trim().length < 3) {
                            setValidationErrors(prev => ({ ...prev, licenseNumber: 'License number must be at least 3 characters' }));
                          } else {
                            setValidationErrors(prev => ({ ...prev, licenseNumber: undefined }));
                          }
                        }}
                      />
                    ) : (
                      <span className="dp-detail-value">{doctor.licenseNumber}</span>
                    )}
                    {editing && validationErrors.licenseNumber && <div className="dp-error" style={{ marginTop: 6 }}>{validationErrors.licenseNumber}</div>}
                  </div>
                  <div className="dp-detail-row">
                    <span className="dp-detail-label">Experience</span>
                    {editing ? (
                      <input
                        type="number"
                        min={0}
                        max={80}
                        className="dp-input dp-input-inline"
                        value={String(editForm.yearsOfExperience)}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setEditForm(prev => ({ ...prev, yearsOfExperience: val }));
                          if (!Number.isInteger(val) || val < 0 || val > 80) {
                            setValidationErrors(prev => ({ ...prev, yearsOfExperience: 'Enter a valid number of years (0-80)' }));
                          } else {
                            setValidationErrors(prev => ({ ...prev, yearsOfExperience: undefined }));
                          }
                        }}
                      />
                    ) : (
                      <span className="dp-detail-value">{doctor.yearsOfExperience} years</span>
                    )}
                    {editing && validationErrors.yearsOfExperience && <div className="dp-error" style={{ marginTop: 6 }}>{validationErrors.yearsOfExperience}</div>}
                  </div>
                  <div className="dp-detail-row">
                    <span className="dp-detail-label">Languages</span>
                    <div className="dp-lang-chips">
                      {doctor.languages.map((lang, i) => (
                        <span key={i} className="dp-lang-chip">{lang}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Qualifications */}
              <div className="dp-card">
                <div className="dp-card-header">
                  <h3>Qualifications</h3>
                  {editing && <span className="dp-locked-tag">Admin only</span>}
                </div>
                <div className="dp-qual-list">
                  {doctor.qualifications.map((q, i) => (
                    <div key={i} className="dp-qual-item">
                      <Award size={16} className="dp-qual-icon" />
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Days */}
              <div className="dp-card">
                <div className="dp-card-header">
                  <h3>Available Days</h3>
                  {editing && <span className="dp-locked-tag">Admin only</span>}
                </div>
                <div className="dp-days-grid">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div
                      key={day}
                      className={`dp-day-chip ${doctor.availableDays.includes(day) ? 'dp-day-active' : 'dp-day-inactive'}`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DoctorProfile;