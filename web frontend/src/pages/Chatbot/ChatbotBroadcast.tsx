// src/pages/Chatbot/ChatbotBroadcast.tsx
import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import './ChatbotBroadcast.css';

interface Props {
  onBack: () => void;
  onNewMessage: () => void;
  onOpenAISettings?: () => void;
  onOpenAnalytics?:  () => void;
}

const MENU_ITEMS = [
  { icon: '🤖', label: 'AI Bot Settings', key: 'ai-settings' },
  { icon: '📊', label: 'Analytics',       key: 'analytics'   },
];

const messages = [
  {
    id: '1', icon: '💊', iconBg: '#FEF3C7',
    title: 'Medicine Reminder — Priyanka J.',
    preview: 'Hello, just a quick reminder to take your [Sertraline 75mg] this afternoon with food.',
    tags: [
      { label: '✓ Delivered', cls: 'cbbr-tag-green' },
      { label: '📖 Read',     cls: 'cbbr-tag-blue'  },
    ],
    channels: 'App Push · SMS',
    time: 'Today, 2:15 PM',
    action: 'Resend',
  },
  {
    id: '2', icon: '📅', iconBg: '#DCFCE7',
    title: 'Appointment Reminder — Ravindra P.',
    preview: 'Reminder: Your next session with Dr. Dilshari is tomorrow at 10 AM. Please confirm your attendance.',
    tags: [
      { label: '✓ Delivered', cls: 'cbbr-tag-green' },
      { label: '⚠ Unread',   cls: 'cbbr-tag-amber' },
    ],
    channels: 'App Push',
    time: 'Yesterday, 6:00 PM',
    action: 'Resend',
  },
  {
    id: '3', icon: '📣', iconBg: '#EEF2FF',
    title: 'Broadcast — All Patients (7 recipients)',
    preview: 'Our clinic will be closed on Feb 22nd for a public holiday. Please reschedule if you have appointments.',
    tags: [
      { label: '✓ 7/7 Delivered', cls: 'cbbr-tag-green' },
      { label: '📖 5 Read',       cls: 'cbbr-tag-blue'  },
    ],
    channels: 'App Push · SMS · Email',
    time: 'Feb 20, 9:00 AM',
    action: 'Details',
  },
  {
    id: '4', icon: '💬', iconBg: '#F4F6FB',
    title: 'Generic Message — Kavindi G.',
    preview: 'Great progress this week! Keep following your mindfulness routine and journaling daily.',
    tags: [
      { label: '✓ Delivered', cls: 'cbbr-tag-green' },
      { label: '📖 Read',     cls: 'cbbr-tag-blue'  },
    ],
    channels: 'App Push',
    time: 'Feb 18, 4:30 PM',
    action: 'Resend',
  },
];

export default function ChatbotBroadcast({ onBack, onNewMessage, onOpenAISettings, onOpenAnalytics }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [timeFilter, setTimeFilter] = useState('This Week');
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
    if (key === 'ai-settings' && onOpenAISettings) onOpenAISettings();
    if (key === 'analytics'   && onOpenAnalytics)  onOpenAnalytics();
  };

  return (
    <div className="cb-main">
      <div className="cb-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="cb-btn-back" onClick={onBack}>Back</button>
          <div>
            <div className="cb-page-title">Broadcast &amp; Message History</div>
            <div className="cb-page-sub">Track all sent messages and broadcast campaigns</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
          <button className="cb-btn cb-btn-primary" onClick={onNewMessage}>+ New Message</button>
        </div>
      </div>

      {/* Stats */}
      <div className="cbbr-stats">
        <div className="cb-stat-card">
          <div className="cb-stat-icon" style={{ background: '#EEF2FF' }}>📤</div>
          <div>
            <div className="cb-stat-num" style={{ color: '#2B52D4' }}>24</div>
            <div className="cb-stat-label">Total Sent</div>
          </div>
        </div>
        <div className="cb-stat-card">
          <div className="cb-stat-icon" style={{ background: '#DCFCE7' }}>✅</div>
          <div>
            <div className="cb-stat-num" style={{ color: '#22C55E' }}>21</div>
            <div className="cb-stat-label">Delivered</div>
          </div>
        </div>
        <div className="cb-stat-card">
          <div className="cb-stat-icon" style={{ background: '#FEF3C7' }}>📖</div>
          <div>
            <div className="cb-stat-num" style={{ color: '#D97706' }}>18</div>
            <div className="cb-stat-label">Read</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="cbbr-filters">
        <div className="cbbr-search-wrap">
          <span className="cbbr-search-icon">🔍</span>
          <input
            className="cbbr-search"
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="cbbr-sel" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          {['All Types', 'Medicine Reminder', 'Appointment Reminder', 'Broadcast', 'Generic'].map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select className="cbbr-sel" value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
          {['This Week', 'This Month', 'Last 3 Months'].map(v => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* Message list */}
      {messages
        .filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
        .map(m => (
          <div key={m.id} className="cbbr-item">
            <div className="cbbr-icon-wrap" style={{ background: m.iconBg }}>{m.icon}</div>
            <div className="cbbr-item-body">
              <div className="cbbr-item-title">{m.title}</div>
              <div className="cbbr-item-preview">{m.preview}</div>
              <div className="cbbr-item-tags">
                {m.tags.map(t => (
                  <span key={t.label} className={`cbbr-tag ${t.cls}`}>{t.label}</span>
                ))}
                <span className="cbbr-tag cbbr-tag-gray">{m.channels}</span>
                <span className="cbbr-item-time">{m.time}</span>
              </div>
            </div>
            <button className="cb-btn cb-btn-light cb-btn-sm">{m.action}</button>
          </div>
        ))
      }
    </div>
  );
}
