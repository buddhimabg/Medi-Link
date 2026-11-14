import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import styles from './PreCallSetup.module.css';

const VideoCallSetting: React.FC = () => {
  const navigate = useNavigate();

  // මුලින්ම localStorage එකෙන් පරණ settings තියෙනවාද බලමු
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('medilink_video_settings');
    return saved ? JSON.parse(saved) : {
      displayName: "Dr. Dilshari",
      cameraRes: "1280x720",
      frameRate: "30fps",
      blurBackground: true,
      noiseCancel: true,
      autoGainControl: true,
    };
  });

  const handleApplySettings = () => {
    // 1. Settings, localStorage එකේ save කරන්න
    localStorage.setItem('medilink_video_settings', JSON.stringify(settings));
    
    // 2. වෙනස්කම් apply කරලා පෙර පිටුවට යන්න
    navigate(-1);
  };

  return (
    <MainLayout activePath="/video-call">
      <main className={styles.main}>
        <div className={styles.card} style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', borderRadius: '16px', backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '30px', fontSize: '24px', color: '#1a1a2e' }}>Advanced Session Settings</h2>

          {/* Identity */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ color: '#555', marginBottom: '15px' }}>Identity</h4>
            <input 
              value={settings.displayName}
              onChange={(e) => setSettings({...settings, displayName: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
              placeholder="Enter display name"
            />
          </div>

          {/* Video & Audio Quality */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div>
              <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Resolution</label>
              <select 
                value={settings.cameraRes}
                onChange={(e) => setSettings({...settings, cameraRes: e.target.value})} 
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="1920x1080">1080p (Full HD)</option>
                <option value="1280x720">720p (HD)</option>
                <option value="640x480">480p (SD)</option>
              </select>
            </div>
            <div>
              <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Frame Rate</label>
              <select 
                value={settings.frameRate}
                onChange={(e) => setSettings({...settings, frameRate: e.target.value})} 
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="30fps">30 fps</option>
                <option value="60fps">60 fps</option>
              </select>
            </div>
          </div>

          {/* Privacy & Optimization */}
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
            <h4 style={{ marginBottom: '15px' }}>Privacy & Optimization</h4>
            {[
              { label: 'Blur Background', key: 'blurBackground' },
              { label: 'Background Noise Cancellation', key: 'noiseCancel' },
              { label: 'Auto Gain Control (Mic)', key: 'autoGainControl' }
            ].map((item) => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px' }}>{item.label}</span>
                <input 
                  type="checkbox" 
                  checked={settings[item.key as keyof typeof settings]}
                  onChange={() => setSettings((prev: any) => ({...prev, [item.key]: !prev[item.key as keyof typeof settings]}))}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
            <button 
              onClick={() => navigate(-1)} 
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleApplySettings}
              style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', color: '#fff', backgroundColor: '#1a3baa', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Apply Settings
            </button>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default VideoCallSetting;