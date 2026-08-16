// src/pages/Chatbot/ChatbotAnalytics.tsx  — Page 18
// Real data: GET /api/chat/analytics — every number here comes from MongoDB.

import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import './ChatbotAnalytics.css';
import { chatApi } from '../../types/api';
import type { AnalyticsData } from '../../types/api';

interface Props {
  onBack: () => void;
  onOpenBroadcast?:  () => void;
  onOpenAISettings?: () => void;
}

const MENU_ITEMS = [
  { icon: '📣', label: 'Message History', key: 'broadcast'   },
  { icon: '🤖', label: 'AI Bot Settings', key: 'ai-settings' },
];

export default function ChatbotAnalytics({ onBack, onOpenBroadcast, onOpenAISettings }: Props) {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [analytics, setAnalytics]   = useState<AnalyticsData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    chatApi.getAnalytics()
      .then(setAnalytics)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const handleMenuAction = (key: string) => {
    setMenuOpen(false);
    if (key === 'broadcast'   && onOpenBroadcast)  onOpenBroadcast();
    if (key === 'ai-settings' && onOpenAISettings) onOpenAISettings();
  };

  const dailyVolume = analytics?.dailyVolume ?? [];
  const topFAQs      = analytics?.topFAQs ?? [];
  const maxVol = Math.max(1, ...dailyVolume.map(d => d.count));
  const maxFaq = Math.max(1, ...topFAQs.map(f => f.count));

  return (
    <div className="cb-main">
      {/* Header */}
      <div className="cb-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="cb-btn-back" onClick={onBack}>Back</button>
          <div>
            <div className="cb-page-title">Analytics</div>
            <div className="cb-page-sub">Chatbot performance and message insights — live from your database</div>
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
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Stat cards — all real ── */}
      <div className="cban-stats-grid">
        <div className="cban-stat-card">
          <div className="cban-stat-label">TOTAL MESSAGES</div>
          <div className="cban-stat-num">{loading ? '…' : analytics?.totalMessages ?? 0}</div>
          <div className="cban-stat-trend neutral">{loading ? '' : `${analytics?.conversationCount ?? 0} conversations`}</div>
        </div>
        <div className="cban-stat-card">
          <div className="cban-stat-label">AI AUTO-REPLIED</div>
          <div className="cban-stat-num" style={{ color: '#2B52D4' }}>{loading ? '…' : analytics?.aiReplied ?? 0}</div>
          <div className="cban-stat-trend up">{loading ? '' : `${analytics?.botReplyPercent ?? 0}% of all replies`}</div>
        </div>
        <div className="cban-stat-card">
          <div className="cban-stat-label">FAQ REPLIED</div>
          <div className="cban-stat-num" style={{ color: '#0891B2' }}>{loading ? '…' : analytics?.faqReplied ?? 0}</div>
          <div className="cban-stat-trend neutral">Instant keyword matches</div>
        </div>
        <div className="cban-stat-card">
          <div className="cban-stat-label">DOCTOR RESPONSES</div>
          <div className="cban-stat-num">{loading ? '…' : analytics?.doctorReplied ?? 0}</div>
          <div className="cban-stat-trend neutral">{loading ? '' : `${analytics?.doctorReplyPercent ?? 0}% needed manual reply`}</div>
        </div>
        <div className="cban-stat-card">
          <div className="cban-stat-label">PATIENT MESSAGES</div>
          <div className="cban-stat-num" style={{ color: '#7C3AED' }}>{loading ? '…' : analytics?.patientMessages ?? 0}</div>
          <div className="cban-stat-trend neutral">Incoming from patients</div>
        </div>
        <div className="cban-stat-card">
          <div className="cban-stat-label">UNREAD</div>
          <div className="cban-stat-num" style={{ color: '#EF4444' }}>{loading ? '…' : analytics?.unreadCount ?? 0}</div>
          <div className="cban-stat-trend neutral">Awaiting your reply</div>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="cban-charts-row">

        {/* Daily Message Volume — real, last 7 days */}
        <div className="cb-card cban-chart-card">
          <div className="cb-card-title">📝 Daily Message Volume (Last 7 Days)</div>
          {loading && <div style={{ color: '#9CA3AF', fontSize: 12.5, padding: 16 }}>Loading…</div>}
          {!loading && (
            <div className="cban-bar-chart">
              {dailyVolume.map(d => (
                <div key={d.date} className="cban-bar-col">
                  <div className="cban-bar-wrap">
                    <div
                      className="cban-bar"
                      style={{ height: `${(d.count / maxVol) * 100}%` }}
                      title={`${d.count} messages`}
                    />
                  </div>
                  <div className="cban-bar-label">{d.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top FAQ Usage — real, from FAQ.usageCount */}
        <div className="cb-card cban-chart-card">
          <div className="cb-card-title">❓ Top FAQ Usage</div>
          {loading && <div style={{ color: '#9CA3AF', fontSize: 12.5, padding: 16 }}>Loading…</div>}
          {!loading && topFAQs.length === 0 && (
            <div style={{ color: '#9CA3AF', fontSize: 12.5, padding: 16 }}>No FAQ usage data yet.</div>
          )}
          {!loading && (
            <div className="cban-hbar-list">
              {topFAQs.map(f => (
                <div key={f.label} className="cban-hbar-row">
                  <div className="cban-hbar-label">{f.label}</div>
                  <div className="cban-hbar-track">
                    <div
                      className="cban-hbar-fill"
                      style={{ width: `${(f.count / maxFaq) * 100}%`, background: '#2B52D4' }}
                    />
                  </div>
                  <div className="cban-hbar-count">{f.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row — AI vs Doctor split (real) ── */}
      <div className="cban-charts-row">
        <div className="cb-card cban-chart-card">
          <div className="cb-card-title">🤖 AI vs Doctor Replies</div>
          {loading && <div style={{ color: '#9CA3AF', fontSize: 12.5, padding: 16 }}>Loading…</div>}
          {!loading && (
            <>
              <div className="cban-split-row">
                <div className="cban-split-num" style={{ color: '#2B52D4' }}>
                  {analytics?.botReplyPercent ?? 0}%
                  <div className="cban-split-sub">AI / FAQ Auto-Replied</div>
                </div>
                <div className="cban-split-num" style={{ color: '#374151' }}>
                  {analytics?.doctorReplyPercent ?? 0}%
                  <div className="cban-split-sub">Doctor Replied</div>
                </div>
              </div>
              <div className="cban-progress-bar">
                <div className="cban-progress-fill" style={{ width: `${analytics?.botReplyPercent ?? 0}%`, background: '#2B52D4' }} />
                <div className="cban-progress-fill" style={{ width: `${analytics?.doctorReplyPercent ?? 0}%`, background: '#E5E7EB' }} />
              </div>
            </>
          )}
        </div>

        <div className="cb-card cban-chart-card">
          <div className="cb-card-title">📣 Recent Broadcasts</div>
          {loading && <div style={{ color: '#9CA3AF', fontSize: 12.5, padding: 16 }}>Loading…</div>}
          {!loading && (!analytics?.recentBroadcasts || analytics.recentBroadcasts.length === 0) && (
            <div style={{ color: '#9CA3AF', fontSize: 12.5, padding: 16 }}>No broadcasts sent yet.</div>
          )}
          {!loading && analytics?.recentBroadcasts && (analytics.recentBroadcasts as { _id: string; message: string; recipients: string[]; sentAt: string }[]).map(b => (
            <div key={b._id} style={{ padding: '8px 0', borderBottom: '1px solid #F3F4F6', fontSize: 12.5 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{b.message.slice(0, 60)}</div>
              <div style={{ color: '#9CA3AF', fontSize: 11 }}>{b.recipients.length} recipients · {new Date(b.sentAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
