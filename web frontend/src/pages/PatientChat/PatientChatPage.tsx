// src/pages/PatientChat/PatientChatPage.tsx
// Patient side — chat with a channeled doctor, outside of an active
// video call. Mirrors the chat panel already built into
// PatientVideoCallScreen.tsx (same socket.io pattern), but as its own
// standalone page reachable from the sidebar.

import { useState, useRef, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Sidebar from '../../component/sidebar';
import { chatApi, getToken } from '../../types/api';
import type { PatientConversationRecord, ConversationMessage } from '../../types/api';
import './PatientChatPage.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000';
const API_BASE   = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api').replace('/api', '');

const getInitial = (name?: string) => name?.[0]?.toUpperCase() ?? '?';

const timeOf = (d: string) =>
  new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function PatientChatPage() {
  const [conversations, setConversations] = useState<PatientConversationRecord[]>([]);
  const [activeId,      setActiveId]      = useState<string | null>(null);
  const [messages,      setMessages]      = useState<ConversationMessage[]>([]);
  const [input,         setInput]         = useState('');
  const [loadingList,   setLoadingList]   = useState(true);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [sending,       setSending]       = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const socketRef      = useRef<Socket | null>(null);
  const bottomRef       = useRef<HTMLDivElement>(null);
  const joinedRoomRef   = useRef<string | null>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);

  const active = conversations.find(c => c._id === activeId) || null;

  // ── Load this patient's conversations (auto-creates one per channeled doctor) ──
  useEffect(() => {
    const load = async () => {
      setLoadingList(true);
      setError(null);
      try {
        const data = await chatApi.getMyConversations();
        setConversations(data);
        if (data.length) setActiveId(prev => prev ?? data[0]._id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load your conversations.');
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, []);

  // ── Socket — connect once ──
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('new-message', ({ conversationId, message }: { conversationId: string; message: ConversationMessage }) => {
      if (message.senderRole === 'patient') return; // our own — already added locally
      if (conversationId === activeId) {
        setMessages(prev => [...prev, message]);
      }
      // Bump that conversation to the top + update preview regardless of which is open
      setConversations(prev => {
        const idx = prev.findIndex(c => c._id === conversationId);
        if (idx === -1) return prev;
        const updated = {
          ...prev[idx],
          lastMessage:    message.text,
          lastMessageAt:  message.createdAt,
          lastSenderRole: message.senderRole,
          unreadCount:    conversationId === activeId ? prev[idx].unreadCount : prev[idx].unreadCount + 1,
        };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    });

    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Join the socket room for the active conversation + load its messages ──
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }

    if (joinedRoomRef.current && joinedRoomRef.current !== activeId) {
      socketRef.current?.emit('leave-chat-room', { conversationId: joinedRoomRef.current });
    }
    socketRef.current?.emit('join-chat-room', { conversationId: activeId });
    joinedRoomRef.current = activeId;

    const loadMessages = async () => {
      setLoadingMsgs(true);
      try {
        const result = await chatApi.getMessages(activeId, 1, 30);
        setMessages(result.messages);
      } catch {
        setMessages([]);
      } finally {
        setLoadingMsgs(false);
      }
    };
    loadMessages();
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setConversations(prev => prev.map(c => c._id === id ? { ...c, unreadCount: 0 } : c));
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    setInput('');
    // Optimistic local echo
    const optimistic: ConversationMessage = {
      _id:            `local-${Date.now()}`,
      conversationId: activeId,
      senderId:       'me',
      senderRole:     'patient',
      text,
      type:           'normal',
      isRead:         false,
      createdAt:      new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      await chatApi.sendMessage(activeId, text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message failed to send.');
    } finally {
      setSending(false);
    }
  }, [input, activeId, sending]);

  const sendAttachmentFile = useCallback(async (file: File) => {
    if (!activeId || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const msg = await chatApi.sendAttachment(activeId, file);
      setMessages(prev => [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c._id === activeId
          ? {
              ...c,
              lastMessage: file.type.startsWith('image/') ? '📷 Photo' : `📎 ${file.name}`,
              lastMessageAt: new Date().toISOString(),
              lastSenderRole: 'patient',
            }
          : c
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send attachment.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [activeId, uploading]);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main-content">
        <div className="pc-wrap">

          <div className="pc-header">
            <div className="pc-title">Messages</div>
            <div className="pc-sub">Chat with your doctor</div>
          </div>

          {error && <div className="pc-error">⚠️ {error}</div>}

          <div className="pc-grid">

            {/* ── Conversation list ── */}
            <div className="pc-list-card">
              {loadingList && <div className="pc-empty">Loading…</div>}

              {!loadingList && conversations.length === 0 && (
                <div className="pc-empty">
                  <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                  You don't have any doctor conversations yet.
                  <div style={{ fontSize: 12, marginTop: 6, color: '#9CA3AF' }}>
                    Book an appointment with a doctor to start chatting.
                  </div>
                </div>
              )}

              {!loadingList && conversations.map(conv => (
                <div
                  key={conv._id}
                  className={`pc-list-row ${conv._id === activeId ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(conv._id)}
                >
                  <div className="pc-avatar">{getInitial(conv.doctor?.name)}</div>
                  <div className="pc-list-info">
                    <div className="pc-list-name">
                      {conv.doctor?.name ?? 'Doctor'}
                      {conv.doctor?.specialty && (
                        <span className="pc-specialty">{conv.doctor.specialty}</span>
                      )}
                    </div>
                    <div className="pc-list-preview">
                      {conv.lastSenderRole === 'doctor' ? '🩺 ' : conv.lastSenderRole === 'bot' ? '🤖 ' : ''}
                      {conv.lastMessage || 'No messages yet'}
                    </div>
                  </div>
                  {conv.unreadCount > 0 && <div className="pc-badge">{conv.unreadCount}</div>}
                </div>
              ))}
            </div>

            {/* ── Message thread ── */}
            <div className="pc-thread-card">
              {!active && (
                <div className="pc-empty" style={{ margin: 'auto' }}>
                  Select a conversation to start chatting.
                </div>
              )}

              {active && (
                <>
                  <div className="pc-thread-header">
                    <div className="pc-avatar">{getInitial(active.doctor?.name)}</div>
                    <div>
                      <div className="pc-thread-name">{active.doctor?.name ?? 'Doctor'}</div>
                      {active.doctor?.specialty && (
                        <div className="pc-thread-specialty">{active.doctor.specialty}</div>
                      )}
                    </div>
                  </div>

                  <div className="pc-messages">
                    {loadingMsgs && <div className="pc-empty">Loading messages…</div>}
                    {!loadingMsgs && messages.length === 0 && (
                      <div className="pc-empty">
                        No messages yet — say hello to {active.doctor?.name?.split(' ')[0] ?? 'your doctor'}!
                      </div>
                    )}
                    {!loadingMsgs && messages.map(m => {
                      const isMine       = m.senderRole === 'patient';
                      const isAttachment = m.type === 'attachment';
                      const isImage      = isAttachment && (m.attachmentType?.startsWith('image/') ?? false);
                      return (
                        <div key={m._id} className={`pc-bubble-row ${isMine ? 'mine' : ''}`}>
                          {!isMine && (
                            <div
                              className="pc-msg-avatar"
                              style={{ background: m.senderRole === 'bot' ? '#7C3AED' : '#2B52D4' }}
                            >
                              {m.senderRole === 'bot' ? '🤖' : getInitial(active.doctor?.name)}
                            </div>
                          )}
                          <div className={`pc-bubble ${m.senderRole}`}>
                            {m.senderRole === 'bot' && <span className="pc-bot-tag">🤖 AI</span>}

                            {isAttachment && isImage && (
                              <a href={`${API_BASE}${m.attachmentUrl}`} target="_blank" rel="noreferrer">
                                <img src={`${API_BASE}${m.attachmentUrl}`} alt={m.attachmentName ?? 'attachment'} className="pc-msg-img" />
                              </a>
                            )}
                            {isAttachment && !isImage && (
                              <a
                                href={`${API_BASE}${m.attachmentUrl}`}
                                target="_blank" rel="noreferrer"
                                className="pc-msg-file"
                              >
                                <span style={{ fontSize: 18 }}>📎</span>
                                <span className="pc-msg-file-name">{m.attachmentName ?? 'File'}</span>
                              </a>
                            )}
                            {m.text && <div>{m.text}</div>}
                            <div className="pc-bubble-time">{timeOf(m.createdAt)}</div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>

                  <div className="pc-input-row">
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
                    <button
                      className="pc-attach-btn"
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      disabled={uploading}
                      title="Attach a file or photo"
                      type="button"
                    >
                      {uploading ? '⏳' : '📎'}
                    </button>
                    <input
                      className="pc-input"
                      type="text"
                      placeholder="Type a message…"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    />
                    <button
                      className="pc-send-btn"
                      onClick={handleSend}
                      disabled={sending || !input.trim()}
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}