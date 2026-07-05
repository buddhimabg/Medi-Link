// src/pages/Chatbot/ChatbotPatientProfile.tsx
import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import './ChatbotPatientProfile.css';

interface Props {
  patientId: string;
  onBack: () => void;
  onJumpToChat: (patientId: string) => void;
  onOpenBroadcast?:  () => void;
  onOpenAISettings?: () => void;
  onOpenAnalytics?:  () => void;
}

const MENU_ITEMS = [
  { icon: '📣', label: 'Message History',  key: 'broadcast'   },
  { icon: '🤖', label: 'AI Bot Settings',  key: 'ai-settings' },
  { icon: '📊', label: 'Analytics',        key: 'analytics'   },
];

const patientsData: Record<string, {
  id: string; initials: string; color: string;
  name: string; shortName: string; age: string; gender: string;
  blood: string; height: string; weight: string;
  condition: string; sessions: number; nextApt: string;
  meds: { name: string; dosage: string; freq: string; schedule: string }[];
  adherence: number;
  weekDoses: { day: string; taken: boolean; asNeeded?: boolean }[];
  diagnoses: string[];
  clinicalNote: string;
  journals: { date: string; title: string }[];
}> = {
  P1: {
    id: 'P1', initials: 'P', color: '#2B52D4',
    name: 'Priyanka Jayawardhana', shortName: 'Priyanka J.',
    age: '28', gender: 'F', blood: 'O+', height: '165cm', weight: '62kg',
    condition: 'GAD + MDD', sessions: 4, nextApt: 'Mar 6',
    meds: [
      { name: 'Sertraline', dosage: '75mg', freq: 'Once daily', schedule: 'with food' },
      { name: 'Lorazepam', dosage: '0.5mg', freq: 'As needed', schedule: 'as needed' },
    ],
    adherence: 88,
    weekDoses: [
      { day: 'Sun', taken: true },
      { day: 'Mon', taken: true },
      { day: 'Tue', taken: true },
      { day: 'Wed', taken: true, asNeeded: true },
      { day: 'Thu', taken: true, asNeeded: true },
      { day: 'Fri', taken: true, asNeeded: true },
      { day: 'Sat', taken: false },
    ],
    diagnoses: ['Generalized Anxiety Disorder (GAD)', 'Major Depressive Disorder (MDD)', 'PCOS'],
    clinicalNote: 'Last session: Yes, mild nausea, in the first weeks is normal. Try food insomnia. If especially in/et now and your dosage.',
    journals: [
      { date: '2 February 2023', title: 'Generalized Anxiety Disorder (GAD)' },
      { date: '10 January 2023', title: 'Major Depressive Disorder (MDD)' },
    ],
  },
  R1: {
    id: 'R1', initials: 'R', color: '#6B7280',
    name: 'Ravindra Perera', shortName: 'Ravindra P.',
    age: '35', gender: 'M', blood: 'A+', height: '172cm', weight: '78kg',
    condition: 'MDD', sessions: 2, nextApt: 'Mar 8',
    meds: [
      { name: 'Fluoxetine', dosage: '20mg', freq: 'Once daily', schedule: 'with food' },
    ],
    adherence: 74,
    weekDoses: [
      { day: 'Sun', taken: true },
      { day: 'Mon', taken: true },
      { day: 'Tue', taken: false },
      { day: 'Wed', taken: true },
      { day: 'Thu', taken: true },
      { day: 'Fri', taken: false },
      { day: 'Sat', taken: true },
    ],
    diagnoses: ['Major Depressive Disorder (MDD)'],
    clinicalNote: 'Patient reports low mood and sleep disturbances. Fluoxetine started 3 weeks ago. Monitor for improvement.',
    journals: [
      { date: '15 February 2023', title: 'Major Depressive Disorder (MDD)' },
    ],
  },
  K1: {
    id: 'K1', initials: 'K', color: '#7C3AED',
    name: 'Kavindi Gunawardana', shortName: 'Kavindi G.',
    age: '22', gender: 'F', blood: 'B+', height: '158cm', weight: '54kg',
    condition: 'Anxiety', sessions: 6, nextApt: 'Mar 10',
    meds: [
      { name: 'Escitalopram', dosage: '10mg', freq: 'Once daily', schedule: 'morning' },
    ],
    adherence: 95,
    weekDoses: [
      { day: 'Sun', taken: true },
      { day: 'Mon', taken: true },
      { day: 'Tue', taken: true },
      { day: 'Wed', taken: true },
      { day: 'Thu', taken: true },
      { day: 'Fri', taken: true },
      { day: 'Sat', taken: false },
    ],
    diagnoses: ['Generalized Anxiety Disorder (GAD)'],
    clinicalNote: 'Patient showing great progress. Anxiety levels reduced significantly. Continue current medication and breathing exercises.',
    journals: [
      { date: '20 February 2023', title: 'Anxiety Management Progress' },
      { date: '5 February 2023', title: 'Generalized Anxiety Disorder (GAD)' },
    ],
  },
  S1: {
    id: 'S1', initials: 'S', color: '#059669',
    name: 'Sudarshana Jayakodi', shortName: 'Sudarshana J.',
    age: '31', gender: 'M', blood: 'O-', height: '168cm', weight: '71kg',
    condition: 'GAD', sessions: 3, nextApt: 'Mar 7',
    meds: [
      { name: 'Sertraline', dosage: '50mg', freq: 'Once daily', schedule: 'with food' },
    ],
    adherence: 81,
    weekDoses: [
      { day: 'Sun', taken: true },
      { day: 'Mon', taken: false },
      { day: 'Tue', taken: true },
      { day: 'Wed', taken: true },
      { day: 'Thu', taken: false },
      { day: 'Fri', taken: true },
      { day: 'Sat', taken: true },
    ],
    diagnoses: ['Generalized Anxiety Disorder (GAD)'],
    clinicalNote: 'Patient started Sertraline 3 days ago. Reports increased anxiety — advised this is expected and temporary. Follow up in 2 weeks.',
    journals: [
      { date: '18 February 2023', title: 'Generalized Anxiety Disorder (GAD)' },
    ],
  },
};

type TabKey = 'summary' | 'history' | 'journals' | 'clinical';

export default function ChatbotPatientProfile({ patientId, onBack, onJumpToChat, onOpenBroadcast, onOpenAISettings, onOpenAnalytics }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [menuOpen, setMenuOpen]   = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const patient = patientsData[patientId] ?? patientsData['P1'];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMenuAction = (key: string) => {
    setMenuOpen(false);
    if (key === 'broadcast'   && onOpenBroadcast)  onOpenBroadcast();
    if (key === 'ai-settings' && onOpenAISettings) onOpenAISettings();
    if (key === 'analytics'   && onOpenAnalytics)  onOpenAnalytics();
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'summary',  label: 'Profile Summary' },
    { key: 'history',  label: 'Medical History' },
    { key: 'journals', label: 'Journal Entries' },
    { key: 'clinical', label: 'Clinical Documentation' },
  ];

  return (
    <div className="cbp-layout">
      {/* Main scroll area */}
      <div className="cbp-main-scroll">
        {/* Header banner */}
        <div className="cbp-header">
          <button className="cb-btn-back" onClick={onBack} style={{ marginRight: 4 }}>Back</button>
          <div className="cb-avatar" style={{ width: 56, height: 56, fontSize: 22, background: patient.color }}>
            {patient.initials}
          </div>
          <div className="cbp-header-title" style={{ flex: 1 }}>{patient.name} — Patient Profile</div>
          <div className="cb-menu-wrap" ref={menuRef}>
            <button className="cb-menu-btn" onClick={() => setMenuOpen(v => !v)} title="More options">⋯</button>
            {menuOpen && (
              <div className="cb-dropdown">
                {MENU_ITEMS.map(item => (
                  <button key={item.key} className="cb-dropdown-item" onClick={() => handleMenuAction(item.key)}>
                    <span className="cb-dropdown-icon">{item.icon}</span>{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="cbp-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`cbp-tab${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile Summary tab */}
        {activeTab === 'summary' && (
          <>
            {/* Top 3 cards */}
            <div className="cbp-grid">
              {/* Profile Summary card */}
              <div className="cb-card">
                <div className="cb-card-title">Profile Summary</div>
                <div className="cbp-profile-row">
                  <div className="cb-avatar" style={{ width: 56, height: 56, fontSize: 22, background: patient.color }}>
                    {patient.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{patient.name}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 2 }}>
                  <div><strong>Age:</strong> {patient.age}{patient.gender}</div>
                  <div><strong>Blood Type:</strong> {patient.blood}</div>
                  <div><strong>Height:</strong> {patient.height}</div>
                  <div><strong>Weight:</strong> {patient.weight}</div>
                </div>
              </div>

              {/* Primary Diagnoses */}
              <div className="cb-card">
                <div className="cb-card-title">Primary Diagnoses</div>
                <div className="cbp-diagnosis-tags">
                  {patient.diagnoses.map(d => (
                    <div key={d} className="cbp-diagnosis-tag">{d}</div>
                  ))}
                </div>
              </div>

              {/* Active Rx */}
              <div className="cb-card">
                <div className="cb-card-title">Active Rx</div>
                {patient.meds.map(med => (
                  <div key={med.name} className="cbp-rx-card">
                    <div className="cbp-rx-name">{med.name} {med.dosage}</div>
                    <div className="cbp-rx-sub">{med.freq} with food</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom 2 cards */}
            <div className="cbp-grid-2">
              {/* Medication Adherence */}
              <div className="cb-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div className="cb-card-title" style={{ marginBottom: 0 }}>Medication Adherence</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#2B52D4' }}>Current Adherence: {patient.adherence}%</div>
                </div>
                <div className="cbp-adherence-bar-wrap">
                  <div className="cbp-adherence-bar">
                    <div className="cbp-adherence-fill" style={{ width: `${patient.adherence}%` }} />
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: '#374151', marginTop: 8, marginBottom: 10 }}>
                  Current Adherence: {patient.adherence}%
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Last week Dose Completed:</div>
                <div className="cbp-week-row">
                  {patient.weekDoses.map(d => (
                    <div key={d.day} className="cbp-day-col">
                      <div
                        className="cbp-dose-dot"
                        style={{ background: d.taken ? '#DCFCE7' : '#F3F4F6' }}
                      >
                        {d.taken ? (d.asNeeded ? '🔵' : '🟢') : '⬜'}
                      </div>
                      <div className="cbp-day-label">{d.day}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom right: Clinical Notes + Journal Activity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="cb-card">
                  <div className="cb-card-title">Clinical Notes</div>
                  <p className="cbp-note-text">{patient.clinicalNote}</p>
                  <span className="cbp-read-more" style={{ marginTop: 8, display: 'block' }}>Read more</span>
                </div>

                <div className="cb-card">
                  <div className="cb-card-title">Journal Activity</div>
                  {patient.journals.map(j => (
                    <div key={j.title} className="cbp-journal-item">
                      <div className="cbp-journal-dot" />
                      <div>
                        <div className="cbp-journal-date">{j.date}</div>
                        <div className="cbp-journal-title">{j.title}</div>
                      </div>
                      <span className="cbp-journal-arrow">›</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Placeholder tabs */}
        {activeTab !== 'summary' && (
          <div className="cb-card" style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {tabs.find(t => t.key === activeTab)?.label} — Coming soon
            </div>
          </div>
        )}
      </div>

      {/* Right side panel */}
      <div className="cbp-side">
        <div className="cb-card" style={{ padding: 13 }}>
          <div className="cb-card-title" style={{ fontSize: 12, marginBottom: 9 }}>👤 Patient</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
            <div className="cb-avatar" style={{ width: 38, height: 38, fontSize: 13, background: patient.color }}>{patient.initials}</div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{patient.shortName}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{patient.age}{patient.gender} · {patient.condition}</div>
            </div>
          </div>
          <div className="cb-kv"><span className="cb-kk">Next Apt</span><span className="cb-kv-v" style={{ color: '#2B52D4' }}>{patient.nextApt}</span></div>
          <div className="cb-kv"><span className="cb-kk">Sessions</span><span className="cb-kv-v">{patient.sessions} sessions complete</span></div>
          <div className="cb-kv"><span className="cb-kk">Active Rx</span><span className="cb-kv-v">{patient.meds.length} meds</span></div>
        </div>

        <div className="cb-card" style={{ padding: 13 }}>
          <div className="cb-card-title" style={{ fontSize: 12, marginBottom: 9 }}>💊 Active Rx</div>
          {patient.meds.map(med => (
            <div key={med.name} style={{ background: '#EEF2FF', border: '1px solid #DBEAFE', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{med.name} {med.dosage}</div>
              <div style={{ fontSize: 10.5, color: '#6B7280' }}>Once daily with food</div>
            </div>
          ))}
        </div>

        <div
          className="cbp-jump-btn"
          onClick={() => onJumpToChat(patient.id)}
        >
          💬 Jump back to Chat
        </div>
      </div>
    </div>
  );
}