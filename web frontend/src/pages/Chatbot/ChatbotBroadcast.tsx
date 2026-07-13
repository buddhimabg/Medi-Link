// src/pages/Chatbot/ChatbotBroadcast.tsx
// Real data: GET /api/chat/broadcast (history) + POST /api/chat/broadcast (send new)

import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import './ChatbotBroadcast.css';
import { chatApi } from '../../types/api';
import type { BroadcastRecord, PatientRecord } from '../../types/api';

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

const fmtDateTime = (d: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch { return '—'; }
};

export default function ChatbotBroadcast({ onBack, onNewMessage, onOpenAISettings, onOpenAnalytics }: Props) {
  const [search, setSearch]         = useState('');
  const [menuOpen, setMenuOpen]     = useState(false);
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Compose modal state ──────────────────────────────────────
  const [composeOpen, setComposeOpen] = useState(false);
  const [patients, setPatients]       = useState<PatientRecord[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage]         = useState('');
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadBroadcasts = () => {
    setLoading(true);
    setError(null);
    chatApi.getBroadcasts()
      .then(setBroadcasts)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load broadcast history.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBroadcasts(); }, []);

  const handleMenuAction = (key: string) => {
    setMenuOpen(false);
    if (key === 'ai-settings' && onOpenAISettings) onOpenAISettings();
    if (key === 'analytics'   && onOpenAnalytics)  onOpenAnalytics();
  };

  const openCompose = () => {
    setComposeOpen(true);
    setSelectedIds(new Set());
    setMessage('');
    setSendError(null);
    if (patients.length === 0) {
      setPatientsLoading(true);
      chatApi.getPatients()
        .then(setPatients)
        .catch(() => setPatients([]))
        .finally(() => setPatientsLoading(false));
    }
  };

  const togglePatient = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.size === patients.length ? new Set() : new Set(patients.map(p => p._id))
    );
  };

  const handleSendBroadcast = async () => {
    if (!message.trim())        { setSendError('Please enter a message.'); return; }
    if (selectedIds.size === 0) { setSendError('Select at least one patient.'); return; }
    setSending(true);
    setSendError(null);
    try {
      await chatApi.sendBroadcast(message.trim(), Array.from(selectedIds));
      setComposeOpen(false);
      loadBroadcasts();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send broadcast.');
    } finally {
      setSending(false);
    }
  };

  // ── Derived stats — all real, from DB ────────────────────────
  const totalSent      = broadcasts.length;
  const totalDelivered = broadcasts.reduce((s, b) => s + (b.deliveredCount || 0), 0);
  const totalRead       = broadcasts.reduce((s, b) => s + (b.readCount || 0), 0);

  const filtered = broadcasts.filter(b => b.message.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="cb-main">
      <div className="cb-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="cb-btn-back" onClick={onBack}>Back</button>
          <div>
            <div className="cb-page-title">Broadcast &amp; Message History</div>
            <div className="cb-page-sub">Track all sent broadcasts and send new ones</div>
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
          <button className="cb-btn cb-btn-light cb-btn-sm" onClick={onNewMessage}>+ New Message</button>
          <button className="cb-btn cb-btn-primary" onClick={openCompose}>📣 New Broadcast</button>
        </div>
      </div>

      {/* Stats — real, computed from DB */}
      <div className="cbbr-stats">
        <div className="cb-stat-card">
          <div className="cb-stat-icon" style={{ background: '#EEF2FF' }}>📤</div>
          <div>
            <div className="cb-stat-num" style={{ color: '#2B52D4' }}>{loading ? '…' : totalSent}</div>
            <div className="cb-stat-label">Total Broadcasts</div>
          </div>
        </div>
        <div className="cb-stat-card">
          <div className="cb-stat-icon" style={{ background: '#DCFCE7' }}>✅</div>
          <div>
            <div className="cb-stat-num" style={{ color: '#22C55E' }}>{loading ? '…' : totalDelivered}</div>
            <div className="cb-stat-label">Delivered</div>
          </div>
        </div>
        <div className="cb-stat-card">
          <div className="cb-stat-icon" style={{ background: '#FEF3C7' }}>📖</div>
          <div>
            <div className="cb-stat-num" style={{ color: '#D97706' }}>{loading ? '…' : totalRead}</div>
            <div className="cb-stat-label">Read</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="cbbr-filters">
        <div className="cbbr-search-wrap">
          <span className="cbbr-search-icon">🔍</span>
          <input
            className="cbbr-search"
            type="text"
            placeholder="Search broadcast messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#FEE2E2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Broadcast list — real data */}
      {loading && (
        <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading broadcast history…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📣</div>
          {search ? 'No broadcasts match your search.' : 'No broadcasts sent yet. Click "New Broadcast" to message multiple patients at once.'}
        </div>
      )}

      {!loading && filtered.map(b => (
        <div key={b._id} className="cbbr-item">
          <div className="cbbr-icon-wrap" style={{ background: '#EEF2FF' }}>📣</div>
          <div className="cbbr-item-body">
            <div className="cbbr-item-title">Broadcast — {b.recipients.length} recipient{b.recipients.length !== 1 ? 's' : ''}</div>
            <div className="cbbr-item-preview">{b.message}</div>
            <div className="cbbr-item-tags">
              <span className="cbbr-tag cbbr-tag-green">✓ {b.deliveredCount}/{b.recipients.length} Delivered</span>
              <span className="cbbr-tag cbbr-tag-blue">📖 {b.readCount} Read</span>
              <span className="cbbr-item-time">{fmtDateTime(b.sentAt)}</span>
            </div>
          </div>
        </div>
      ))}

      {/* ── Compose new broadcast modal ── */}
      {composeOpen && (
        <div className="cbfaq-modal-overlay" onClick={() => setComposeOpen(false)}>
          <div className="cbfaq-modal" onClick={e => e.stopPropagation()}>
            <div className="cbfaq-modal-hdr">
              <div className="cbfaq-modal-hdr-title">📣 New Broadcast</div>
              <button className="cbfaq-modal-close" onClick={() => setComposeOpen(false)}>✕</button>
            </div>

            <div className="cbfaq-modal-body">
              {sendError && (
                <div style={{ background: '#FEE2E2', border: '1.5px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 12, marginBottom: 12 }}>
                  ⚠️ {sendError}
                </div>
              )}

              <div className="cb-form-group">
                <label className="cb-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Recipients * ({selectedIds.size} selected)</span>
                  {patients.length > 0 && (
                    <span style={{ color: '#2B52D4', cursor: 'pointer', fontWeight: 600 }} onClick={toggleSelectAll}>
                      {selectedIds.size === patients.length ? 'Deselect All' : 'Select All'}
                    </span>
                  )}
                </label>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1.5px solid #E5E7EB', borderRadius: 9 }}>
                  {patientsLoading && <div style={{ padding: 12, fontSize: 12.5, color: '#9CA3AF' }}>Loading patients…</div>}
                  {!patientsLoading && patients.length === 0 && (
                    <div style={{ padding: 12, fontSize: 12.5, color: '#9CA3AF' }}>No registered patients found.</div>
                  )}
                  {patients.map(p => (
                    <label key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedIds.has(p._id)} onChange={() => togglePatient(p._id)} />
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span style={{ color: '#9CA3AF', fontSize: 11 }}>{p.email}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="cb-form-group">
                <label className="cb-label">Message *</label>
                <textarea
                  className="cbfaq-editor"
                  rows={4}
                  placeholder="Type the broadcast message…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>
            </div>

            <div className="cbfaq-modal-footer">
              <button className="cb-btn cb-btn-light cb-btn-sm" onClick={() => setComposeOpen(false)}>Cancel</button>
              <div className="cbfaq-modal-footer-right">
                <button className="cb-btn cb-btn-primary cb-btn-sm" onClick={handleSendBroadcast} disabled={sending}>
                  {sending ? 'Sending…' : `Send to ${selectedIds.size} patient${selectedIds.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
