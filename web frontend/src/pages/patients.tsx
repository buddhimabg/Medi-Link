import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './patients.css';

//  PATIENT DATA STRUCTURE 
interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  lastVisit: string;
  condition?: 'mild' | 'critical';  // Optional - defaults to mild
}

// Filter types for stats cards
type FilterType = 'all' | 'mild' | 'critical';

//  MAIN PATIENTS COMPONENT 
const Patients: React.FC = () => {
  const navigate = useNavigate();              // For navigating to patient profile
  const [patients, setPatients] = useState<Patient[]>([]);    // All patients from DB
  const [loading, setLoading] = useState(true);               // Show loading spinner
  const [searchQuery, setSearchQuery] = useState('');         // Search input value
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');  // Current filter

  //  FETCH PATIENTS FROM DATABASE 
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await api.getAllPatients();  // API call to backend
        setPatients(data);
      } catch (error) {
        console.error('Failed to fetch patients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  //STATS CALCULATIONS 
  const totalPatients = patients.length;
  const mildPatients = patients.filter(p => p.condition === 'mild' || !p.condition).length;
  const criticalPatients = patients.filter(p => p.condition === 'critical').length;

  // FILTER LOGIC 
  // Combines search query and condition filter
  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'mild' && (p.condition === 'mild' || !p.condition)) ||
      (activeFilter === 'critical' && p.condition === 'critical');
    return matchesSearch && matchesFilter;
  });

  //  NAVIGATION 
  // Go to patient profile page
  const handleViewPatient = (patient: Patient) => {
    navigate(`/patients/${patient.id}/profile`);
  };

  // HELPER FUNCTIONS 
  // Get first 2 letters of name for avatar
  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // LOADING STATE 
  if (loading) {
    return (
      <div className="patients-container">
        <div className="loading-state">Loading patients...</div>
      </div>
    );
  }

  //  RENDER - FIXED with return statement
  return (
    <div className="patients-container">
      <div className="patients-content">

        {/*  STATS CARDS  */}
        {/* Clicking these filters the patient list */}
        <div className="stats-row">
          {/* Total Patients Card */}
          <div
            className={`stat-card stat-card-total ${activeFilter === 'all' ? 'stat-card-active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <div className="stat-indicator stat-indicator-blue"></div>
            <div className="stat-info">
              <div className="stat-number">{totalPatients}</div>
              <div className="stat-label">Total Patients</div>
            </div>
          </div>

          {/* Mild Patients Card */}
          <div
            className={`stat-card stat-card-mild ${activeFilter === 'mild' ? 'stat-card-active' : ''}`}
            onClick={() => setActiveFilter('mild')}
          >
            <div className="stat-indicator stat-indicator-green"></div>
            <div className="stat-info">
              <div className="stat-number">{mildPatients}</div>
              <div className="stat-label">Mild Patients</div>
            </div>
          </div>

          {/* Critical Patients Card */}
          <div
            className={`stat-card stat-card-critical ${activeFilter === 'critical' ? 'stat-card-active' : ''}`}
            onClick={() => setActiveFilter('critical')}
          >
            <div className="stat-indicator stat-indicator-red"></div>
            <div className="stat-info">
              <div className="stat-number">{criticalPatients}</div>
              <div className="stat-label">Critical Patients</div>
            </div>
          </div>
        </div>

        {/*  SEARCH BAR */}
        {/* Filter patients by name */}
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search Patient..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {/* Clear button appears only when search has text */}
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>

        {/*  PATIENT LIST  */}
        <div className="patient-list">
          {filteredPatients.length === 0 ? (
            <div className="no-patients">No patients found</div>
          ) : (
            filteredPatients.map(patient => (
              // Click anywhere on row to view patient profile
              <div
                key={patient.id}
                className="patient-row"
                onClick={() => handleViewPatient(patient)}
              >
                {/* Avatar with initials */}
                <div className="patient-avatar">
                  {getInitials(patient.name)}
                </div>
                
                {/* Patient details */}
                <div className="patient-row-info">
                  <div className="patient-row-name">{patient.name}</div>
                  <div className="patient-row-meta">
                    {patient.age} yrs · {patient.gender} · Last visit: {patient.lastVisit}
                  </div>
                </div>
                
                {/* Condition badge */}
                {patient.condition === 'critical' && (
                  <span className="condition-badge condition-critical">Critical</span>
                )}
                {(patient.condition === 'mild' || !patient.condition) && (
                  <span className="condition-badge condition-mild">Mild</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Patients;