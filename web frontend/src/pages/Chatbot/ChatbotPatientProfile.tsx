// src/pages/Chatbot/ChatbotPatientProfile.tsx
// Real data from MongoDB via chatApi.getPatientProfile(patientId)
// No hardcoded patient records — every field is sourced from the
// User + PatientHistory + Conversation collections.

import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import './ChatbotPatientProfile.css';
import { chatApi } from '../../types/api';
import type { PatientProfileData } from '../../types/api';

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

const COLORS = ['#2B52D4','#7C3AED','#059669','#DC2626','#0891B2','#D97706','#6B7280'];
const getColor   = (name: string) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length];
const getInitial = (name: string) => name?.[0]?.toUpperCase() ?? '?';

const fmtDate = (d: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return '—'; }
};

type TabKey = 'summary' | 'history' | 'clinical';

export default function ChatbotPatientProfile({
  patientId, onBack, onJumpToChat, onOpenBroadcast, onOpenAISettings, onOpenAnalytics,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [menuOpen, setMenuOpen]   = useState(false);
  const [profile,  setProfile]    = useState<PatientProfileData | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch real profile whenever the selected patient changes
  useEffect(() => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    chatApi.getPatientProfile(patientId)
      .then(setProfile)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load patient profile.'))
      .finally(() => setLoading(false));
  }, [patientId]);

  const handleMenuAction = (key: string) => {
    setMenuOpen(false);
    if (key === 'broadcast'   && onOpenBroadcast)  onOpenBroadcast();
    if (key === 'ai-settings' && onOpenAISettings) onOpenAISettings();
    if (key === 'analytics'   && onOpenAnalytics)  onOpenAnalytics();
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'summary',  label: 'Profile Summary' },
    { key: 'history',  label: 'Session History' },
    { key: 'clinical', label: 'Clinical Notes' },
  ];

  // ── Loading / error / empty states ─────────────────────────────
  if (loading) {
    return (
      <div className="cbp-layout">
        <div className="cbp-main-scroll">
          <div className="cb-card" style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
            Loading patient profile…
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="cbp-layout">
        <div className="cbp-main-scroll">
          <button className="cb-btn-back" onClick={onBack} style={{ marginBottom: 16 }}>Back</button>
          <div className="cb-card" style={{ padding: 40, textAlign: 'center', color: '#DC2626' }}>
            ⚠️ {error ?? 'Patient not found.'}
          </div>
        </div>
      </div>
    );
  }

  const { patient, sessionsCompleted, latestMood, latestMoodColor, latestNote, recentMeds, history, chat } = profile;
  const color   = getColor(patient.name);
  const initial = getInitial(patient.name);

  return (
    <div className="cbp-layout">
      {/* Main scroll area */}
      <div className="cbp-main-scroll">
        {/* Header banner */}
        <div className="cbp-header">
          <button className="cb-btn-back" onClick={onBack} style={{ marginRight: 4 }}>Back</button>
          <div className="cb-avatar" style={{ width: 56, height: 56, fontSize: 22, background: color }}>
            {initial}
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
            <div className="cbp-grid">
              {/* Profile Summary card */}
              <div className="cb-card">
                <div className="cb-card-title">Profile Summary</div>
                <div className="cbp-profile-row">
                  <div className="cb-avatar" style={{ width: 56, height: 56, fontSize: 22, background: color }}>
                    {initial}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{patient.name}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 2 }}>
                  <div><strong>Age:</strong> {patient.age ?? 'Not recorded'}</div>
                  <div><strong>Blood Type:</strong> {patient.bloodType || 'Not recorded'}</div>
                  <div><strong>Phone:</strong> {patient.phone || 'Not recorded'}</div>
                  <div><strong>Email:</strong> {patient.email}</div>
                  <div><strong>Registered:</strong> {fmtDate(patient.createdAt)}</div>
                </div>
              </div>

              {/* Session overview (real, from PatientHistory) */}
              <div className="cb-card">
                <div className="cb-card-title">Session Overview</div>
                <div className="cb-kv"><span className="cb-kk">Sessions Completed</span><span className="cb-kv-v">{sessionsCompleted}</span></div>
                <div className="cb-kv"><span className="cb-kk">Latest Mood</span>
                  <span className="cb-kv-v" style={{ color: latestMoodColor || '#374151' }}>{latestMood ?? 'No sessions yet'}</span>
                </div>
                <div className="cb-kv"><span className="cb-kk">Unread Messages</span><span className="cb-kv-v">{chat?.unreadCount ?? 0}</span></div>
                <div className="cb-kv"><span className="cb-kk">Last Message</span><span className="cb-kv-v">{fmtDate(chat?.lastMessageAt || '')}</span></div>
              </div>

              {/* Active Rx — real, from PatientHistory.medications */}
              <div className="cb-card">
                <div className="cb-card-title">Active / Recent Rx</div>
                {recentMeds.length === 0 && (
                  <div style={{ fontSize: 12.5, color: '#9CA3AF' }}>No medications recorded yet.</div>
                )}
                {recentMeds.map((med, i) => (
                  <div key={i} className="cbp-rx-card">
                    <div className="cbp-rx-name">{med.name} {med.dose || ''}</div>
                    <div className="cbp-rx-sub">
                      {med.frequency || 'As directed'}{med.withFood ? ` · ${med.withFood === 'Yes' ? 'with food' : 'without food'}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom card — Clinical Notes */}
            <div className="cbp-grid-2">
              <div className="cb-card">
                <div className="cb-card-title">Latest Clinical Note</div>
                <p className="cbp-note-text">{latestNote || 'No clinical notes recorded yet.'}</p>
              </div>

              <div className="cb-card">
                <div className="cb-card-title">Recent Sessions</div>
                {history.length === 0 && (
                  <div style={{ fontSize: 12.5, color: '#9CA3AF' }}>No past sessions recorded yet.</div>
                )}
                {history.map(h => (
                  <div key={h._id} className="cbp-journal-item">
                    <div className="cbp-journal-dot" style={{ background: h.moodColor }} />
                    <div>
                      <div className="cbp-journal-date">{fmtDate(h.date)}</div>
                      <div className="cbp-journal-title">{h.moodLabel} — {h.notes.slice(0, 60) || 'No notes'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Session History tab — full list */}
        {activeTab === 'history' && (
          <div className="cb-card">
            <div className="cb-card-title">Session History ({history.length})</div>
            {history.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                No sessions recorded for this patient yet.
              </div>
            )}
            {history.map(h => (
              <div key={h._id} style={{ borderBottom: '1px solid #F3F4F6', padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13 }}>{fmtDate(h.date)}</strong>
                  <span style={{ fontSize: 12, fontWeight: 700, color: h.moodColor }}>{h.moodLabel}</span>
                </div>
                <p style={{ fontSize: 12.5, color: '#374151', margin: 0 }}>{h.notes || 'No notes recorded.'}</p>
              </div>
            ))}
          </div>
        )}

        {/* Clinical Notes tab */}
        {activeTab === 'clinical' && (
          <div className="cb-card">
            <div className="cb-card-title">All Clinical Notes</div>
            {history.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                No clinical notes recorded for this patient yet.
              </div>
            )}
            {history.map(h => (
              <div key={h._id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 3 }}>{fmtDate(h.date)}</div>
                <p className="cbp-note-text">{h.notes || 'No notes recorded.'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right side panel */}
      <div className="cbp-side">
        <div className="cb-card" style={{ padding: 13 }}>
          <div className="cb-card-title" style={{ fontSize: 12, marginBottom: 9 }}>👤 Patient</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
            <div className="cb-avatar" style={{ width: 38, height: 38, fontSize: 13, background: color }}>{initial}</div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{patient.name}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{patient.age ? `${patient.age} yrs` : 'Age N/A'} · {patient.bloodType || 'N/A'}</div>
            </div>
          </div>
          <div className="cb-kv"><span className="cb-kk">Sessions</span><span className="cb-kv-v">{sessionsCompleted} complete</span></div>
          <div className="cb-kv"><span className="cb-kk">Active Rx</span><span className="cb-kv-v">{recentMeds.length} meds</span></div>
        </div>

        {recentMeds.length > 0 && (
          <div className="cb-card" style={{ padding: 13 }}>
            <div className="cb-card-title" style={{ fontSize: 12, marginBottom: 9 }}>💊 Active Rx</div>
            {recentMeds.map((med, i) => (
              <div key={i} style={{ background: '#EEF2FF', border: '1px solid #DBEAFE', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{med.name} {med.dose || ''}</div>
                <div style={{ fontSize: 10.5, color: '#6B7280' }}>{med.frequency || 'As directed'}</div>
              </div>
            ))}
          </div>
        )}

        <div
          className="cbp-jump-btn"
          onClick={() => onJumpToChat(patient._id)}
        >
          💬 Jump back to Chat
        </div>
      </div>
    </div>
  );
}
