// src/pages/Chatbot/ChatbotAISettings.tsx  — Pages 16 & 17
// Real data: GET/PUT /api/chat/bot-settings (BotSettings model)

import { useState, useEffect } from 'react';
import './Chatbot.css';
import './ChatbotAISettings.css';
import { chatApi } from '../../types/api';
import type { BotSettingsData } from '../../types/api';

interface Props { onBack: () => void; }

type SettingsTab = 'Bot Behavior' | 'AI Prompt' | 'Escalation Rules';

const TABS: SettingsTab[] = ['Bot Behavior', 'AI Prompt', 'Escalation Rules'];

const TAB_ICONS: Record<SettingsTab, string> = {
  'Bot Behavior':     '🤖',
  'AI Prompt':        '✍️',
  'Escalation Rules': '🚨',
};

const MODEL_OPTIONS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-haiku-4-20250514',
];

const ESCALATION_KEYWORDS = ['emergency', 'suicidal', 'chest pain', 'overdose'];

export default function ChatbotAISettings({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('Bot Behavior');

  // ── Real settings state (loaded from / saved to MongoDB) ──────
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [saved, setSaved]           = useState(false);

  const [isActive, setIsActive]           = useState(true);
  const [always, setAlways]               = useState(true);
  const [from, setFrom]                   = useState('18:00');
  const [to, setTo]                       = useState('08:00');
  const [confidence, setConfidence]       = useState(60);
  const [systemPrompt, setSystemPrompt]   = useState('');
  const [model, setModel]                 = useState(MODEL_OPTIONS[0]);

  // UI-only extras (not backed by the BotSettings schema yet)
  const [keywords, setKeywords] = useState(ESCALATION_KEYWORDS);
  const [newKw, setNewKw]       = useState('');

  // ── Load current settings on mount ─────────────────────────────
  useEffect(() => {
    chatApi.getBotSettings()
      .then(s => {
        setIsActive(s.isActive);
        setAlways(s.autoReplyMode === 'always');
        setFrom(s.offHoursStart || '18:00');
        setTo(s.offHoursEnd || '08:00');
        setConfidence(s.faqConfidenceThreshold ?? 60);
        setSystemPrompt(s.systemPrompt || '');
        setModel(s.model || MODEL_OPTIONS[0]);
      })
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Failed to load bot settings.'))
      .finally(() => setLoading(false));
  }, []);

  function addKeyword() {
    const kw = newKw.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords(prev => [...prev, kw]);
      setNewKw('');
    }
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const autoReplyMode: BotSettingsData['autoReplyMode'] =
        !isActive ? 'never' : always ? 'always' : 'off_hours';

      const updated = await chatApi.updateBotSettings({
        isActive,
        autoReplyMode,
        systemPrompt,
        model,
        faqConfidenceThreshold: confidence,
        offHoursStart: from,
        offHoursEnd:   to,
      });

      // Re-sync from server response (source of truth)
      setIsActive(updated.isActive);
      setAlways(updated.autoReplyMode === 'always');
      setConfidence(updated.faqConfidenceThreshold);
      setSystemPrompt(updated.systemPrompt);
      setModel(updated.model);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="cb-main">
        <div className="cb-page-header">
          <div className="cb-page-title">AI Bot Settings</div>
          <button className="cb-btn cb-btn-light cb-btn-sm" onClick={onBack}>← Back</button>
        </div>
        <div className="cb-card" style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading bot settings…</div>
      </div>
    );
  }

  return (
    <div className="cb-main">
      <div className="cb-page-header">
        <div>
          <div className="cb-page-title">AI Bot Settings</div>
          <div className="cb-page-sub">Configure chatbot behavior, AI prompt and escalation triggers — saved to your account</div>
        </div>
        <button className="cb-btn cb-btn-light cb-btn-sm" onClick={onBack}>← Back</button>
      </div>

      {loadError && (
        <div style={{ background: '#FEE2E2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {loadError}
        </div>
      )}

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

              <div className="cbas-toggle-row">
                <div className="cbas-toggle-info">
                  <div className="cbas-toggle-label">Enable AI Auto-Reply</div>
                  <div className="cbas-toggle-sub">Allow the AI bot to automatically respond to patient messages</div>
                </div>
                <label className="cb-toggle">
                  <input type="checkbox" checked={isActive} onChange={() => setIsActive(v => !v)} />
                  <span className="cb-toggle-slider" />
                </label>
              </div>

              {/* Confidence slider — real, drives FAQ vs Claude fallback */}
              <div className="cbas-section-block">
                <div className="cbas-toggle-label">FAQ Match Confidence Threshold</div>
                <div className="cbas-toggle-sub" style={{ marginBottom: 14 }}>
                  Patient messages matching an FAQ above this confidence get the FAQ answer instantly.
                  Below this, the bot falls back to the Claude AI model.
                </div>
                <div className="cbas-slider-row">
                  <span className="cbas-slider-min">0%</span>
                  <input
                    type="range" min={0} max={100} value={confidence}
                    onChange={e => setConfidence(Number(e.target.value))}
                    className="cbas-slider"
                    disabled={!isActive}
                  />
                  <span className="cbas-slider-val">{confidence}%</span>
                </div>
              </div>

              {/* Auto-reply hours */}
              <div className="cbas-section-block">
                <div className="cbas-toggle-label">Auto-Reply Hours</div>
                <div className="cbas-toggle-sub" style={{ marginBottom: 12 }}>
                  Restrict AI auto-replies to specific hours only (e.g. only reply after clinic hours).
                </div>
                <div className="cbas-hours-row">
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>From</div>
                    <input type="time" value={from} onChange={e => setFrom(e.target.value)} className="cbas-time-input" disabled={always || !isActive} />
                  </div>
                  <span className="cbas-dash">—</span>
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>To</div>
                    <input type="time" value={to} onChange={e => setTo(e.target.value)} className="cbas-time-input" disabled={always || !isActive} />
                  </div>
                  <label className="cbas-always-label">
                    <input type="checkbox" checked={always} onChange={() => setAlways(v => !v)} disabled={!isActive} />
                    24/7 Always on
                  </label>
                </div>
              </div>

              {/* Model select */}
              <div className="cbas-section-block">
                <div className="cbas-toggle-label">AI Model</div>
                <div className="cbas-toggle-sub" style={{ marginBottom: 10 }}>
                  Model used for the Claude API fallback replies (when no FAQ matches).
                </div>
                <select
                  className="cb-input"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  style={{ maxWidth: 320 }}
                >
                  {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'AI Prompt' && (
            <div>
              <div className="cbas-section-title">AI System Prompt</div>
              <div className="cbas-section-sub">
                This instructs the AI on tone, boundaries, and how to talk to your patients.
                Changes apply to every future auto-reply immediately after saving.
              </div>
              <textarea
                className="cbfaq-editor"
                rows={10}
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful medical assistant for a doctor's clinic..."
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {activeTab === 'Escalation Rules' && (
            <div>
              <div className="cbas-section-title">Escalation Trigger Keywords</div>
              <div className="cbas-section-sub" style={{ marginBottom: 12 }}>
                (Preview feature) When these keywords appear in a patient message, you'll want to
                review and respond personally instead of relying on the AI auto-reply.
              </div>
              <div className="cbas-keywords-wrap">
                {keywords.map(kw => (
                  <span key={kw} className="cbas-keyword">
                    {kw}
                    <button className="cbas-keyword-x" onClick={() => setKeywords(prev => prev.filter(k => k !== kw))}>×</button>
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
          )}

          {/* Save bar — always visible */}
          <div className="cbas-footer">
            {saveError && (
              <div style={{ color: '#DC2626', fontSize: 12.5, marginRight: 'auto' }}>⚠️ {saveError}</div>
            )}
            <button
              className="cb-btn cb-btn-primary"
              style={{ background: saved ? '#22C55E' : undefined }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
