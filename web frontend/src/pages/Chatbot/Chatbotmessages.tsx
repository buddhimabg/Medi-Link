// src/pages/Chatbot/Chatbotmessages.tsx
// Real API: conversations list + messages fetch + send + Socket.io real-time

import { useState, useRef, useEffect, useCallback } from 'react';
import { io as socketIO } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import './Chatbot.css';
import './Chatbotmessages.css';
import { chatApi, faqApi } from '../../types/api';
import type { ConversationRecord, MessageRecord, FAQRecord } from '../../types/api';

interface Props {
  initialPatientId: string | null;
  initialConvId?:   string;
  onBack:           () => void;
  onOpenNotifications: () => void;
  onOpenProfile?:   (patientId: string) => void;
  onOpenFAQLibrary?:() => void;
  onNewMessage?:    () => void;
  onOpenBroadcast?:  () => void;
  onOpenAISettings?: () => void;
  onOpenAnalytics?:  () => void;
  onPatientSelect?:  (patientId: string) => void;
}

const MENU_ITEMS = [
  { icon: '📣', label: 'Message History',  key: 'broadcast'   },
  { icon: '🤖', label: 'AI Bot Settings',  key: 'ai-settings' },
  { icon: '📊', label: 'Analytics',        key: 'analytics'   },
];

type Filter = 'All' | 'Unread' | 'FAQ';

// Helpers
const COLORS = ['#2B52D4','#7C3AED','#059669','#DC2626','#0891B2','#D97706','#6B7280'];
const getColor   = (name: string) => COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length];
const getInitial = (name: string) => name?.[0]?.toUpperCase() ?? '?';

const fmtTime = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

const fmtDate = (dateStr: string) => {
  if (!dateStr) return 'Today';
  try {
    const d     = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return 'Today'; }
};

const timeAgo = (dateStr: string) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const quickReplies = [
  "This is normal, don't worry",
  'Take medicine with food',
  'Schedule a follow-up',
  'See FAQ on side effects',
];

const faqCatStyle: Record<string, string> = {
  MEDICATION:     'MEDICATION',
  APPOINTMENT:    'APPOINTMENT',
  MENTAL_HEALTH:  'MENTAL HEALTH',
  GENERAL:        'GENERAL',
};

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

export default function ChatbotMessages({
  initialPatientId, initialConvId, onBack, onOpenNotifications,
  onOpenProfile, onOpenFAQLibrary, onNewMessage,
  onOpenBroadcast, onOpenAISettings, onOpenAnalytics, onPatientSelect,
}: Props) {
  const [filter, setFilter]             = useState<Filter>('All');
  const [conversations, setConvs]       = useState<ConversationRecord[]>([]);
  const [selectedConv, setSelectedConv] = useState<ConversationRecord | null>(null);
  const [messages, setMessages]         = useState<MessageRecord[]>([]);
  const [input, setInput]               = useState('');
  const [search, setSearch]             = useState('');
  const [menuOpen, setMenuOpen]         = useState(false);
  const [convLoading, setConvLoading]   = useState(true);
  const [msgLoading, setMsgLoading]     = useState(false);
  const [sending, setSending]           = useState(false);
  const [typing, setTyping]             = useState(false);
  const [faqs, setFaqs]                 = useState<FAQRecord[]>([]);
  const [faqsLoading, setFaqsLoading]   = useState(false);
  const [faqSearch, setFaqSearch]       = useState('');
  const [uploading, setUploading]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);
  const socketRef  = useRef<Socket | null>(null);

  // 1) Load conversations on mount
  useEffect(() => {
    chatApi.getConversations()
      .then(data => {
        setConvs(data);
        // Select default conversation
        const def = initialConvId
          ? data.find(c => c._id === initialConvId)
          : initialPatientId
            ? data.find(c => c.patientId === initialPatientId)
            : data[0];
        if (def) setSelectedConv(def);
      })
      .catch(console.error)
      .finally(() => setConvLoading(false));
  }, []);

  // 2) Load messages when selected conversation changes
  useEffect(() => {
    if (!selectedConv) return;
    setMsgLoading(true);
    setMessages([]);

    chatApi.getMessages(selectedConv._id)
      .then(data => setMessages(data.messages))
      .catch(console.error)
      .finally(() => setMsgLoading(false));

    // Mark messages as read
    chatApi.markAsRead(selectedConv._id).catch(() => {});

    // Reset unread count locally
    setConvs(prev => prev.map(c =>
      c._id === selectedConv._id ? { ...c, unreadCount: 0 } : c
    ));

    onPatientSelect?.(selectedConv.patientId);
  }, [selectedConv?._id]);

  // 3) Socket.io — real-time messages
  useEffect(() => {
    if (!selectedConv) return;

    const socket = socketIO(API_BASE, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('join-chat-room', { conversationId: selectedConv._id });

    // Listen for new messages
    socket.on('new-message', ({ message }: { message: MessageRecord }) => {
      setMessages(prev => {
        if (prev.find(m => m._id === message._id)) return prev; // duplicate check
        return [...prev, message];
      });
      setConvs(prev => prev.map(c =>
        c._id === selectedConv._id
          ? { ...c, lastMessage: message.text, lastMessageAt: message.createdAt, lastSenderRole: message.senderRole }
          : c
      ));
    });

    socket.on('typing',      () => setTyping(true));
    socket.on('stop-typing', () => setTyping(false));

    return () => {
      socket.emit('leave-chat-room', { conversationId: selectedConv._id });
      socket.disconnect();
    };
  }, [selectedConv?._id]);

  // Auto scroll to bottom
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load real FAQs when the FAQ tab is opened (lazy — only once)
  useEffect(() => {
    if (filter !== 'FAQ' || faqs.length > 0) return;
    setFaqsLoading(true);
    faqApi.getAll()
      .then(data => setFaqs(data.filter(f => f.isActive)))
      .catch(console.error)
      .finally(() => setFaqsLoading(false));
  }, [filter, faqs.length]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Send message to backend
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !selectedConv || sending) return;
    setSending(true);
    setInput('');
    try {
      const msg = await chatApi.sendMessage(selectedConv._id, text.trim());
      setMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, msg]);
      setConvs(prev => prev.map(c =>
        c._id === selectedConv._id
          ? { ...c, lastMessage: text.trim(), lastMessageAt: new Date().toISOString(), lastSenderRole: 'doctor' }
          : c
      ));
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  }, [selectedConv, sending]);

  // Send a file/photo attachment
  const sendAttachmentFile = useCallback(async (file: File) => {
    if (!selectedConv || uploading) return;
    setUploading(true);
    try {
      const msg = await chatApi.sendAttachment(selectedConv._id, file);
      setMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, msg]);
      setConvs(prev => prev.map(c =>
        c._id === selectedConv._id
          ? {
              ...c,
              lastMessage: file.type.startsWith('image/') ? '📷 Photo' : `📎 ${file.name}`,
              lastMessageAt: new Date().toISOString(),
              lastSenderRole: 'doctor',
            }
          : c
      ));
    } catch (err) {
      console.error('Attachment send error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [selectedConv, uploading]);

  const handleMenuAction = (key: string) => {
    setMenuOpen(false);
    if (key === 'broadcast'   && onOpenBroadcast)  onOpenBroadcast();
    if (key === 'ai-settings' && onOpenAISettings) onOpenAISettings();
    if (key === 'analytics'   && onOpenAnalytics)  onOpenAnalytics();
  };

  // Filter conversations for left panel
  const filteredConvs = conversations
    .filter(c => filter === 'Unread' ? c.unreadCount > 0 : true)
    .filter(c => c.patient?.name?.toLowerCase().includes(search.toLowerCase()));

  const isFaqMode      = filter === 'FAQ';
  const patientName    = selectedConv?.patient?.name ?? 'Patient';
  const patientColor   = getColor(patientName);
  const patientInitial = getInitial(patientName);

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: MessageRecord[] }[]>((acc, msg) => {
    const date = fmtDate(msg.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      acc.push({ date, msgs: [msg] });
    }
    return acc;
  }, []);

  return (
    <div className="cb-layout">

      {/* Left panel: conversation list */}
      <div className="cb-clist">
        <div className="cb-clist-hdr">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="cb-btn-back" onClick={onBack}>Back</button>
            <div className="cb-clist-title">Messages</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="cb-search-wrap">
              <span className="cb-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
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

        {/* Filter tabs: All / Unread / FAQ */}
        <div className="cb-fpills">
          {(['All', 'Unread', 'FAQ'] as Filter[]).map(f => (
            <button
              key={f}
              className={`cb-fp${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >{f}</button>
          ))}
        </div>

        <div className="cb-clist-body">
          {convLoading && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              Loading conversations...
            </div>
          )}

          {!convLoading && filteredConvs.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              {filter === 'Unread' ? 'No unread messages 🎉' : 'No conversations found'}
            </div>
          )}

          {/* Real conversation rows */}
          {!convLoading && filteredConvs.map(conv => {
            const name     = conv.patient?.name ?? 'Unknown Patient';
            const color    = getColor(name);
            const initial  = getInitial(name);
            const isActive = selectedConv?._id === conv._id;

            return (
              <div
                key={conv._id}
                className={`cb-ci${isActive ? ' active' : ''}`}
                onClick={() => setSelectedConv(conv)}
              >
                <div className="cb-avatar" style={{ width: 37, height: 37, fontSize: 13, background: color }}>
                  {initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cb-ci-name">{name}</div>
                  <div className="cb-ci-prev" style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: conv.lastSenderRole === 'bot' ? '#7C3AED' : '#6B7280',
                  }}>
                    {conv.lastSenderRole === 'bot'    ? '🤖 ' : ''}
                    {conv.lastSenderRole === 'doctor' ? '🩺 ' : ''}
                    {conv.lastMessage || 'No messages yet'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <div className="cb-ci-time">{timeAgo(conv.lastMessageAt)}</div>
                  {conv.unreadCount > 0 && <div className="cb-ubadge">{conv.unreadCount}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: Chat area */}
      <div className="cb-cmain">
        {!selectedConv ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 14 }}>Select a patient conversation to begin</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="cb-chdr">
              <div className="cb-avatar" style={{ width: 40, height: 40, fontSize: 14, background: patientColor }}>
                {patientInitial}
              </div>
              <div>
                <div className="cb-chdr-name">{patientName}</div>
                <div className="cb-chdr-status">
                  {typing ? '✏️ Typing...' : 'Patient'}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="cb-btn cb-btn-light cb-btn-sm"
                  onClick={() => onOpenProfile?.(selectedConv.patientId)}
                >
                  👤 Profile
                </button>
                <button className="cb-btn cb-btn-primary cb-btn-sm" disabled title="Video call integration coming soon" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                  📹 Start Call
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="cb-msgs">
              {msgLoading && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: 13 }}>
                  Loading messages...
                </div>
              )}

              {!msgLoading && messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                  No messages yet. Type the first message below!
                </div>
              )}

              {/* Real messages grouped by date */}
              {!msgLoading && groupedMessages.map(group => (
                <div key={group.date}>
                  <div className="cb-date-divider">{group.date}</div>
                  {group.msgs.map(msg => {
                    const isDoctor  = msg.senderRole === 'doctor';
                    const isBot     = msg.senderRole === 'bot';
                    const isPatient = msg.senderRole === 'patient';
                    const isAttachment = msg.type === 'attachment';
                    const isImage      = isAttachment && (msg.attachmentType?.startsWith('image/') ?? false);

                    const isEscalationMsg = msg.type === 'escalation';

                    return (
                      <div key={msg._id} className={`cb-mrow ${isDoctor ? 'own' : ''}`}>
                        {!isDoctor && (
                          <div
                            className="cb-mrow-avatar"
                            style={{ background: isBot ? '#7C3AED' : getColor(selectedConv?.patient?.name ?? '') }}
                          >
                            {isBot ? '🤖' : getInitial(selectedConv?.patient?.name ?? '')}
                          </div>
                        )}
                        <div style={{ maxWidth: '68%' }}>
                          {msg.isEscalated && (
                            <div className="cb-m-name" style={{ color: '#DC2626', fontWeight: 700 }}>
                              🚨 Flagged as urgent
                            </div>
                          )}
                          <div
                            className={`cb-m ${isDoctor ? 'sent' : isBot ? 'bot' : 'recv'}`}
                            style={
                              msg.isEscalated || isEscalationMsg
                                ? { border: '1.5px solid #DC2626', background: '#FEF2F2' }
                                : undefined
                            }
                          >
                            {isBot && (
                              <div className="cb-m-name">
                                {isEscalationMsg
                                  ? '🚨 MediLink AI (Safety Notice)'
                                  : `🤖 MediLink AI ${msg.type === 'faq' ? '(FAQ Reply)' : '(Auto)'}`}
                              </div>
                            )}

                            {isAttachment && isImage && (
                              <a href={`${API_BASE}${msg.attachmentUrl}`} target="_blank" rel="noreferrer">
                                <img src={`${API_BASE}${msg.attachmentUrl}`} alt={msg.attachmentName ?? 'attachment'} className="cb-m-img" />
                              </a>
                            )}
                            {isAttachment && !isImage && (
                              <a
                                href={`${API_BASE}${msg.attachmentUrl}`}
                                target="_blank" rel="noreferrer"
                                className="cb-m-file"
                              >
                                <span style={{ fontSize: 18 }}>📎</span>
                                <span className="cb-m-file-name">{msg.attachmentName ?? 'File'}</span>
                              </a>
                            )}
                            {msg.text && <div className="cb-mb">{msg.text}</div>}
                            <div className="cb-mt">
                              {fmtTime(msg.createdAt)}
                              {isDoctor ? ' ✓✓' : ''}
                            </div>
                          </div>

                          {/* AI confidence badge */}
                          {msg.aiConfidence && (
                            <div className="cb-ai-confidence" style={{ marginTop: 6 }}>
                              <span style={{ fontSize: 15 }}>✅</span>
                              <div style={{ fontSize: 12, color: '#374151' }}>
                                <strong>AI Confidence: {msg.aiConfidence}%</strong> — Auto-sent.{' '}
                                <span style={{ color: '#2B52D4', cursor: 'pointer', fontWeight: 600 }}>
                                  Edit &amp; Resend
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={msgsEndRef} />
            </div>

            {/* Quick replies */}
            {!isFaqMode && (
              <div className="cb-aichip-bar">
                <span className="cb-aclabel">✨ Quick Replies:</span>
                {quickReplies.map(r => (
                  <button key={r} className="cb-ac" onClick={() => sendMessage(r)}>{r}</button>
                ))}
              </div>
            )}

            {/* Message input */}
            <div className="cb-cinput-row">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) sendAttachmentFile(file);
                }}
              />
              <span
                style={{ fontSize: 19, cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.5 : 1 }}
                onClick={() => !uploading && fileInputRef.current?.click()}
                title="Attach a file or photo"
              >
                {uploading ? '⏳' : '📎'}
              </span>
              <input
                className="cb-cinput"
                type="text"
                placeholder="Type a message..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                disabled={sending}
              />
              <span style={{ fontSize: 19, cursor: 'pointer' }}>😊</span>
              <button
                className="cb-sbtn"
                onClick={() => sendMessage(input)}
                disabled={sending || !input.trim()}
                style={{ opacity: sending ? 0.6 : 1 }}
              >
                {sending ? '...' : '➤'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right panel: FAQ side OR Patient side */}
      {isFaqMode ? (
        <div className="cb-faq-side">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>❓ FAQ Library</div>
          <div className="cb-search-wrap">
            <span className="cb-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search FAQs..."
              value={faqSearch}
              onChange={e => setFaqSearch(e.target.value)}
            />
          </div>

          {faqsLoading && (
            <div style={{ fontSize: 12, color: '#9CA3AF', padding: '12px 0' }}>Loading FAQs…</div>
          )}

          {!faqsLoading && faqs.length === 0 && (
            <div style={{ fontSize: 12, color: '#9CA3AF', padding: '12px 0' }}>
              No FAQs yet. Add some in the FAQ Library.
            </div>
          )}

          {!faqsLoading && faqs
            .filter(f =>
              f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
              f.keywords.some(k => k.includes(faqSearch.toLowerCase()))
            )
            .map(f => (
              <div
                key={f._id}
                className="cb-fq"
                style={{ cursor: 'pointer' }}
                title="Click to insert this answer into the message box"
                onClick={() => setInput(f.answer)}
              >
                <div className="cb-fq-cat">{faqCatStyle[f.category] ?? f.category}</div>
                <div className="cb-fq-q">{f.question}</div>
              </div>
            ))}

          <button className="cb-btn cb-btn-outline cb-btn-sm cb-btn-full" onClick={() => onOpenFAQLibrary?.()}>
            View All FAQ
          </button>
          <button
            className="cb-btn cb-btn-primary cb-btn-sm cb-btn-full"
            style={{ marginTop: 6 }}
            onClick={() => onOpenFAQLibrary?.()}
          >
            + Add FAQ
          </button>
        </div>
      ) : (
        <div className="cb-pt-side">
          {selectedConv && (
            <>
              <div className="cb-card" style={{ padding: 13 }}>
                <div className="cb-card-title" style={{ fontSize: 12, marginBottom: 9 }}>👤 Patient</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
                  <div className="cb-avatar" style={{ width: 38, height: 38, fontSize: 13, background: patientColor }}>
                    {patientInitial}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{patientName}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                      {selectedConv.unreadCount > 0
                        ? `${selectedConv.unreadCount} unread message${selectedConv.unreadCount > 1 ? 's' : ''}`
                        : 'All caught up'}
                    </div>
                  </div>
                </div>
                <div className="cb-kv">
                  <span className="cb-kk">Last Message</span>
                  <span className="cb-kv-v">{timeAgo(selectedConv.lastMessageAt)}</span>
                </div>
                <div className="cb-kv">
                  <span className="cb-kk">Total Messages</span>
                  <span className="cb-kv-v">{messages.length}</span>
                </div>
              </div>

              <button
                className="cb-btn cb-btn-outline cb-btn-sm cb-btn-full"
                onClick={() => onOpenProfile?.(selectedConv.patientId)}
              >
                📋 Full Profile
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}