// src/pages/Chatbot/Chatbotdashboard.tsx
// Real data from MongoDB via chatApi.getConversations() + chatApi.getAnalytics()

import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import './Chatbotdashboard.css';
import { chatApi } from '../../types/api';
import type { ConversationRecord, AnalyticsData } from '../../types/api';

interface Props {
  onViewAllMessages:  () => void;
  onOpenChat:         (patientId: string, convId: string) => void;
  onNewMessage:       () => void;
  onOpenBroadcast?:   () => void;
  onOpenAISettings?:  () => void;
  onOpenAnalytics?:   () => void;
}

const MENU_ITEMS = [
  { icon: '📣', label: 'Message History', key: 'broadcast'   },
  { icon: '🤖', label: 'AI Bot Settings', key: 'ai-settings' },
  { icon: '📊', label: 'Analytics',       key: 'analytics'   },
];

const COLORS = ['#2B52D4','#7C3AED','#059669','#DC2626','#0891B2','#D97706','#6B7280'];
const getColor   = (name: string) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length];
const getInitial = (name: string) => name?.[0]?.toUpperCase() ?? '?';
const timeAgo    = (d: string) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

// ── Fetch recent messages from /api/chat/recent-messages ────────────────────
// Shape returned by chatController.getRecentMessages
interface RecentMessage {
  conversationId:  string;
  patientId:       string;
  patientName:     string;
  patientEmail:    string;
  patientAvatar:   string | null;
  lastMessage:     string;
  lastSenderRole:  'doctor' | 'patient' | 'bot';
  lastMessageType: 'normal' | 'ai-auto' | 'faq';
  isRead:          boolean;
  unreadCount:     number;
  lastMessageAt:   string;
}

export default function ChatbotDashboard({
  onViewAllMessages, onOpenChat, onNewMessage,
  onOpenBroadcast, onOpenAISettings, onOpenAnalytics,
}: Props) {
  const [menuOpen,        setMenuOpen]        = useState(false);
  const [convs,           setConvs]           = useState<ConversationRecord[]>([]);
  const [recentMessages,  setRecentMessages]  = useState<RecentMessage[]>([]);
  const [analytics,       setAnalytics]       = useState<AnalyticsData | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Load all dashboard data ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';

        // Fetch conversations + analytics in parallel (existing chatApi calls)
        const [convData, analyticsData] = await Promise.all([
          chatApi.getConversations(),
          chatApi.getAnalytics(),
        ]);

        // Sort conversations newest first
        setConvs([...convData].sort((a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        ));
        setAnalytics(analyticsData);

        // ── ALSO fetch recent messages from the new endpoint ────────────────
        // This gives richer per-message data (senderRole, isRead, etc.)
        const res = await fetch('/api/chat/recent-messages?limit=5', {
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.messages)) {
            setRecentMessages(json.messages);
          }
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleMenuAction = (key: string) => {
    setMenuOpen(false);
    if (key === 'broadcast'   && onOpenBroadcast)  onOpenBroadcast();
    if (key === 'ai-settings' && onOpenAISettings) onOpenAISettings();
    if (key === 'analytics'   && onOpenAnalytics)  onOpenAnalytics();
  };

  // ── Stat values ────────────────────────────────────────────────────────────
  const totalMessages = analytics?.totalMessages ?? 0;
  const unreadCount   = analytics?.unreadCount   ?? convs.reduce((s, c) => s + c.unreadCount, 0);
  const aiReplied     = analytics?.aiReplied     ?? 0;
  const faqReplied    = analytics?.faqReplied    ?? 0;
  const topFAQs       = analytics?.topFAQs       ?? [];
  const maxFAQ        = topFAQs[0]?.count        ?? 1;

  // ── Use recentMessages if available, else fall back to convs ──────────────
  const hasRecentMessages = recentMessages.length > 0;

  // Sender role icon helper
  const roleIcon = (role: string) => {
    if (role === 'bot')    return '🤖 ';
    if (role === 'doctor') return '🩺 ';
    return '';
  };

  return (
    <div className="cb-main">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="cb-page-header">
        <div>
          <div className="cb-page-title">Patient Chatbot</div>
          <div className="cb-page-sub">Manage messages, AI replies and FAQ support</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="cb-menu-wrap" ref={menuRef}>
            <button className="cb-menu-btn" onClick={() => setMenuOpen(v => !v)}>⋯</button>
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

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: '#FEE2E2', border: '1.5px solid #FECACA',
          borderRadius: 10, padding: '12px 16px',
          color: '#DC2626', fontSize: 13, marginBottom: 16,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Stats — all from real DB ───────────────────────────────────────── */}
      <div className="cb-stats-grid">
        {[
          { icon: '💬', bg: '#EEF2FF', color: '#2B52D4', val: loading ? '…' : totalMessages, label: 'Total Messages'  },
          { icon: '🔴', bg: '#FEE2E2', color: '#EF4444', val: loading ? '…' : unreadCount,   label: 'Unread'          },
          { icon: '🤖', bg: '#DCFCE7', color: '#22C55E', val: loading ? '…' : aiReplied,     label: 'AI Auto-Replied' },
          { icon: '❓', bg: '#FEF3C7', color: '#D97706', val: loading ? '…' : faqReplied,    label: 'FAQ Queries'     },
        ].map((s, i) => (
          <div key={i} className="cb-stat-card" onClick={onViewAllMessages} style={{ cursor: 'pointer' }}>
            <div className="cb-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="cb-stat-num" style={{ color: s.color }}>{s.val}</div>
              <div className="cb-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom grid ────────────────────────────────────────────────────── */}
      <div className="cbd-grid-bottom">

        {/* ── Recent Patient Messages ───────────────────────────────────────── */}
        <div className="cb-card">
          <div className="cb-card-title">👥 Recent Patient Messages</div>

          {/* Loading state */}
          {loading && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              Loading...
            </div>
          )}

          {/* Empty state */}
          {!loading && !hasRecentMessages && convs.length === 0 && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              No conversations yet.
            </div>
          )}

          {/* ── RECENT MESSAGES from /api/chat/recent-messages ─────────────── */}
          {!loading && hasRecentMessages && recentMessages.map(msg => {
            const name      = msg.patientName || 'Unknown Patient';
            const initial   = getInitial(name);
            const color     = getColor(name);
            const shortName = name.includes(' ')
              ? `${name.split(' ')[0]} ${name.split(' ')[1][0]}.`
              : name;

            return (
              <div
                key={msg.conversationId}
                className="cbd-patient-row"
                onClick={() => onOpenChat(msg.patientId, msg.conversationId)}
                style={{ cursor: 'pointer' }}
              >
                {/* Avatar */}
                {msg.patientAvatar ? (
                  <img
                    src={msg.patientAvatar}
                    alt={name}
                    style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div className="cb-avatar" style={{ width: 38, height: 38, fontSize: 13, background: color }}>
                    {initial}
                  </div>
                )}

                {/* Patient info + last message */}
                <div className="cbd-patient-info">
                  <div className="cbd-patient-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {shortName}
                    {/* FAQ / AI badge */}
                    {msg.lastMessageType === 'ai-auto' && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: '#7C3AED',
                        background: '#F3E8FF', borderRadius: 4, padding: '1px 5px',
                      }}>AI</span>
                    )}
                    {msg.lastMessageType === 'faq' && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: '#0891B2',
                        background: '#E0F2FE', borderRadius: 4, padding: '1px 5px',
                      }}>FAQ</span>
                    )}
                  </div>
                  <div className="cbd-patient-preview">
                    {roleIcon(msg.lastSenderRole)}
                    {msg.lastMessage || 'No messages yet'}
                  </div>
                </div>

                {/* Time + unread badge */}
                <div className="cbd-patient-meta">
                  <div className="cbd-time">{timeAgo(msg.lastMessageAt)}</div>
                  {msg.unreadCount > 0 && (
                    <div className="cb-ubadge">{msg.unreadCount}</div>
                  )}
                  {/* Unread dot if message itself is unread */}
                  {!msg.isRead && msg.unreadCount === 0 && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#2B52D4', marginTop: 4,
                    }} />
                  )}
                </div>
              </div>
            );
          })}

          {/* ── FALLBACK: use convs if recentMessages is empty ──────────────── */}
          {!loading && !hasRecentMessages && convs.slice(0, 5).map(conv => {
            const name      = conv.patient?.name ?? 'Unknown Patient';
            const initial   = getInitial(name);
            const color     = getColor(name);
            const shortName = name.includes(' ')
              ? `${name.split(' ')[0]} ${name.split(' ')[1][0]}.`
              : name;

            return (
              <div key={conv._id} className="cbd-patient-row" onClick={() => onOpenChat(conv.patientId, conv._id)}>
                <div className="cb-avatar" style={{ width: 38, height: 38, fontSize: 13, background: color }}>
                  {initial}
                </div>
                <div className="cbd-patient-info">
                  <div className="cbd-patient-name">{shortName}</div>
                  <div className="cbd-patient-preview">
                    {conv.lastSenderRole === 'bot'    ? '🤖 ' :
                     conv.lastSenderRole === 'doctor' ? '🩺 ' : ''}
                    {conv.lastMessage || 'No messages yet'}
                  </div>
                </div>
                <div className="cbd-patient-meta">
                  <div className="cbd-time">{timeAgo(conv.lastMessageAt)}</div>
                  {conv.unreadCount > 0 && <div className="cb-ubadge">{conv.unreadCount}</div>}
                </div>
              </div>
            );
          })}

          <button
            className="cb-btn cb-btn-outline cb-btn-sm cb-btn-full"
            style={{ marginTop: 14 }}
            onClick={onViewAllMessages}
          >
            View All Messages
          </button>
        </div>

        {/* ── Right column ──────────────────────────────────────────────────── */}
        <div className="cbd-right-col">

          {/* AI Bot Status */}
          <div className="cb-card">
            <div className="cb-card-title" style={{ fontSize: 13 }}>🤖 AI Bot Status</div>
            <div className="cbd-bot-active">
              <div style={{ width: 9, height: 9, background: '#22C55E', borderRadius: '50%', flexShrink: 0 }} />
              <div>
                <div className="cbd-bot-status-name">AI Bot Active</div>
                <div className="cbd-bot-status-sub">Auto-replying to patient queries</div>
              </div>
            </div>
            <div className="cb-kv">
              <span className="cb-kk">AI Replies</span>
              <span className="cb-kv-v" style={{ color: '#22C55E' }}>{loading ? '…' : aiReplied}</span>
            </div>
            <div className="cb-kv">
              <span className="cb-kk">FAQ Queries</span>
              <span className="cb-kv-v">{loading ? '…' : faqReplied}</span>
            </div>
            <div className="cb-kv">
              <span className="cb-kk">Conversations</span>
              <span className="cb-kv-v">{loading ? '…' : convs.length}</span>
            </div>
          </div>

          {/* Top FAQ Topics from DB */}
          <div className="cb-card">
            <div className="cb-card-title" style={{ fontSize: 13 }}>❓ Top FAQ Topics</div>
            {loading && <div style={{ color: '#9CA3AF', fontSize: 12 }}>Loading...</div>}
            {!loading && topFAQs.length === 0 && (
              <div style={{ color: '#9CA3AF', fontSize: 12 }}>No FAQ usage data yet.</div>
            )}
            {!loading && topFAQs.slice(0, 4).map((faq, i) => (
              <div key={i} className="cbd-faq-row">
                <div className="cbd-faq-label">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '78%' }}>
                    {faq.label}
                  </span>
                  <strong className="cbd-faq-count">{faq.count}×</strong>
                </div>
                <div className="cb-progbar">
                  <div className="cb-progfill" style={{ width: `${(faq.count / maxFAQ) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}