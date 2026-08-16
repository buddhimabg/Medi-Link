// src/pages/Chatbot/ChatbotCompose.tsx — Page 3
// Compose a new message to a patient

import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import { chatApi } from '../../types/api';
import type { ConversationRecord } from '../../types/api';

interface Props {
  onBack:             () => void;
  onSent:             () => void;
  onSendAnother:      () => void;
  onOpenBroadcast?:   () => void;
  onOpenAISettings?:  () => void;
  onOpenAnalytics?:   () => void;
}

const MENU_ITEMS = [
  { icon: '📣', label: 'Message History', key: 'broadcast'   },
  { icon: '🤖', label: 'AI Bot Settings', key: 'ai-settings' },
  { icon: '📊', label: 'Analytics',       key: 'analytics'   },
];

export default function ChatbotCompose({
  onBack, onSent, onSendAnother,
  onOpenBroadcast, onOpenAISettings, onOpenAnalytics,
}: Props) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [convs,     setConvs]     = useState<ConversationRecord[]>([]);
  const [search,    setSearch]    = useState('');
  const [filtered,  setFiltered]  = useState<ConversationRecord[]>([]);
  const [selected,  setSelected]  = useState<ConversationRecord | null>(null);
  const [message,   setMessage]   = useState('');
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);
  const [dropOpen,  setDropOpen]  = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Load all conversations once (used for patient search)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await chatApi.getConversations();
        setConvs(Array.isArray(data) ? data : []);
      } catch {
        setConvs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter conversations by search query
  useEffect(() => {
    if (!search.trim()) { setFiltered([]); setDropOpen(false); return; }
    const q = search.toLowerCase();
    const results = convs.filter(c =>
      c.patient?.name?.toLowerCase().includes(q) ||
      c.patient?.email?.toLowerCase().includes(q)
    );
    setFiltered(results);
    setDropOpen(true);
  }, [search, convs]);

  const handleMenuAction = (key: string) => {
    setMenuOpen(false);
    if (key === 'broadcast'   && onOpenBroadcast)  onOpenBroadcast();
    if (key === 'ai-settings' && onOpenAISettings) onOpenAISettings();
    if (key === 'analytics'   && onOpenAnalytics)  onOpenAnalytics();
  };

  const handleSelectConv = (conv: ConversationRecord) => {
    setSelected(conv);
    setSearch(conv.patient?.name ?? '');
    setDropOpen(false);
  };

  const handleSend = async () => {
    if (!selected) { setError('Please select a patient.'); return; }
    if (!message.trim()) { setError('Please enter a message.'); return; }
    setSending(true);
    setError(null);
    try {
      // Correct signature: sendMessage(conversationId: string, text: string)
      await chatApi.sendMessage(selected._id, message.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleSendAnother = () => {
    setSelected(null);
    setSearch('');
    setMessage('');
    setSuccess(false);
    setError(null);
    onSendAnother();
  };

  const patientName = selected?.patient?.name ?? '';

  return (
    <div className="cb-main">

      {/* Header */}
      <div className="cb-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="cb-back-btn" onClick={onBack}>← Back</button>
          <div>
            <div className="cb-page-title">New Message</div>
            <div className="cb-page-sub">Send a message to a patient</div>
          </div>
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
        </div>
      </div>

      {/* Success state */}
      {success ? (
        <div className="cb-card" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Message Sent!</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 28 }}>
            Your message to <strong>{patientName}</strong> has been delivered.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="cb-btn cb-btn-outline" onClick={onSent}>View All Chats</button>
            <button className="cb-btn cb-btn-primary" onClick={handleSendAnother}>Send Another</button>
          </div>
        </div>
      ) : (
        <div className="cb-card" style={{ maxWidth: 560, margin: '24px auto', padding: '28px 28px' }}>

          {/* Error banner */}
          {error && (
            <div style={{
              background: '#FEE2E2', border: '1.5px solid #FECACA', borderRadius: 8,
              padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 18,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Patient search */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              To (Patient) *
            </label>
            <div style={{ position: 'relative' }} ref={dropRef}>
              <input
                className="cb-input"
                type="text"
                placeholder={loading ? 'Loading patients…' : 'Search patient by name or email…'}
                value={search}
                disabled={loading}
                onChange={e => { setSearch(e.target.value); setSelected(null); }}
                onFocus={() => filtered.length > 0 && setDropOpen(true)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />

              {/* Results dropdown */}
              {dropOpen && filtered.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)', marginTop: 4,
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  {filtered.map(conv => (
                    <div
                      key={conv._id}
                      onClick={() => handleSelectConv(conv)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                        color: '#111827', display: 'flex', alignItems: 'center', gap: 10,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF',
                        color: '#2B52D4', fontWeight: 700, fontSize: 12, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {conv.patient?.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{conv.patient?.name ?? 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{conv.patient?.email ?? ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No results */}
              {dropOpen && filtered.length === 0 && search.trim() && !loading && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 8,
                  padding: '12px 14px', fontSize: 13, color: '#9CA3AF', marginTop: 4,
                }}>
                  No patients found for "{search}".
                </div>
              )}
            </div>

            {selected && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#059669' }}>
                ✓ Selected: <strong>{patientName}</strong>
              </div>
            )}
          </div>

          {/* Message textarea */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Message *
            </label>
            <textarea
              className="cb-input"
              rows={5}
              placeholder="Type your message here…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 120 }}
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              {message.length} characters
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="cb-btn cb-btn-outline" onClick={onBack} disabled={sending}>
              Cancel
            </button>
            <button
              className="cb-btn cb-btn-primary"
              onClick={handleSend}
              disabled={sending || !selected || !message.trim()}
            >
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}