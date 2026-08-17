import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Heart, FileText, ScrollText, Activity, Pill, AlertCircle, X, CalendarDays } from 'lucide-react';
import { api } from '../services/api';
import TreatmentPlanSection from '../components/TreatmentPlanSection';
import Sidebar from '../components/DoctorPortalSidebar';
import './patientprofile.css';

interface ChronicDisease {
  _id: string;
  name: string;
  status: string;
  diagnosed: string;
  lastResult: string;
}

interface Medication {
  _id: string;
  name: string;
  status: string;
  dosage: string;
  purpose: string;
  started: string;
}

interface Report {
  _id: string;
  date: string;
  hospital: string;
  primaryDx: string;
  severity: string;
  status: string;
}

interface Script {
  _id: string;
  fileName: string;
  date: string;
  type: string;
  doctorName: string;
  diagnosis: string;
  severity: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
}

// Additional interfaces
interface VitalSign {
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  weight: number;
  bmi: number;
}

interface Allergy {
  name: string;
  reaction: string;
  severity: string;
}

interface PatientProfile {
  id: number;
  name: string;
  age: number;
  gender: string;
  lastVisit: string;
  condition: string;
  vitalSigns?: VitalSign;
  allergies?: Allergy[];
  chronicDiseases: ChronicDisease[];
  medications: Medication[];
  reports: Report[];
  scripts: Script[];
}

type TabType = 'scripts' | 'reports' | 'medical' | 'treatment';

const PatientProfile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('treatment');
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Script | null>(null);
  const [showMedicationDialog, setShowMedicationDialog] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);

  const rawFromSlot = location.state?.fromSlot;
  console.debug('patientprofile location.state:', location.state);
  const fromSlot = rawFromSlot && rawFromSlot.source === 'slot' ? rawFromSlot : null;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.getPatientProfile(Number(id));
        setProfile(data);
      } catch (error) {
        console.error('Failed to fetch patient profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const handleViewPrescription = (prescription: Script) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionDialog(true);
  };

  const handleViewMedication = (medication: Medication) => {
    setSelectedMedication(medication);
    setShowMedicationDialog(true);
  };

  const closeDialogs = () => {
    setShowPrescriptionDialog(false);
    setShowMedicationDialog(false);
    setSelectedPrescription(null);
    setSelectedMedication(null);
  };

  const tabs = [
    { key: 'treatment', label: 'Treatment Plan', icon: CalendarDays },
    { key: 'scripts', label: 'Scripts', icon: ScrollText },
    { key: 'reports', label: 'Reports', icon: FileText },
    { key: 'medical', label: 'Medical', icon: Heart },
  ] as const;

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="profile-container">
          <div className="profile-loading">Loading profile...</div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Sidebar />
        <div className="profile-container">
          <div className="profile-loading">Patient not found</div>
        </div>
      </>
    );
  }

  // Count conditions
  const hasChronicDiseases = profile.chronicDiseases && profile.chronicDiseases.length > 0;
  const hasMedications = profile.medications && profile.medications.length > 0;
  const hasReports = profile.reports && profile.reports.length > 0;
  const hasScripts = profile.scripts && profile.scripts.length > 0;

  return (
    <>
      <Sidebar />
      <div className="profile-container">
      <div className="profile-content">
        {/* Back Button */}
        <button 
          className="profile-back-btn" 
          onClick={() => {
            if (fromSlot && fromSlot.id) {
              // Prefer navigating back in history if possible, otherwise navigate to view
              try {
                navigate(-1);
              } catch (err) {
                navigate(`/view/${fromSlot.id}`, { state: { slot: fromSlot } });
              }
            } else {
              navigate(-1);
            }
          }}
        >
          <ArrowLeft size={18} />
          {fromSlot ? 'Back to Patient List' : 'Back to Patients'}
        </button>

        {/* Patient Header */}
        <div className="profile-header-card">
          <div className="profile-avatar-large">
            {getInitials(profile.name)}
          </div>
          <div className="profile-header-info">
            <h1 className="profile-name">{profile.name}</h1>
            <p className="profile-meta">{profile.age} years · {profile.gender}</p>
            <p className="profile-meta">Last Visit: {profile.lastVisit}</p>
            <div className="profile-badges">
          <span className={`profile-condition-badge ${profile.condition}`}>
          {profile.condition === 'critical' ? 'Critical' : 'Mild'}
          </span>
          </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                className={`profile-tab ${activeTab === tab.key ? 'profile-tab-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TREATMENT PLAN TAB */}
        {activeTab === 'treatment' && (
          <TreatmentPlanSection patientId={Number(id)} />
        )}

        {/*  MEDICAL TAB  */}
        {activeTab === 'medical' && (
          <div>
            {/* Vital Signs Section */}
            {profile.vitalSigns && (
              <div className="profile-section vital-signs-section">
                <div className="profile-section-header">
                  <Activity size={18} className="section-icon" />
                  <div>
                    <h3>Vital Signs</h3>
                    <p>Current health measurements</p>
                  </div>
                </div>
                <div className="vital-signs-grid">
                  <div className="vital-card">
                    <span className="vital-label">Blood Pressure</span>
                    <span className="vital-value">{profile.vitalSigns.bloodPressure}</span>
                  </div>
                  <div className="vital-card">
                    <span className="vital-label">Heart Rate</span>
                    <span className="vital-value">{profile.vitalSigns.heartRate} bpm</span>
                  </div>
                  <div className="vital-card">
                    <span className="vital-label">Temperature</span>
                    <span className="vital-value">{profile.vitalSigns.temperature}°C</span>
                  </div>
                  <div className="vital-card">
                    <span className="vital-label">Weight / BMI</span>
                    <span className="vital-value">{profile.vitalSigns.weight} kg / {profile.vitalSigns.bmi}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chronic Diseases Section */}
            <div className="profile-section">
              <div className="profile-section-header">
                <Heart size={18} className="section-icon" />
                <div>
                  <h3>Chronic Diseases</h3>
                  <p>Long term health conditions</p>
                </div>
              </div>
              {!hasChronicDiseases ? (
                <p className="empty-state">No chronic diseases recorded</p>
              ) : (
                profile.chronicDiseases.map(disease => (
                  <div key={disease._id} className="profile-card disease-card">
                    <div className="profile-card-top">
                      <strong>{disease.name}</strong>
                      <span className={`disease-status-badge ${disease.status.toLowerCase()}`}>
                        {disease.status}
                      </span>
                    </div>
                    <div className="profile-card-row">
                      <span>📅 Diagnosed: {disease.diagnosed}</span>
                      <span>📊 {disease.lastResult}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Allergies Section */}
            {profile.allergies && profile.allergies.length > 0 && (
              <div className="profile-section allergies-section">
                <div className="profile-section-header">
                  <AlertCircle size={18} className="section-icon" />
                  <div>
                    <h3>Allergies</h3>
                    <p>Known drug and food allergies</p>
                  </div>
                </div>
                {profile.allergies.map((allergy, idx) => (
                  <div key={idx} className="allergy-card">
                    <div className="allergy-name">{allergy.name}</div>
                    <div className="allergy-details">
                      <span>Reaction: {allergy.reaction}</span>
                      <span className={`allergy-severity ${allergy.severity.toLowerCase()}`}>
                        {allergy.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current Medications Section */}
            <div className="profile-section">
              <div className="profile-section-header">
                <Pill size={18} className="section-icon" />
                <div>
                  <h3>Current Medications</h3>
                  <p>Active prescriptions and dosages</p>
                </div>
              </div>
              {!hasMedications ? (
                <p className="empty-state">No medications recorded</p>
              ) : (
                profile.medications.map(med => (
                  <div key={med._id} className="profile-card medication-card" onClick={() => handleViewMedication(med)}>
                    <div className="profile-card-top">
                      <strong>{med.name}</strong>
                      <span className="med-status-badge active">{med.status}</span>
                    </div>
                    <div className="profile-card-detail">💊 {med.dosage}</div>
                    <div className="profile-card-detail">🎯 {med.purpose}</div>
                    <div className="profile-card-detail muted">📅 Started: {med.started}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/*  REPORTS TAB  */}
        {activeTab === 'reports' && (
          <div className="profile-section">
            <div className="profile-section-header">
              <FileText size={18} className="section-icon" />
              <div>
                <h3>Psychiatric Reports</h3>
                <p>Clinical assessments, therapy notes, and mental health progress</p>
              </div>
            </div>
            {!hasReports ? (
              <p className="empty-state">No reports recorded</p>
            ) : (
              profile.reports.map(report => (
                <div key={report._id} className="profile-card report-card">
                  <div className="report-card-header">
                    <div>
                      <div className="report-label">Report Date</div>
                      <div className="visit-date">{report.date}</div>
                    </div>
                    <span className={`report-status-pill ${report.status.toLowerCase()}`}>
                      {report.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Clinic</span>
                    <span>{report.hospital}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Primary Diagnosis</span>
                    <span>{report.primaryDx}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Severity</span>
                    <span className={`severity-${report.severity.toLowerCase()}`}>
                      {report.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SCRIPTS TAB  */}
        {activeTab === 'scripts' && (
          <div className="profile-section">
            <div className="profile-section-header">
              <ScrollText size={18} className="section-icon" />
              <div>
                <h3>Prescriptions</h3>
                <p>Latest 3 prescriptions issued by Dr. Nimal Perera</p>
              </div>
            </div>
            {!hasScripts ? (
              <p className="empty-state">No prescriptions recorded</p>
            ) : (
              profile.scripts.slice(0, 3).map(script => (
                <div key={script._id} className="script-card" onClick={() => handleViewPrescription(script)}>
                  <div className="script-icon-box">
                    <FileText size={22} color="#e53935" />
                  </div>
                  <div className="script-info">
                    <div className="script-name">{script.fileName}</div>
                    <div className="script-detail">📋 {script.diagnosis}</div>
                    <div className="script-detail">💊 {script.medicationName} - {script.dosage}</div>
                    <div className="script-date">📅 {script.date}</div>
                  </div>
                  <button className="script-view-btn">View</button>
                </div>
              ))
            )}
            {hasScripts && profile.scripts.length > 3 && (
              <p className="more-scripts">+ {profile.scripts.length - 3} more prescriptions</p>
            )}
          </div>
        )}
      </div>

      {/* Prescription Dialog */}
      {showPrescriptionDialog && selectedPrescription && (
        <div className="dialog-overlay" onClick={closeDialogs}>
          <div className="dialog-container" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>📋 Prescription Details</h3>
              <button className="dialog-close" onClick={closeDialogs}>
                <X size={20} />
              </button>
            </div>
            <div className="dialog-content">
              <div className="prescription-header">
                <span className="prescription-badge">{selectedPrescription.fileName}</span>
                <span className={`severity-badge ${selectedPrescription.severity.toLowerCase()}`}>
                  {selectedPrescription.severity}
                </span>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <label>Patient:</label>
                  <span>{profile?.name}</span>
                </div>
                <div className="info-item">
                  <label>Date:</label>
                  <span>{selectedPrescription.date}</span>
                </div>
                <div className="info-item">
                  <label>Doctor:</label>
                  <span>{selectedPrescription.doctorName}</span>
                </div>
                <div className="info-item">
                  <label>Diagnosis:</label>
                  <span>{selectedPrescription.diagnosis}</span>
                </div>
              </div>
              <div className="medication-box">
                <h4>Prescribed Medication</h4>
                <div className="med-details">
                  <div><strong>Name:</strong> {selectedPrescription.medicationName}</div>
                  <div><strong>Dosage:</strong> {selectedPrescription.dosage}</div>
                  <div><strong>Frequency:</strong> {selectedPrescription.frequency}</div>
                  <div><strong>Duration:</strong> {selectedPrescription.duration}</div>
                </div>
              </div>
              <div className="notes-box">
                <h4>Additional Notes</h4>
                <p>{selectedPrescription.notes}</p>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="dialog-btn close-btn" onClick={closeDialogs}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Medication Detail Dialog */}
      {showMedicationDialog && selectedMedication && (
        <div className="dialog-overlay" onClick={closeDialogs}>
          <div className="dialog-container" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>💊 Medication Details</h3>
              <button className="dialog-close" onClick={closeDialogs}>
                <X size={20} />
              </button>
            </div>
            <div className="dialog-content">
              <div className="medication-header">
                <span className="medication-name-large">{selectedMedication.name}</span>
                <span className="med-status active">{selectedMedication.status}</span>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <label>Dosage:</label>
                  <span>{selectedMedication.dosage}</span>
                </div>
                <div className="info-item">
                  <label>Purpose:</label>
                  <span>{selectedMedication.purpose}</span>
                </div>
                <div className="info-item">
                  <label>Started:</label>
                  <span>{selectedMedication.started}</span>
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button className="dialog-btn close-btn" onClick={closeDialogs}>Close</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default PatientProfile;