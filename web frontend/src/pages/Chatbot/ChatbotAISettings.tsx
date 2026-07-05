// src/pages/Chatbot/ChatbotAISettings.tsx  — Pages 16 & 17
import { useState } from 'react';
import './Chatbot.css';
import './ChatbotAISettings.css';

interface Props { onBack: () => void; }

type SettingsTab = 'Bot Behavior' | 'Auto-Replies' | 'Escalation Rules' | 'Notifications' | 'Language';

const TABS: SettingsTab[] = ['Bot Behavior', 'Auto-Replies', 'Escalation Rules', 'Notifications', 'Language'];

const TAB_ICONS: Record<SettingsTab, string> = {
  'Bot Behavior':     '🤖',
  'Auto-Replies':     '💬',
  'Escalation Rules': '🚨',
  'Notifications':    '🔔',
  'Language':         '🌐',
};

const ESCALATION_KEYWORDS = ['emergency', 'suicidal', 'chest pain', 'overdose'];

export default function ChatbotAISettings({ onBack }: Props) {
  const [activeTab, setActiveTab]   = useState<SettingsTab>('Bot Behavior');
  const [autoReply, setAutoReply]   = useState(true);
  const [faqAuto, setFaqAuto]       = useState(true);
  const [welcome, setWelcome]       = useState(true);
  const [showLabel, setShowLabel]   = useState(true);
  const [confidence, setConfidence] = useState(80);
  const [from, setFrom]             = useState('08:00');
  const [to, setTo]                 = useState('22:00');
  const [always, setAlways]         = useState(false);
  const [keywords, setKeywords]     = useState(ESCALATION_KEYWORDS);
  const [newKw, setNewKw]           = useState('');
  const [saved, setSaved]           = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addKeyword() {
    const kw = newKw.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords(prev => [...prev, kw]);
      setNewKw('');
    }
  }

  return (
    <div className="cb-main">
      <div className="cb-page-header">
        <div>
          <div className="cb-page-title">AI Bot Settings</div>
          <div className="cb-page-sub">Configure chatbot behavior, auto-reply rules and escalation triggers</div>
        </div>
        <button className="cb-btn cb-btn-light cb-btn-sm" onClick={onBack}>← Back</button>
      </div>

      <div className="cbas-layout">
        {/* ── Left tab nav ── */}
        <div className="cbas-sidenav">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`cbas-sidenav-item${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <span className="cbas-sidenav-icon">{TAB_ICONS[tab]}</span>
              {tab}
            </button>
          ))}
        </div>

        {/* ── Right content ── */}
        <div className="cbas-content cb-card">
          {activeTab === 'Bot Behavior' && (
            <div>
              <div className="cbas-section-title">Bot Behavior</div>
              <div className="cbas-section-sub">Control how the MediLink AI chatbot responds to patient messages.</div>

              {/* Toggle rows */}
              {[
                { label: 'Enable AI Auto-Reply',  sub: 'Allow the AI bot to automatically respond to patient messages', val: autoReply, set: setAutoReply },
                { label: 'FAQ Auto-Response',     sub: 'Automatically match patient questions to FAQ library entries',   val: faqAuto,   set: setFaqAuto   },
                { label: 'Welcome Message',       sub: 'Send an automated greeting when a patient opens the chat',       val: welcome,   set: setWelcome   },
                { label: 'Show AI Label',         sub: 'Display "MediLink AI (Auto)" tag on bot-generated replies',      val: showLabel, set: setShowLabel },
              ].map(item => (
                <div key={item.label} className="cbas-toggle-row">
                  <div className="cbas-toggle-info">
                    <div className="cbas-toggle-label">{item.label}</div>
                    <div className="cbas-toggle-sub">{item.sub}</div>
                  </div>
                  <label className="cb-toggle">
                    <input type="checkbox" checked={item.val} onChange={() => item.set(!item.val)} />
                    <span className="cb-toggle-slider" />
                  </label>
                </div>
              ))}

              {/* Confidence slider */}
              <div className="cbas-section-block">
                <div className="cbas-toggle-label">Response Confidence Threshold</div>
                <div className="cbas-toggle-sub" style={{ marginBottom: 14 }}>
                  Only auto-reply when AI confidence is above this level. Lower = more replies, higher = more accurate.
                </div>
                <div className="cbas-slider-row">
                  <span className="cbas-slider-min">50%</span>
                  <input
                    type="range" min={50} max={100} value={confidence}
                    onChange={e => setConfidence(Number(e.target.value))}
                    className="cbas-slider"
                  />
                  <span className="cbas-slider-val">{confidence}%</span>
                </div>
              </div>

              {/* Auto-reply hours */}
              <div className="cbas-section-block">
                <div className="cbas-toggle-label">Auto-Reply Hours</div>
                <div className="cbas-toggle-sub" style={{ marginBottom: 12 }}>
                  Restrict AI auto-replies to specific hours only.
                </div>
                <div className="cbas-hours-row">
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>From</div>
                    <input type="time" value={from} onChange={e => setFrom(e.target.value)} className="cbas-time-input" disabled={always} />
                  </div>
                  <span className="cbas-dash">—</span>
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>To</div>
                    <input type="time" value={to} onChange={e => setTo(e.target.value)} className="cbas-time-input" disabled={always} />
                  </div>
                  <label className="cbas-always-label">
                    <input type="checkbox" checked={always} onChange={() => setAlways(!always)} />
                    24/7 Always on
                  </label>
                </div>
              </div>

              {/* Escalation keywords */}
              <div className="cbas-section-block">
                <div className="cbas-toggle-label">Escalation Trigger</div>
                <div className="cbas-toggle-sub" style={{ marginBottom: 12 }}>
                  AI will notify you to take over when these keywords are detected.
                </div>
                <div className="cbas-keywords-wrap">
                  {keywords.map(kw => (
                    <span key={kw} className="cbas-keyword">
                      {kw}
                      <button
                        className="cbas-keyword-x"
                        onClick={() => setKeywords(prev => prev.filter(k => k !== kw))}
                      >×</button>
                    </span>
                  ))}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      className="cbas-kw-input"
                      type="text"
                      placeholder="+ Add Keyword"
                      value={newKw}
                      onChange={e => setNewKw(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addKeyword()}
                    />
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="cbas-footer">
                <button className="cb-btn cb-btn-light">Reset to Default</button>
                <button
                  className="cb-btn cb-btn-primary"
                  style={{ background: saved ? '#22C55E' : undefined }}
                  onClick={handleSave}
                >
                  {saved ? '✓ Saved!' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'Bot Behavior' && (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{TAB_ICONS[activeTab]}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{activeTab} — Coming soon</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}