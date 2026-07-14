// src/pages/Chatbot/Chatbotpage.tsx
// Master controller — manages all 18 screen navigation

import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { io as socketIO } from 'socket.io-client';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import ChatbotDashboard    from './Chatbotdashboard';
import ChatbotAllChats     from './ChatbotAllChats';
import ChatbotCompose      from './ChatbotCompose';
import ChatbotMessages     from './Chatbotmessages';
import ChatbotPatientProfile from './ChatbotPatientProfile';
import ChatbotFAQLibrary   from './ChatbotFAQLibrary';
import ChatbotBroadcast    from './ChatbotBroadcast';
import ChatbotAISettings   from './ChatbotAISettings';
import ChatbotAnalytics    from './ChatbotAnalytics';
import './Chatbot.css';

const SOCKET_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

interface EscalationAlert {
  conversationId: string;
  matchedKeyword: string;
  patientMessage: string;
}

// ── All possible views ────────────────────────────────────────
export type ChatView =
  | 'dashboard'       // Page 1
  | 'allchats'        // Page 2
  | 'compose'         // Page 3
  | 'chat'            // Page 5  (individual chat)
  | 'profile'         // Page 6
  | 'faq-chat'        // Page 9  (FAQ tab in chat)
  | 'faq-library'     // Page 10
  | 'broadcast'       // Page 15
  | 'ai-settings'     // Page 16/17
  | 'analytics';      // Page 18

export default function ChatbotPage({ doctorName, onLogout }: { doctorName?: string; onLogout?: () => void }) {
  const [view, setView]                 = useState<ChatView>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedConvId, setSelectedConvId]       = useState<string>('');
  const [menuOpen, setMenuOpen]         = useState(false);
  const [escalationAlert, setEscalationAlert] = useState<EscalationAlert | null>(null);
  const location = useLocation();
  const socketRef = useRef<ReturnType<typeof socketIO> | null>(null);

  // ── Navigation helpers ────────────────────────────────────────
  const goTo = (v: ChatView, patientId?: string, convId?: string) => {
    if (patientId) setSelectedPatientId(patientId);
    if (convId)    setSelectedConvId(convId);
    setView(v);
  };

  // ── App-wide 🚨 escalation alerts ──────────────────────────────
  // Doctor joins their own personal room once, on mount, so they get
  // notified in real time no matter which chatbot screen they're on.
  useEffect(() => {
    let doctorId = '';
    try {
      const info = localStorage.getItem('medilink_user_info');
      if (info) doctorId = JSON.parse(info).id ?? '';
    } catch { /* ignore */ }
    if (!doctorId) return;

    const socket = socketIO(SOCKET_BASE, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join-doctor-room', { doctorId });

    socket.on('escalation-alert', (alert: EscalationAlert) => {
      setEscalationAlert(alert);
    });

    return () => { socket.disconnect(); };
  }, []);

  return (
    <div className="cb-app">
      <TopBar onMenuClick={() => setMenuOpen(true)} doctorName={doctorName || 'Doctor'} onLogout={onLogout} />

      {escalationAlert && (
        <div
          style={{
            background: '#DC2626', color: '#fff', padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 14, cursor: 'pointer',
          }}
          onClick={() => {
            goTo('chat', undefined, escalationAlert.conversationId);
            setEscalationAlert(null);
          }}
        >
          <span>
            🚨 <strong>Urgent patient message</strong> — matched "{escalationAlert.matchedKeyword}". Click to open chat.
          </span>
          <button
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); setEscalationAlert(null); }}
          >
            ×
          </button>
        </div>
      )}

      <div className="cb-shell">
        <Sidebar
          activePath={location.pathname}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
        />

        <div className="cb-content">

          {/* PAGE 1 — Dashboard */}
          {view === 'dashboard' && (
            <ChatbotDashboard
              onViewAllMessages={() => goTo('allchats')}
              onOpenChat={(pid, convId) => goTo('chat', pid, convId)}
              onNewMessage={() => goTo('allchats')}
              onOpenBroadcast={() => goTo('broadcast')}
              onOpenAISettings={() => goTo('ai-settings')}
              onOpenAnalytics={() => goTo('analytics')}
            />
          )}

          {/* PAGE 2 — All Chats list */}
          {view === 'allchats' && (
            <ChatbotAllChats
              onNewMessage={() => goTo('compose')}
              onOpenChat={(pid, convId) => goTo('chat', pid, convId)}
              onOpenBroadcast={() => goTo('broadcast')}
              onOpenAISettings={() => goTo('ai-settings')}
              onOpenAnalytics={() => goTo('analytics')}
              onBack={() => goTo('dashboard')}
            />
          )}

          {/* PAGE 3 — Compose new message */}
          {view === 'compose' && (
            <ChatbotCompose
              onBack={() => goTo('allchats')}
              onSent={() => goTo('allchats')}
              onSendAnother={() => goTo('compose')}
              onOpenBroadcast={() => goTo('broadcast')}
              onOpenAISettings={() => goTo('ai-settings')}
              onOpenAnalytics={() => goTo('analytics')}
            />
          )}

          {/* PAGE 5 — Individual chat */}
          {view === 'chat' && (
            <ChatbotMessages
              initialPatientId={selectedPatientId}
              initialConvId={selectedConvId}
              onBack={() => goTo('allchats')}
              onOpenNotifications={() => goTo('allchats')}
              onOpenProfile={(pid) => goTo('profile', pid)}
              onOpenFAQLibrary={() => goTo('faq-library')}
              onNewMessage={() => goTo('compose')}
              onOpenBroadcast={() => goTo('broadcast')}
              onOpenAISettings={() => goTo('ai-settings')}
              onOpenAnalytics={() => goTo('analytics')}
              onPatientSelect={(pid) => setSelectedPatientId(pid)}
            />
          )}

          {/* PAGE 6/7 — Patient Profile */}
          {view === 'profile' && (
            <ChatbotPatientProfile
              patientId={selectedPatientId}
              onBack={() => goTo('chat', selectedPatientId)}
              onJumpToChat={(pid) => goTo('chat', pid)}
              onOpenBroadcast={() => goTo('broadcast')}
              onOpenAISettings={() => goTo('ai-settings')}
              onOpenAnalytics={() => goTo('analytics')}
            />
          )}

          {/* PAGE 10 — FAQ Library full page */}
          {view === 'faq-library' && (
            <ChatbotFAQLibrary
              onBack={() => goTo('chat', selectedPatientId)}
              onOpenBroadcast={() => goTo('broadcast')}
              onOpenAISettings={() => goTo('ai-settings')}
              onOpenAnalytics={() => goTo('analytics')}
            />
          )}

          {/* PAGE 15 — Broadcast & Message History */}
          {view === 'broadcast' && (
            <ChatbotBroadcast
              onBack={() => goTo('allchats')}
              onNewMessage={() => goTo('compose')}
              onOpenAISettings={() => goTo('ai-settings')}
              onOpenAnalytics={() => goTo('analytics')}
            />
          )}
          {/* PAGE 16/17 — AI Bot Settings */}
          {view === 'ai-settings' && (
            <ChatbotAISettings
              onBack={() => goTo('allchats')}
            />
         )}

        {/* PAGE 18 — Analytics */}
        {view === 'analytics' && (
           <ChatbotAnalytics
           onBack={() => goTo('allchats')}
       />
          )}

        </div>
      </div>
    </div>
  );
}