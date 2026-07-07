import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from "../../components/Sidebar";
import CheckInStepper from '../../components/check-in/CheckInStepper';
import { useMoodStore } from "../../store/moodStore";
import './CheckInPage1.css';
import { useSpeechAnalysis } from '../../hooks/ai/useSpeechAnalysis';
import { useEmotionSuggestions } from '../../hooks/ai/useEmotionSuggestions';
import SuggestionReviewModal from '../../components/ai/SuggestionReviewModal';
import { analyzeCombined } from '../../api/aiApi';
import type { AggregatedAnalysisResult } from '../../types/ai';
import { Camera, Mic, BookOpen, Sparkles, Shield } from 'lucide-react';
import { InlineAlert } from '../../components/ui';

type DetectionStatus = 'idle' | 'loading' | 'success' | 'failed' | 'error';

const MOOD_EMOJI: Record<string, string> = {
  great: '😊', good: '🙂', okay: '😐', sad: '😔', terrible: '😫',
};
const MOOD_COLOR: Record<string, string> = {
  great: '#10b981', good: '#3b82f6', okay: '#f59e0b', sad: '#8b5cf6', terrible: '#ef4444',
};

const CheckInPage1: React.FC = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const setCurrentCheckIn = useMoodStore((s: any) => s.setCurrentCheckIn);
  const currentCheckIn  = useMoodStore((s: any) => s.currentCheckIn);

  const [selectedMood, setSelectedMood]       = useState<string>('');
  const [note, setNote]                       = useState<string>('');
  const [detectedMood, setDetectedMood]       = useState<string>('');
  const [detectedConfidence, setDetectedConf] = useState<number>(0);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>('idle');
  const [detectionError, setDetectionError]   = useState<string>('');
  const [pageError, setPageError]             = useState<string>('');
  const [pageSuccess, setPageSuccess]         = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);

  const { performAnalysis: analyzeSpeechAudio, loading: speechLoading } = useSpeechAnalysis();
  const { aggregatedResult, isReviewing, triggerReview, acceptSuggestions, skipSuggestions } = useEmotionSuggestions();
  const [combinedLoading, setCombinedLoading] = useState(false);
  const [isRecording, setIsRecording]         = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('moodDraft');
    if (saved) {
      const d = JSON.parse(saved);
      if (d.mood) setSelectedMood(d.mood);
      if (d.note) setNote(d.note);
      if (d.levels || d.aiFields) {
        setCurrentCheckIn({
          ...currentCheckIn,
          ...(d.mood ? { mood: d.mood } : {}),
          ...(d.note ? { note: d.note } : {}),
          ...(d.levels ? { levels: d.levels } : {}),
          ...(d.aiFields ? { aiFields: d.aiFields } : {}),
        });
      }
    } else if (currentCheckIn.mood) {
      setSelectedMood(currentCheckIn.mood);
      setNote(currentCheckIn.note);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const moodOptions = [
    { value: 'terrible', label: 'Terrible', emoji: '😫' },
    { value: 'sad',      label: 'Sad',      emoji: '😔' },
    { value: 'okay',     label: 'Okay',     emoji: '😐' },
    { value: 'good',     label: 'Good',     emoji: '🙂' },
    { value: 'great',    label: 'Great',    emoji: '😊' },
  ];

  const saveDraft = (mood: string, n: string) => {
    const draftData = {
      mood,
      note: n,
      date: formattedDate,
      levels: currentCheckIn.levels,
      aiFields: currentCheckIn.aiFields || {},
    };
    setCurrentCheckIn(draftData);
    localStorage.setItem('moodDraft', JSON.stringify(draftData));
  };

  const handleMoodSelect    = (mood: string) => setSelectedMood(mood);
  const handleSaveForLater  = () => { saveDraft(selectedMood, note); navigate('/dashboard'); };
  const handleContinue      = () => {
    if (!selectedMood) { setPageError('Please select a mood to continue'); return; }
    saveDraft(selectedMood, note);
    navigate('/check-in/details', { state: { mood: selectedMood, note, date: formattedDate } });
  };

  /* ── Voice recording ── */
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr     = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current   = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const res = await analyzeSpeechAudio(blob);
          let updated = note;
          if (res.speechTranscript) { updated = note + (note ? '\n' : '') + res.speechTranscript; setNote(updated); }
          setCombinedLoading(true);
          const r = await analyzeCombined({ journalText: updated, cameraData: detectedMood ? { mood: detectedMood, confidence: detectedConfidence } : undefined });
          if (r) triggerReview(r);
        } catch (e) { console.error(e); setPageError('Failed to analyze voice'); }
        finally { setCombinedLoading(false); }
      };
      mr.start();
      setIsRecording(true);
    } catch (e) { console.error(e); setPageError('Could not access microphone'); }
  };
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  /* ── Note analysis ── */
  const handleAnalyzeNote = async () => {
    if (!note.trim() && !detectedMood) { setPageError('Please write a note or detect a mood first.'); return; }
    setCombinedLoading(true);
    try {
      const r = await analyzeCombined({ journalText: note, cameraData: detectedMood ? { mood: detectedMood, confidence: detectedConfidence } : undefined });
      if (r) triggerReview(r);
    } catch (e) { console.error(e); setPageError('Failed to run combined analysis'); }
    finally { setCombinedLoading(false); }
  };

  const VALID_LEVEL_OPTIONS: Record<string, number[]> = {
    sleepLevel: [2, 5, 8, 10],
    anxietyLevel: [2, 4, 7, 10],
    energyLevel: [2, 5, 8, 10],
    motivationLevel: [2, 5, 8, 10],
    socialInteraction: [2, 5, 8, 10],
    stressLevel: [2, 4, 7, 10],
    focusLevel: [2, 5, 8, 10],
  };

  const snapToClosestOption = (key: string, val: number): number => {
    const options = VALID_LEVEL_OPTIONS[key];
    if (!options) return Math.min(10, Math.max(1, val));
    let closest = options[0];
    let minDiff = Math.abs(val - closest);
    for (const opt of options) {
      const diff = Math.abs(val - opt);
      if (diff < minDiff) {
        minDiff = diff;
        closest = opt;
      }
    }
    return closest;
  };

  /* ── Accept / modify suggestions ── */
  const applyResult = (result: AggregatedAnalysisResult) => {
    const levels: any = {};
    const aiFields: any = {};
    if (result.aiSuggestions) {
      Object.entries(result.aiSuggestions).forEach(([k, d]) => {
        if (d && d.value !== null) {
          const snappedVal = snapToClosestOption(k, d.value);
          levels[k] = snappedVal;
          aiFields[k] = snappedVal;
        }
      });
    }
    const newMood = result.detectedMood?.mood ?? currentCheckIn.mood;
    setCurrentCheckIn({
      ...currentCheckIn,
      mood: newMood,
      levels: { ...currentCheckIn.levels, ...levels },
      aiFields: { ...currentCheckIn.aiFields, ...aiFields },
    });
    if (result.detectedMood?.mood) setSelectedMood(result.detectedMood.mood);
  };
  const handleAcceptSuggestions = () => { acceptSuggestions((r) => { applyResult(r); setPageSuccess('AI suggestions applied to your check-in.'); }); };
  const handleModifySuggestions = () => { acceptSuggestions(applyResult); };

  /* ── Camera detection ── */
  const handleDetectMood = async () => {
    setDetectionStatus('loading');
    setDetectedMood('');
    setDetectedConf(0);
    setDetectionError('');
    let stream: MediaStream | null = null;
    try {
      const [tf, faceapi] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@vladmandic/face-api')
      ]);
      await tf.setBackend('webgl');
      await tf.ready();
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
      }
      if (!faceapi.nets.faceExpressionNet.isLoaded) {
        await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
      }

      const video = videoRef.current;
      if (!video) { setDetectionStatus('error'); setDetectionError('Video element not available.'); return; }

      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      await video.play();
      await new Promise(r => setTimeout(r, 800));

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
        .withFaceExpressions();

      stream.getTracks().forEach(t => t.stop());
      video.srcObject = null;

      if (detection?.expressions) {
        const exps = detection.expressions as unknown as Record<string, number>;
        const [expr, conf] = Object.entries(exps).reduce((a, b) => a[1] > b[1] ? a : b);
        const moodMap: Record<string, string> = {
          happy: 'great', neutral: 'okay', sad: 'sad',
          angry: 'terrible', fearful: 'terrible', disgusted: 'terrible', surprised: 'good',
        };
        const mapped = moodMap[expr] || 'okay';
        setDetectedMood(mapped);
        setDetectedConf(conf);
        setDetectionStatus('success');
      } else {
        setDetectionStatus('failed');
        setDetectionError('No face detected. Please ensure your face is clearly visible and well-lit, then try again.');
      }
    } catch (err: any) {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      console.error(err);
      setDetectionStatus('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        setDetectionError('Camera permission denied. Please allow camera access in your browser settings.');
      else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')
        setDetectionError('No camera found. Please connect a camera and try again.');
      else if (err.name === 'NotReadableError')
        setDetectionError('Camera is in use by another app. Please close other apps using the camera.');
      else
        setDetectionError('Failed to detect mood. Please check your camera and try again.');
    }
  };

  const confirmDetectedMood  = () => { if (detectedMood) setSelectedMood(detectedMood); setDetectionStatus('idle'); setDetectedMood(''); };
  const dismissDetectedMood  = () => { setDetectedMood(''); setDetectionStatus('idle'); };
  const resetDetection       = () => { setDetectionStatus('idle'); setDetectedMood(''); setDetectedConf(0); setDetectionError(''); };

  /* ──────────────── Render ──────────────── */
  return (
    <div className="page-container">
      <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`main-content ${collapsed ? 'collapsed' : 'expanded'}`}>
        <div className="header">
          <h1>Daily Check-in</h1>
          <p>{formattedDate}</p>
        </div>

        <CheckInStepper currentStep={1} />

        {pageError && (
          <div className="mb-4 animate-slide-in">
            <InlineAlert type="error" message={pageError} onClose={() => setPageError('')} />
          </div>
        )}
        {pageSuccess && (
          <div className="mb-4 animate-slide-in">
            <InlineAlert type="success" message={pageSuccess} autoCloseMs={4000} onClose={() => setPageSuccess('')} />
          </div>
        )}

        <div className="card">
          <h2>How are you feeling right now?</h2>

          <div className="mood-grid">
            {moodOptions.map((m) => (
              <button
                key={m.value}
                onClick={() => handleMoodSelect(m.value)}
                className={`mood-btn ${selectedMood === m.value ? 'active' : ''}`}
              >
                <div className="emoji">{m.emoji}</div>
                <div>{m.label}</div>
              </button>
            ))}
          </div>

          {/* ═══ Smart Mood Assistant ═══ */}
          <div className="sma-box">

            {/* Header */}
            <div className="sma-header-row">
              <div className="sma-header-icon-wrap">
                <Sparkles size={18} strokeWidth={1.75} />
              </div>
              <div className="sma-header-info">
                <span className="sma-title">Smart Mood Assistant</span>
                <span className="sma-optional-badge">Optional</span>
              </div>
            </div>
            <p className="sma-subtitle">
              Use camera, voice, or a journal note to get a gentle mood suggestion. You can review and change it before continuing.
            </p>
            <div className="sma-privacy-row">
              <Shield size={13} strokeWidth={2} style={{ flexShrink: 0, color: '#64748b' }} />
              <span>Camera analysis runs in your browser. No image is stored.</span>
            </div>

            {/* ── 2-column: Camera | Voice ── */}
            <div className="sma-tools-grid">

              {/* Camera Mood Card */}
              <div className="sma-tool-card">
                <div className="sma-tool-header">
                  <div className="sma-tool-icon sma-icon-cam">
                    <Camera size={20} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="sma-tool-name">Camera Mood</div>
                    <div className="sma-tool-desc">Detect facial expression using your webcam.</div>
                  </div>
                </div>

                {detectionStatus === 'idle' && (
                  <button onClick={handleDetectMood} className="sma-cam-btn">
                    <Camera size={15} strokeWidth={2} /> Detect mood
                  </button>
                )}

                {detectionStatus === 'loading' && (
                  <div className="sma-loading-row">
                    <div className="sma-spinner" />
                    <span className="sma-loading-text">Analyzing expression…</span>
                  </div>
                )}

                {detectionStatus === 'success' && detectedMood && (
                  <div className="sma-result-card">
                    <div className="sma-result-mood-row">
                      <span className="sma-result-emoji">{MOOD_EMOJI[detectedMood]}</span>
                      <div className="sma-result-info">
                        <span className="sma-result-name" style={{ color: MOOD_COLOR[detectedMood] }}>
                          {detectedMood}
                        </span>
                        <div className="sma-conf-row">
                          <span className="sma-conf-label">Confidence</span>
                          <div className="sma-conf-bar">
                            <div
                              className="sma-conf-fill"
                              style={{ width: `${Math.round(detectedConfidence * 100)}%`, background: MOOD_COLOR[detectedMood] }}
                            />
                          </div>
                          <span className="sma-conf-pct">{Math.round(detectedConfidence * 100)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="sma-result-actions">
                      <button onClick={confirmDetectedMood}  className="sma-btn-accept">✓ Accept</button>
                      <button onClick={handleDetectMood}     className="sma-btn-retry">🔄 Retry</button>
                      <button onClick={dismissDetectedMood}  className="sma-btn-cancel">✕</button>
                    </div>
                  </div>
                )}

                {detectionStatus === 'failed' && (
                  <div className="sma-failed-card">
                    <div className="sma-failed-header-row">
                      <span className="sma-failed-emoji">😶</span>
                      <div>
                        <div className="sma-failed-title">No Face Detected</div>
                        <div className="sma-failed-desc">Ensure you're visible and well-lit.</div>
                      </div>
                    </div>
                    <ul className="sma-tips-list">
                      <li>💡 Face the camera directly</li>
                      <li>💡 Good lighting, avoid backlight</li>
                      <li>💡 Move closer to the camera</li>
                    </ul>
                    <div className="sma-result-actions">
                      <button onClick={handleDetectMood} className="sma-cam-btn" style={{ flex: 1 }}>🔄 Try Again</button>
                      <button onClick={resetDetection}   className="sma-btn-cancel">✕</button>
                    </div>
                  </div>
                )}

                {detectionStatus === 'error' && (
                  <div className="sma-error-card">
                    <div className="sma-failed-header-row">
                      <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                      <div>
                        <div className="sma-error-title">Camera Error</div>
                        <div className="sma-failed-desc">{detectionError}</div>
                      </div>
                    </div>
                    <div className="sma-result-actions" style={{ marginTop: '0.75rem' }}>
                      <button onClick={handleDetectMood} className="sma-cam-btn" style={{ flex: 1 }}>🔄 Retry</button>
                      <button onClick={resetDetection}   className="sma-btn-cancel">✕</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Voice Check Card */}
              <div className="sma-tool-card">
                <div className="sma-tool-header">
                  <div className="sma-tool-icon sma-icon-mic">
                    <Mic size={20} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="sma-tool-name">Voice Check</div>
                    <div className="sma-tool-desc">Record a short voice note for tone analysis.</div>
                  </div>
                </div>
                {!isRecording ? (
                  <button onClick={handleStartRecording} className="sma-voice-btn">
                    <Mic size={15} strokeWidth={2} /> Record voice
                  </button>
                ) : (
                  <button onClick={handleStopRecording}  className="sma-voice-btn sma-voice-btn--rec">⏹ Stop Recording</button>
                )}
                {speechLoading && (
                  <div className="sma-loading-row" style={{ marginTop: '0.625rem' }}>
                    <div className="sma-spinner" />
                    <span className="sma-loading-text">Processing voice…</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Journal Insight (full-width) ── */}
            <div className="sma-journal-card">
              <div className="sma-tool-header">
                <div className="sma-tool-icon sma-icon-journal">
                  <BookOpen size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <div className="sma-tool-name">Journal Insight</div>
                  <div className="sma-tool-desc">Write a short note about how your day was.</div>
                </div>
              </div>
              <textarea
                className="sma-textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's contributing to this feeling? How was your day?"
                rows={3}
              />
              <div className="sma-journal-footer">
                <button
                  onClick={handleAnalyzeNote}
                  disabled={combinedLoading || (!note.trim() && !detectedMood)}
                  className="sma-analyze-btn"
                >
                  {combinedLoading
                    ? <><span className="sma-analyze-spinner" /> Analyzing…</>
                    : <><Sparkles size={14} strokeWidth={2} /> Analyze note</>}
                </button>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="actions">
            <button onClick={() => navigate('/dashboard')} className="back-btn">← Back to Dashboard</button>
            <div className="right-actions">
              <button onClick={handleSaveForLater} className="save-btn">Save for later</button>
              <button
                onClick={handleContinue}
                disabled={!selectedMood}
                className={`continue-btn ${selectedMood ? 'enabled' : 'disabled'}`}
              >
                Continue →
              </button>
            </div>
          </div>
        </div>

        <div className="tip-card">
          <span>💡</span>
          <div>
            <h3>Mental Health Tip</h3>
            <p>Regular check-ins help track patterns in your emotional wellbeing. Try to check in at the same time each day for the most accurate insights.</p>
          </div>
        </div>

        <video ref={videoRef} style={{ display: 'none' }} muted playsInline />

        <SuggestionReviewModal
          isOpen={isReviewing}
          aggregatedResult={aggregatedResult}
          onAccept={handleAcceptSuggestions}
          onModify={handleModifySuggestions}
          onSkip={skipSuggestions}
          onCancel={skipSuggestions}
        />
      </main>
    </div>
  );
};

export default CheckInPage1;
