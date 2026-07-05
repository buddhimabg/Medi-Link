import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Step } from '../../hooks/useVideoCall';
import styles from './PreCallSetup.module.css';
import MainLayout from '../../components/layout/MainLayout'; 
import { videoApi } from '../../types/api';
import type { QueuePatient } from '../../types/api';

interface Props {
  sessionId: string;
  camOk: boolean;
  micOk: boolean;
  checking: boolean;
  loading: boolean;
  apiError: string;
  onRecheck: () => void;
  onStart: () => void;
  onNavigateStep: (step: Step) => void;
  onLogout?: () => void;
  userName?:  string;
  doctorQueue?: QueuePatient[];
  stepTargets: {
    deviceCheck: Step;
    waitingRoom: Step;
    connecting: Step;
    activeCall: Step;
    screenShare: Step;
    inCallChat: Step;
    prescription: Step;
    endCall: Step;
    postCallSummary: Step;
  };
}

interface DeviceInfo {
  cameraLabel: string;
  cameraRes: string;
  micLabel: string;
  micLevel: string;
  speakerLabel: string;
  volume: number;
}

const cleanLabel = (raw: string, fallback: string): string => {
  if (!raw) return fallback;
  return raw.replace(/\([0-9a-f]{4}:[0-9a-f]{4}\)/gi, '').replace(/\s+/g, ' ').trim() || fallback;
};

const truncate = (str: string, max: number): string =>
  str.length > max ? str.substring(0, max) + '…' : str;

const PreCallSetup: React.FC<Props> = ({
  sessionId, camOk, micOk, checking,
  loading, apiError, onRecheck, onStart, onNavigateStep,
  onLogout, userName,
  doctorQueue = [],
  stepTargets,
}) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const micBarRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    cameraLabel: 'Detecting...', cameraRes: 'Detecting...',
    micLabel: 'Detecting...', micLevel: 'Good',
    speakerLabel: 'Default Speakers', volume: 70,
  });
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [sessionDate,  setSessionDate]  = useState<string>('Loading…');
  const [sessionMode,  setSessionMode]  = useState<string>('Teleconsultation');

  useEffect(() => {
    videoApi.getCallInfo(sessionId)
      .then(info => {
        setSessionMode('Teleconsultation');
        void info;
      })
      .catch(() => {
        setSessionDate('—');
      });

    const now = new Date();
    setSessionDate(
      now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' · ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );
  }, [sessionId]);

  const firstPatient = doctorQueue[0] ?? null;
  const nextQueue    = doctorQueue.slice(1, 3);

  const handleStartCall = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(animFrameRef.current);
    audioCtxRef.current?.close();
    onStart();
  };

  const startMicAnalyzer = (stream: MediaStream) => {
    try {
      audioCtxRef.current?.close();
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 64;
      analyzer.smoothingTimeConstant = 0.8;
      source.connect(analyzer);
      const data = new Uint8Array(analyzer.frequencyBinCount);
      const animate = () => {
        analyzer.getByteFrequencyData(data);
        micBarRefs.current.forEach((bar, i) => {
          if (!bar) return;
          const value = data[Math.floor((i / micBarRefs.current.length) * data.length)] || 0;
          bar.style.height = `${Math.max(15, (value / 255) * 100)}%`;
        });
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const level = avg > 60 ? 'Loud' : avg > 20 ? 'Good' : avg > 5 ? 'Low' : 'Silent';
        setDeviceInfo(prev => prev.micLevel !== level ? { ...prev, micLevel: level } : prev);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } catch (err) {
      console.error('Mic analyzer error:', err);
    }
  };

  const startCamera = useCallback(async () => {
    try {
      const savedSettings = localStorage.getItem('medilink_video_settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : { 
        cameraRes: "1280x720", 
        frameRate: "30fps",
        blurBackground: true,
        noiseCancel: true,
        autoGainControl: true 
      };
      
      // Resolution parsing logic for UI display
      const resDisplay = settings.cameraRes === "1280x720" ? "1280x720" : "640x480";
      const [width, height] = resDisplay.split('x').map(Number);
      const fps = parseInt(settings.frameRate) || 30;

      streamRef.current?.getTracks().forEach(t => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: width }, 
          height: { ideal: height },
          frameRate: { ideal: fps }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: !!settings.noiseCancel,
          autoGainControl: !!settings.autoGainControl
        },
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.style.filter = settings.blurBackground ? 'blur(10px)' : 'none';
      }

      setDeviceInfo(prev => ({
        ...prev,
        cameraRes: resDisplay,
      }));

      startMicAnalyzer(stream);
    } catch (err) {
      console.error('Camera/Mic error:', err);
    }
  }, []);

  useEffect(() => {
    startCamera();

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'medilink_video_settings') startCamera();
    };
    
    window.addEventListener('storage', handleStorageUpdate);

    navigator.mediaDevices.enumerateDevices().then(devices => {
      const speakers = devices.filter(d => d.kind === 'audiooutput');
      if (speakers.length > 0) {
        const label = truncate(cleanLabel(speakers[0].label || '', 'Default Speakers'), 28);
        setDeviceInfo(prev => ({ ...prev, speakerLabel: label }));
      }
    }).catch(() => {});

    const onDeviceChange = () => startCamera();
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
    };
  }, [startCamera]);

  const micBadgeClass = () => {
    switch (deviceInfo.micLevel) {
      case 'Loud': return styles.badgeAmber;
      case 'Good': return styles.badgeGreen;
      case 'Low':  return styles.badgeAmber;
      default:     return styles.badgeGray;
    }
  };

  return (
    <MainLayout activePath="/video-call">
      <main className={styles.main}>
        <div className={styles.heading}>
          <h2 className={styles.title}>Pre-Call Setup</h2>
          <p className={styles.sub}>Check your camera and microphone before starting the session</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>📷 Camera &amp; Microphone</h3>
            <div className={styles.camPreview}>
              <video ref={videoRef} autoPlay muted playsInline className={styles.videoFeed} />
              {!camOk && (
                <div className={styles.camFallback}>
                  <div className={styles.avatarLg}>Dr</div>
                  <span className={styles.camText}>Camera Preview</span>
                </div>
              )}
              <div className={styles.camBadgePos}>
                <span className={`${styles.badge} ${camOk ? styles.badgeGreen : styles.badgeRed}`}>
                  {camOk ? '● Camera OK' : '✕ No Camera'}
                </span>
              </div>
              {/* Resolution Display in the corner */}
              <div className={styles.camRes}>
                {camOk ? deviceInfo.cameraRes.replace('x', 'x') : 'Not detected'}
              </div>
            </div>

            <div className={styles.micRow}>
              <span className={styles.micIcon}>🎤</span>
              <div className={styles.micBars}>
                {[0,1,2,3,4,5,6].map(i => (
                  <div
                    key={i}
                    ref={el => { micBarRefs.current[i] = el }}
                    className={`${styles.micBar} ${i === 6 ? styles.micBarGreen : ''}`}
                    style={{ height: '15%', opacity: micOk ? 1 : 0.3 }}
                  />
                ))}
              </div>
              <span className={styles.micStatus}>{micOk ? 'Mic Active' : 'No Mic'}</span>
              <span className={`${styles.badge} ${micOk ? micBadgeClass() : styles.badgeRed}`}>
                {micOk ? deviceInfo.micLevel : 'Error'}
              </span>
            </div>

            <div className={styles.deviceRow}>
              <div className={styles.deviceLeft}>
                <div className={styles.deviceIconWrap}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 7l-7 5 7 5V7z"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </div>
                <div>
                  <div className={styles.deviceName}>{deviceInfo.cameraLabel}</div>
                  <div className={styles.deviceSub}>Resolution: {deviceInfo.cameraRes}</div>
                </div>
              </div>
              <span className={camOk ? styles.checkOk : styles.checkFail}>
                {camOk ? '✓' : '✗'}
              </span>
            </div>

            <div className={styles.deviceRow}>
              <div className={styles.deviceLeft}>
                <div className={styles.deviceIconWrap}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                  </svg>
                </div>
                <div>
                  <div className={styles.deviceName}>{deviceInfo.micLabel}</div>
                  <div className={styles.deviceSub}>
                    Input level: {micOk ? deviceInfo.micLevel : 'Not detected'}
                  </div>
                </div>
              </div>
              <span className={micOk ? styles.checkOk : styles.checkFail}>
                {micOk ? '✓' : '✗'}
              </span>
            </div>

            <div className={styles.deviceRow}>
              <div className={styles.deviceLeft}>
                <div className={styles.deviceIconWrap}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/>
                  </svg>
                </div>
                <div>
                  <div className={styles.deviceName}>{deviceInfo.speakerLabel}</div>
                  <div className={styles.deviceSub}>Volume: {deviceInfo.volume}%</div>
                </div>
              </div>
              <button
                className={`${styles.volumeBtn} ${showVolumeSlider ? styles.volumeBtnActive : ''}`}
                onClick={() => setShowVolumeSlider(v => !v)}
              >🔊</button>
            </div>

            {showVolumeSlider && (
              <div className={styles.volumeWrap}>
                <span>🔈</span>
                <input
                  type="range" min={0} max={100} value={deviceInfo.volume}
                  onChange={e => setDeviceInfo(prev => ({
                    ...prev, volume: parseInt(e.target.value)
                  }))}
                  className={styles.volumeSlider}
                />
                <span>🔊</span>
                <span className={styles.volValue}>{deviceInfo.volume}%</span>
              </div>
            )}

            <div className={styles.cardActions}>
              <button
                className={`${styles.btn} ${styles.btnLight}`}
                onClick={() => navigate('/videoCallSetting')}
                disabled={checking}
              >
                {checking ? '⟳ Checking…' : '⚙️ Settings'}
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnGrow}`}
                onClick={handleStartCall}
                disabled={loading || checking}
              >
                {loading ? 'Setting up…' : 'Start Session →'}
              </button>
            </div>

            {apiError && (
              <div className={styles.errorBox}>⚠️ {apiError}</div>
            )}
          </div>

          <div className={styles.infoCol}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>📋 Session Details</h3>
              {[
                { k: 'Session ID',  v: `#${sessionId}`, mono: true },
                { k: 'Date & Time', v: sessionDate },
                { k: 'Mode',        v: sessionMode },
                {
                  k: 'Queue',
                  v: doctorQueue.length > 0
                    ? `${doctorQueue.length} patient${doctorQueue.length !== 1 ? 's' : ''} waiting`
                    : 'No patients in queue',
                },
              ].map((row, i) => (
                <div key={i} className={styles.kv}>
                  <span className={styles.kvKey}>{row.k}</span>
                  <span className={`${styles.kvVal} ${row.mono ? styles.kvMono : ''}`}>
                    {row.v}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>👤 First Patient</h3>
              {doctorQueue.length === 0 && (
                <div style={{
                  background: '#F9FAFB', border: '1px dashed #E5E7EB',
                  borderRadius: 8, padding: '14px', textAlign: 'center',
                  color: '#9CA3AF', fontSize: 13,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📭</div>
                  No patients in queue yet.<br/>
                  <span style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    Patients will appear here once they book an appointment.
                  </span>
                </div>
              )}

              {firstPatient && (
                <>
                  <div className={styles.patientBubble}>
                    <div className={styles.avatar}>
                      {firstPatient.patientInitial}
                    </div>
                    <div>
                      <div className={styles.patientName}>
                        {firstPatient.patientName}
                      </div>
                      <div className={styles.patientSub}>
                        {new Date(firstPatient.date).toLocaleTimeString('en-US', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {firstPatient.notes ? ` · ${firstPatient.notes.slice(0, 30)}` : ''}
                      </div>
                      <span
                        className={`${styles.badge} ${styles.badgeGreen}`}
                        style={{ marginTop: 6, display: 'inline-flex' }}
                      >
                        ● Waiting in lobby
                      </span>
                    </div>
                  </div>

                  {nextQueue.length > 0 && (
                    <>
                      <div className={styles.queueLabel}>Next in Queue</div>
                      {nextQueue.map((p, idx) => (
                        <div key={idx} className={styles.queueItem}>
                          <div className={`${styles.avatar} ${styles.avatarGray} ${styles.avatarSm}`}>
                            {p.patientInitial}
                          </div>
                          <span className={styles.queueName}>{p.patientName}</span>
                          <span className={styles.queueTime}>
                            {new Date(p.date).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default PreCallSetup;