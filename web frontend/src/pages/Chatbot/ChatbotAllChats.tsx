// src/pages/Chatbot/ChatbotAllChats.tsx — Page 2
// Real data from MongoDB via chatApi.getConversations() + chatApi.getAnalytics()

import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import './ChatbotAllChats.css';
import { chatApi } from '../../types/api';
import type { ConversationRecord, AnalyticsData } from '../../types/api';

interface Props {
  onNewMessage:     () => void;
  onOpenChat:       (patientId: string, conversationId: string) => void;
  onOpenBroadcast:  () => void;
  onOpenAISettings: () => void;
  onOpenAnalytics:  () => void;
  onBack:           () => void;
}

const MENU_ITEMS = [
  { icon: '📣', label: 'Message History', key: 'broadcast'   },
  { icon: '🤖', label: 'AI Bot Settings', key: 'ai-settings' },
  { icon: '📊', label: 'Analytics',       key: 'analytics'   },
];

const COLORS = ['#2B52D4','#7C3AED','#059669','#DC2626','#0891B2','#D97706','#6B7280'];
const getColor   = (name: string) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length];
const getInitial = (name: string) => name?.[0]?.toUpperCase() ?? '?';
const timeAgo    = (d: string): string => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

export default function ChatbotAllChats({
  onNewMessage, onOpenChat, onOpenBroadcast, onOpenAISettings, onOpenAnalytics, onBack,
}: Props) {
  const [search,    setSearch]    = useState('');
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [convs,     setConvs]     = useState<ConversationRecord[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [convData, analyticsData] = await Promise.all([
          chatApi.getConversations(),
          chatApi.getAnalytics(),
        ]);
        setConvs(convData);
        setAnalytics(analyticsData);
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
    if (key === 'broadcast')   onOpenBroadcast();
    if (key === 'ai-settings') onOpenAISettings();
    if (key === 'analytics')   onOpenAnalytics();
  };

  const filtered = convs.filter(c =>
    c.patient?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Exact backend field names
  const totalMessages = analytics?.totalMessages ?? convs.length;
  const unreadCount   = analytics?.unreadCount   ?? convs.reduce((s, c) => s + c.unreadCount, 0);
  const aiReplied     = analytics?.aiReplied     ?? 0;
  const faqReplied    = analytics?.faqReplied    ?? 0;
  const topFAQs       = analytics?.topFAQs       ?? [];
  const maxFAQ        = topFAQs[0]?.count        ?? 1;

  return (
    <div className="cb-main">

      {/* Header */}
      <div className="cb-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="cb-btn-back" onClick={onBack}>Back</button>
          <div>
            <div className="cb-page-title">All Patient Chats</div>
            <div className="cb-page-sub">Manage messages, AI replies and FAQ support</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="cbac-menu-wrap" ref={menuRef}>
            <button className="cb-btn cb-btn-light cb-btn-sm" onClick={() => setMenuOpen(v => !v)}>⋯</button>
            {menuOpen && (
              <div className="cbac-dropdown">
                {MENU_ITEMS.map(item => (
                  <button key={item.key} className="cbac-dropdown-item" onClick={() => handleMenuAction(item.key)}>
                    <span className="cbac-dropdown-icon">{item.icon}</span>{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="cb-btn cb-btn-primary" onClick={onNewMessage}>+ New Message</button>
        </div>
      </div>

      {/* Stats — real DB data */}
      <div className="cb-stats-grid" style={{ marginBottom: 20 }}>
        {[
          { icon: '💬', bg: '#EEF2FF', color: '#2B52D4', val: loading ? '…' : totalMessages, label: 'Total Messages' },
          { icon: '🔴', bg: '#FEE2E2', color: '#EF4444', val: loading ? '…' : unreadCount,   label: 'Unread'         },
          { icon: '🤖', bg: '#DCFCE7', color: '#22C55E', val: loading ? '…' : aiReplied,     label: 'AI Auto-Replied'},
          { icon: '❓', bg: '#FEF3C7', color: '#D97706', val: loading ? '…' : faqReplied,    label: 'FAQ Queries'    },
        ].map((s, i) => (
          <div key={i} className="cb-stat-card">
            <div className="cb-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="cb-stat-num" style={{ color: s.color }}>{s.val}</div>
              <div className="cb-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#FEE2E2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Two column layout */}
      <div className="cbac-grid">

        {/* Left — real conversation list */}
        <div className="cb-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="cbac-list-header">
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Patient Chats <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: 12 }}>({filtered.length})</span>
            </div>
            <div className="cb-search-wrap" style={{ width: 220 }}>
              <span className="cb-search-icon">🔍</span>
              <input type="text" placeholder="Search patient chats..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="cbac-list-body">
            {loading && <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading conversations...</div>}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                {search ? 'No patients found.' : 'No conversations yet. Click New Message!'}
              </div>
            )}
            {!loading && filtered.map(conv => {
              const name    = conv.patient?.name ?? 'Unknown Patient';
              const initial = getInitial(name);
              const color   = getColor(name);
              const unread  = conv.unreadCount ?? 0;
              return (
                <div key={conv._id} className="cbac-patient-row" onClick={() => onOpenChat(conv.patientId, conv._id)}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div className="cb-avatar" style={{ width: 40, height: 40, fontSize: 14, background: color }}>{initial}</div>
                    {unread > 0 && <div className="cbac-online-dot" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.lastSenderRole === 'doctor' ? '🩺 You: ' : conv.lastSenderRole === 'bot' ? '🤖 AI: ' : ''}
                      {conv.lastMessage || 'No messages yet'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{timeAgo(conv.lastMessageAt)}</span>
                    {unread > 0 && <div className="cb-ubadge">{unread}</div>}
                    <span style={{ color: '#9CA3AF', fontSize: 16 }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — AI Status + Top FAQs from DB */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="cb-card">
            <div className="cb-card-title">🤖 AI Bot Status</div>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 9, padding: 12, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
              <div style={{ width: 9, height: 9, background: '#22C55E', borderRadius: '50%', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>AI Bot Active</div>
                <div style={{ fontSize: 11.5, color: '#6B7280' }}>Auto-replying to patient queries</div>
              </div>
            </div>
            <div className="cb-kv"><span className="cb-kk">AI Replies</span><span className="cb-kv-v" style={{ color: '#22C55E' }}>{loading ? '…' : aiReplied}</span></div>
            <div className="cb-kv"><span className="cb-kk">FAQ Queries</span><span className="cb-kv-v">{loading ? '…' : faqReplied}</span></div>
            <div className="cb-kv"><span className="cb-kk">Conversations</span><span className="cb-kv-v">{loading ? '…' : convs.length}</span></div>
          </div>

          <div className="cb-card">
            <div className="cb-card-title">❓ Top FAQ Topics</div>
            {loading && <div style={{ color: '#9CA3AF', fontSize: 12 }}>Loading...</div>}
            {!loading && topFAQs.length === 0 && <div style={{ color: '#9CA3AF', fontSize: 12 }}>No FAQ usage data yet.</div>}
            {!loading && topFAQs.slice(0, 4).map((faq, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{faq.label}</span>
                  <strong style={{ color: '#2B52D4' }}>{faq.count}×</strong>
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