import React from 'react';
import type { AggregatedAnalysisResult } from '../../types/ai';
import {
  X, Sparkles, Moon, Wind, Zap, Star, Crosshair, HeartPulse, Users,
} from 'lucide-react';

interface SuggestionReviewModalProps {
  isOpen: boolean;
  aggregatedResult: AggregatedAnalysisResult | null;
  onAccept: () => void;
  onModify: () => void;
  onSkip: () => void;
  onCancel: () => void;
}

/* ── small mood emoji + colour per mood ── */
const MOOD_EMOJI: Record<string, string> = {
  great: '😊', good: '🙂', okay: '😐', sad: '😔', terrible: '😫',
};
const MOOD_BG: Record<string, string> = {
  great: '#d1fae5', good: '#dbeafe', okay: '#fef9c3', sad: '#ede9fe', terrible: '#fee2e2',
};
const MOOD_TEXT: Record<string, string> = {
  great: '#059669', good: '#1d4ed8', okay: '#b45309', sad: '#7c3aed', terrible: '#dc2626',
};

/* ── icon + colour per suggestion key ── */
const METRIC_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  sleepLevel:        { icon: <Moon        size={15} strokeWidth={1.75} />, label: 'Sleep Level',        color: '#6366f1' },
  anxietyLevel:      { icon: <Wind        size={15} strokeWidth={1.75} />, label: 'Anxiety Level',      color: '#06b6d4' },
  energyLevel:       { icon: <Zap         size={15} strokeWidth={1.75} />, label: 'Energy Level',       color: '#f59e0b' },
  motivationLevel:   { icon: <Star        size={15} strokeWidth={1.75} />, label: 'Motivation Level',   color: '#8b5cf6' },
  focusLevel:        { icon: <Crosshair   size={15} strokeWidth={1.75} />, label: 'Focus Level',        color: '#0ea5e9' },
  stressLevel:       { icon: <HeartPulse  size={15} strokeWidth={1.75} />, label: 'Stress Level',       color: '#ef4444' },
  socialInteraction: { icon: <Users       size={15} strokeWidth={1.75} />, label: 'Social Interaction', color: '#10b981' },
};

/* fixed display order */
const METRIC_ORDER = [
  'sleepLevel', 'anxietyLevel', 'energyLevel',
  'motivationLevel', 'focusLevel', 'stressLevel', 'socialInteraction',
];

const VALID_ANSWER_LABELS: Record<string, Record<number, { emoji: string; label: string }>> = {
  sleepLevel: {
    2: { emoji: "😴", label: "I slept very poorly" },
    5: { emoji: "😕", label: "I slept okay but not very well" },
    8: { emoji: "🙂", label: "I slept well" },
    10: { emoji: "😄", label: "I had a very restful sleep" },
  },
  anxietyLevel: {
    2: { emoji: "😌", label: "Very calm and relaxed" },
    4: { emoji: "🙂", label: "Mild anxiety, easily manageable" },
    7: { emoji: "😟", label: "Moderate anxiety, somewhat disruptive" },
    10: { emoji: "😣", label: "Severe anxiety or panic" },
  },
  energyLevel: {
    2: { emoji: "🪫", label: "Completely exhausted or drained" },
    5: { emoji: "😐", label: "Low energy, sluggish" },
    8: { emoji: "⚡", label: "Moderate energy, able to function fine" },
    10: { emoji: "🔥", label: "High energy, alert and active" },
  },
  motivationLevel: {
    2: { emoji: "🛋️", label: "No motivation, hard to start tasks" },
    5: { emoji: "😐", label: "Low motivation, pushing through" },
    8: { emoji: "📈", label: "Moderate motivation" },
    10: { emoji: "🚀", label: "Highly motivated and inspired" },
  },
  focusLevel: {
    2: { emoji: "🌫️", label: "Very foggy, couldn't concentrate" },
    5: { emoji: "😐", label: "Easily distracted" },
    8: { emoji: "🎯", label: "Moderate focus" },
    10: { emoji: "🧠", label: "Sharp focus, in the zone" },
  },
  stressLevel: {
    2: { emoji: "🌴", label: "Very low stress" },
    4: { emoji: "🙂", label: "Manageable stress" },
    7: { emoji: "😓", label: "High stress, feeling overwhelmed" },
    10: { emoji: "💥", label: "Extreme stress or burnout" },
  },
  socialInteraction: {
    2: { emoji: "😶", label: "Complete isolation, avoided everyone" },
    5: { emoji: "👋", label: "Minimal interaction" },
    8: { emoji: "🗣️", label: "Moderate social interaction" },
    10: { emoji: "🎉", label: "Very social, connected with others" },
  },
};

const snapVal = (key: string, val: number | null | undefined): number => {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  const opts = Object.keys(VALID_ANSWER_LABELS[key] || {}).map(Number);
  if (!opts.length) return val;
  let closest = opts[0];
  let minDiff = Math.abs(val - closest);
  for (const o of opts) {
    if (Math.abs(val - o) < minDiff) {
      minDiff = Math.abs(val - o);
      closest = o;
    }
  }
  return closest;
};

const SuggestionReviewModal: React.FC<SuggestionReviewModalProps> = ({
  isOpen,
  aggregatedResult,
  onAccept,
  onModify,
  onSkip,
  onCancel,
}) => {
  if (!isOpen || !aggregatedResult) return null;

  const { aiSuggestions, detectedMood, uiState } = aggregatedResult;
  const moodKey = detectedMood?.mood?.toLowerCase() ?? '';

  return (
    /* Overlay */
    <div style={styles.overlay} onClick={onCancel}>
      {/* Card — stop propagation so clicking inside doesn't close */}
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={styles.headerRow}>
          <div style={styles.headerLeft}>
            <Sparkles size={18} strokeWidth={1.75} style={{ color: '#0C5BD5', marginRight: 8, flexShrink: 0 }} />
            <span style={styles.headerTitle}>AI Suggestions</span>
          </div>
          <button style={styles.closeBtn} onClick={onCancel} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <p style={styles.subtitle}>Based on your camera, voice, and journal inputs.</p>

        {/* ── Detected mood card ── */}
        {uiState.showDetectedMood && detectedMood && (
          <div style={{
            ...styles.moodCard,
            background: MOOD_BG[moodKey] ?? '#f0f9ff',
          }}>
            {/* small emoji circle */}
            <div style={{
              ...styles.moodEmojiCircle,
              background: MOOD_BG[moodKey] ?? '#dbeafe',
              border: `2px solid ${MOOD_TEXT[moodKey] ?? '#2563eb'}40`,
            }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                {MOOD_EMOJI[moodKey] ?? '😐'}
              </span>
            </div>
            <div>
              <div style={styles.moodDetectedLabel}>
                Detected mood:{' '}
                <span style={{ color: MOOD_TEXT[moodKey] ?? '#1d4ed8', fontWeight: 700, textTransform: 'capitalize' }}>
                  {detectedMood.mood}
                </span>
              </div>
              <div style={{ ...styles.moodConfidence, color: MOOD_TEXT[moodKey] ?? '#2563eb' }}>
                {Math.round(detectedMood.confidence * 100)}% confidence
              </div>
            </div>
          </div>
        )}

        {/* ── Wellbeing insights list ── */}
        {uiState.showSuggestions && (
          <>
            <div style={styles.insightsTitle}>Suggested wellbeing insights</div>
            <div style={styles.metricList}>
              {METRIC_ORDER.map((key) => {
                const meta   = METRIC_META[key];
                const detail = aiSuggestions[key as keyof typeof aiSuggestions];
                const hasVal = detail && detail.value !== null;
                return (
                  <div key={key} style={styles.metricRow}>
                    {/* icon */}
                    <div style={{ ...styles.metricIcon, color: meta?.color ?? '#6b7280' }}>
                      {meta?.icon}
                    </div>
                    {/* label */}
                    <div style={styles.metricLabel}>
                      {meta?.label ?? key}
                      {hasVal && VALID_ANSWER_LABELS[key]?.[snapVal(key, detail!.value)] && (
                        <div style={{ fontSize: '0.75rem', color: '#4b5563', fontWeight: 500, marginTop: '2px' }}>
                          {VALID_ANSWER_LABELS[key][snapVal(key, detail!.value)].emoji}{' '}
                          {VALID_ANSWER_LABELS[key][snapVal(key, detail!.value)].label}
                        </div>
                      )}
                    </div>
                    {/* value / evidence */}
                    <div style={styles.metricRight}>
                      {hasVal ? (
                        <div style={styles.metricValueWrap}>
                          <span style={styles.metricValue}>{snapVal(key, detail!.value)}</span>
                          <span style={styles.metricConfBadge}>
                            {Math.round(detail!.confidence * 100)}% confidence
                          </span>
                        </div>
                      ) : (
                        <span style={styles.metricNoEvidence}>Not enough evidence</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Action buttons ── */}
        <div style={styles.actions}>
          {(uiState.allowAcceptAll || uiState.allowModify) && (
            <button
              style={styles.btnPrimary}
              onClick={uiState.allowAcceptAll ? onAccept : onModify}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#0a44a0')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#0C5BD5')}
            >
              Use Suggestion
            </button>
          )}
          {(uiState.allowSkip || uiState.allowCancel) && (
            <button
              style={styles.btnCancel}
              onClick={uiState.allowSkip ? onSkip : onCancel}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#374151')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
            >
              Cancel
            </button>
          )}
        </div>

        {/* ── Disclaimer ── */}
        <p style={styles.disclaimer}>
          AI generated insights are supportive suggestions and may not fully reflect your feelings.
        </p>
      </div>
    </div>
  );
};

/* ── Inline styles ── */
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.45)',
    padding: '1rem',
  },
  card: {
    background: '#ffffff',
    borderRadius: '1rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '420px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.375rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#111827',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    padding: '0.25rem',
    borderRadius: '0.375rem',
    transition: 'color 0.15s',
  },
  subtitle: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    margin: '0 0 1rem 0',
  },
  /* Detected mood */
  moodCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    borderRadius: '0.75rem',
    padding: '0.875rem 1rem',
    marginBottom: '1.25rem',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  moodEmojiCircle: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  moodDetectedLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.2rem',
  },
  moodConfidence: {
    fontSize: '0.8125rem',
    fontWeight: 600,
  },
  /* Insights */
  insightsTitle: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '0.625rem',
  },
  metricList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    marginBottom: '1.25rem',
  },
  metricRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.625rem 0',
    borderBottom: '1px solid #f3f4f6',
    gap: '0.625rem',
  },
  metricIcon: {
    flexShrink: 0,
    width: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#374151',
    flex: 1,
  },
  metricRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  metricValueWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.2rem',
  },
  metricValue: {
    fontSize: '0.9375rem',
    fontWeight: 800,
    color: '#111827',
  },
  metricConfBadge: {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: '#ffffff',
    background: '#0C5BD5',
    padding: '0.1rem 0.4rem',
    borderRadius: '9999px',
  },
  metricNoEvidence: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  /* Buttons */
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  btnPrimary: {
    width: '100%',
    background: '#0C5BD5',
    color: 'white',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '0.625rem',
    fontSize: '0.9375rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  btnCancel: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: '#6b7280',
    padding: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  disclaimer: {
    fontSize: '0.7rem',
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    margin: 0,
    lineHeight: 1.5,
  },
};

export default SuggestionReviewModal;
