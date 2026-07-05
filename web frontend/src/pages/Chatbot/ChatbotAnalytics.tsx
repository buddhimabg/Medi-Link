// src/pages/Chatbot/ChatbotAnalytics.tsx  — Page 18
import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import './ChatbotAnalytics.css';

interface Props {
  onBack: () => void;
  onOpenBroadcast?:  () => void;
  onOpenAISettings?: () => void;
}

const MENU_ITEMS = [
  { icon: '📣', label: 'Message History', key: 'broadcast'   },
  { icon: '🤖', label: 'AI Bot Settings', key: 'ai-settings' },
];

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const msgVolume = [18, 26, 32, 24, 41, 38, 52];

const faqUsage = [
  { label: 'Medication SE',      count: 18, color: '#2B52D4' },
  { label: 'Appt reschedule',    count: 13, color: '#2B52D4' },
  { label: 'Anxiety treatment',  count: 10, color: '#22C55E' },
  { label: 'PCOS procedure',     count: 8,  color: '#F59E0B' },
  { label: 'App usage',          count: 5,  color: '#2B52D4' },
];

const satisfaction = [
  { label: 'Very helpful', count: 34, color: '#22C55E' },
  { label: 'Helpful',      count: 22, color: '#22C55E' },
  { label: 'Neutral',      count: 7,  color: '#F59E0B' },
  { label: 'Not helpful',  count: 3,  color: '#EF4444' },
];

const maxVol = Math.max(...msgVolume);
const maxFaq = Math.max(...faqUsage.map(f => f.count));
const maxSat = Math.max(...satisfaction.map(s => s.count));

type Range = 'This Week' | 'This Month' | 'Last 3 Months';

export default function ChatbotAnalytics({ onBack, onOpenBroadcast, onOpenAISettings }: Props) {
  const [range, setRange]     = useState<Range>('This Week');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
  };

  return (
    <div className="cb-main">
      {/* Header */}
      <div className="cb-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="cb-btn-back" onClick={onBack}>Back</button>
          <div>
            <div className="cb-page-title">Analytics</div>
            <div className="cb-page-sub">Chatbot performance and message insights</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Range selector */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['This Week', 'This Month', 'Last 3 Months'] as Range[]).map(r => (
              <button
                key={r}
                className={`cb-btn cb-btn-sm ${range === r ? 'cb-btn-primary' : 'cb-btn-light'}`}
                onClick={() => setRange(r)}
              >{r}</button>
            ))}
          </div>
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
      </div>

      {/* ── Stat cards ── */}
      <div className="cban-stats-grid">
        <div className="cban-stat-card">
          <div className="cban-stat-label">TOTAL MESSAGES</div>
          <div className="cban-stat-num">84</div>
          <div className="cban-stat-trend up">↑ 12% vs last week</div>
        </div>
        <div className="cban-stat-card">
          <div className="cban-stat-label">AI AUTO-REPLIED</div>
          <div className="cban-stat-num" style={{ color: '#2B52D4' }}>61</div>
          <div className="cban-stat-trend up">↑ 73% auto-handled</div>
        </div>
        <div className="cban-stat-card">
          <div className="cban-stat-label">DOCTOR RESPONSES</div>
          <div className="cban-stat-num">23</div>
          <div className="cban-stat-trend neutral">27% needed manual reply</div>
        </div>
        <div className="cban-stat-card">
          <div className="cban-stat-label">AVG RESPONSE TIME</div>
          <div className="cban-stat-num" style={{ color: '#22C55E' }}>1.8s</div>
          <div className="cban-stat-trend up">↓ 0.3s faster than last week</div>
        </div>
        <div className="cban-stat-card">
          <div className="cban-stat-label">AI ACCURACY RATE</div>
          <div className="cban-stat-num" style={{ color: '#22C55E' }}>94%</div>
          <div className="cban-stat-trend up">↑ 2% improvement</div>
        </div>
        <div className="cban-stat-card">
          <div className="cban-stat-label">ESCALATIONS</div>
          <div className="cban-stat-num" style={{ color: '#F59E0B' }}>3</div>
          <div className="cban-stat-trend down">↓ Triggered 3 manual takeovers</div>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="cban-charts-row">

        {/* Daily Message Volume */}
        <div className="cb-card cban-chart-card">
          <div className="cb-card-title">📝 Daily Message Volume</div>
          <div className="cban-bar-chart">
            {msgVolume.map((v, i) => (
              <div key={i} className="cban-bar-col">
                <div className="cban-bar-wrap">
                  <div
                    className="cban-bar"
                    style={{ height: `${(v / maxVol) * 100}%` }}
                    title={`${v} messages`}
                  />
                </div>
                <div className="cban-bar-label">{weekDays[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top FAQ Usage */}
        <div className="cb-card cban-chart-card">
          <div className="cb-card-title">❓ Top FAQ Usage</div>
          <div className="cban-hbar-list">
            {faqUsage.map(f => (
              <div key={f.label} className="cban-hbar-row">
                <div className="cban-hbar-label">{f.label}</div>
                <div className="cban-hbar-track">
                  <div
                    className="cban-hbar-fill"
                    style={{ width: `${(f.count / maxFaq) * 100}%`, background: f.color }}
                  />
                </div>
                <div className="cban-hbar-count">{f.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="cban-charts-row">

        {/* AI vs Doctor Replies */}
        <div className="cb-card cban-chart-card">
          <div className="cb-card-title">🤖 AI vs Doctor Replies</div>
          <div className="cban-split-row">
            <div className="cban-split-num" style={{ color: '#2B52D4' }}>73%<div className="cban-split-sub">AI Auto-Replied</div></div>
            <div className="cban-split-num" style={{ color: '#374151' }}>27%<div className="cban-split-sub">Doctor Replied</div></div>
          </div>
          <div className="cban-progress-bar">
            <div className="cban-progress-fill" style={{ width: '73%', background: '#2B52D4' }} />
            <div className="cban-progress-fill" style={{ width: '27%', background: '#E5E7EB' }} />
          </div>
        </div>

        {/* Patient Satisfaction */}
        <div className="cb-card cban-chart-card">
          <div className="cb-card-title">😊 Patient Satisfaction</div>
          <div className="cban-hbar-list">
            {satisfaction.map(s => (
              <div key={s.label} className="cban-hbar-row">
                <div className="cban-hbar-label">{s.label}</div>
                <div className="cban-hbar-track">
                  <div
                    className="cban-hbar-fill"
                    style={{ width: `${(s.count / maxSat) * 100}%`, background: s.color }}
                  />
                </div>
                <div className="cban-hbar-count">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}