import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Star, Clock, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import Sidebar from '../components/DoctorPortalSidebar';
import './doctorDashboard.css';

interface DoctorProfile {
  name: string;
  specialty: string;
  totalPatients: number;
  sessionsThisMonth: number;
  rating: number;
}

interface TodaySlot {
  id: number;
  time: string;
  status: 'Available' | 'Booked';
  hospital: string;
}

interface PatientSummary {
  id: number;
  name: string;
  condition: string;
  lastVisit: string;
}

const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [todaySlots, setTodaySlots] = useState<TodaySlot[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 15) return 'Good Afternoon';
    if (hour < 18) return 'Good Evening';
    return 'Good Evening';
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [doctorResult, slotsResult, patientsResult] = await Promise.allSettled([
        api.getDoctorProfile(),
        api.getSlotsByDate(api.getTodayDate()),
        api.getAllPatients(),
      ]);

      if (doctorResult.status === 'fulfilled') setDoctor(doctorResult.value);
      if (slotsResult.status === 'fulfilled') setTodaySlots(slotsResult.value || []);
      if (patientsResult.status === 'fulfilled') setPatients((patientsResult.value || []).slice(0, 5));

      setLoading(false);
    };
    load();
  }, []);

  const bookedToday = todaySlots.filter((s) => s.status === 'Booked');

  return (
    <div className="doc-dash-page">
      <Sidebar />
      <div className="doc-dash-main">
        {loading ? (
          <div className="doc-dash-loading">Loading dashboard...</div>
        ) : (
          <>
            <div className="doc-dash-greeting">
              <p className="doc-dash-greeting-text">
                {getGreeting()}{doctor?.name ? `, ${doctor.name}` : ''}
              </p>
              {doctor?.specialty && <p className="doc-dash-title">{doctor.specialty}</p>}
            </div>

            <div className="doc-dash-stats-row">
              <div className="doc-dash-stat-card">
                <div className="doc-dash-stat-icon doc-dash-stat-blue"><Users size={22} /></div>
                <div>
                  <div className="doc-dash-stat-number">{doctor?.totalPatients ?? '—'}</div>
                  <div className="doc-dash-stat-label">Total Patients</div>
                </div>
              </div>
              <div className="doc-dash-stat-card">
                <div className="doc-dash-stat-icon doc-dash-stat-green"><Calendar size={22} /></div>
                <div>
                  <div className="doc-dash-stat-number">{doctor?.sessionsThisMonth ?? '—'}</div>
                  <div className="doc-dash-stat-label">Sessions This Month</div>
                </div>
              </div>
              <div className="doc-dash-stat-card">
                <div className="doc-dash-stat-icon doc-dash-stat-orange"><Clock size={22} /></div>
                <div>
                  <div className="doc-dash-stat-number">{bookedToday.length}</div>
                  <div className="doc-dash-stat-label">Sessions Today</div>
                </div>
              </div>
              <div className="doc-dash-stat-card">
                <div className="doc-dash-stat-icon doc-dash-stat-yellow"><Star size={22} /></div>
                <div>
                  <div className="doc-dash-stat-number">{doctor?.rating ?? '—'}</div>
                  <div className="doc-dash-stat-label">Patient Rating</div>
                </div>
              </div>
            </div>

            <div className="doc-dash-grid">
              <div className="doc-dash-panel">
                <div className="doc-dash-panel-header">
                  <h2>Today's Sessions</h2>
                  <button className="doc-dash-link-btn" onClick={() => navigate('/schedule')}>
                    Full Schedule <ArrowRight size={14} />
                  </button>
                </div>
                {bookedToday.length === 0 ? (
                  <p className="doc-dash-empty">No sessions scheduled for today.</p>
                ) : (
                  <div className="doc-dash-list">
                    {bookedToday.slice(0, 5).map((slot) => (
                      <div key={slot.id} className="doc-dash-list-row">
                        <span className="doc-dash-list-time">{slot.time}</span>
                        <span className="doc-dash-list-detail">{slot.hospital}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="doc-dash-panel">
                <div className="doc-dash-panel-header">
                  <h2>Recent Patients</h2>
                  <button className="doc-dash-link-btn" onClick={() => navigate('/patients')}>
                    All Patients <ArrowRight size={14} />
                  </button>
                </div>
                {patients.length === 0 ? (
                  <p className="doc-dash-empty">No patients on record.</p>
                ) : (
                  <div className="doc-dash-list">
                    {patients.map((p) => (
                      <div
                        key={p.id}
                        className="doc-dash-list-row doc-dash-list-row-clickable"
                        onClick={() => navigate(`/patients/${p.id}/profile`)}
                      >
                        <span className="doc-dash-list-time">{p.name}</span>
                        <span className="doc-dash-list-detail">{p.condition}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
