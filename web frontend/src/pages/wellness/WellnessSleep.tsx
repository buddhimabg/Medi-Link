import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, X } from "lucide-react";
import "./wellnessCategory.css";

interface Soundscape {
  id: string;
  youtubeId: string;
  title: string;
  duration: string;
  thumbnail: string;
  description: string;
}

const WellnessSleep: React.FC = () => {
  const [activeSound, setActiveSound] = useState<Soundscape | null>(null);

  const soundscapes: Soundscape[] = [
    {
      id: "s1",
      youtubeId: "yIQd2YrZETA",
      title: "Gentle Rain on Window - Soundscape for Sleep",
      duration: "8 Hours",
      thumbnail: "https://img.youtube.com/vi/yIQd2YrZETA/maxresdefault.jpg",
      description: "Soft, steady rain sounds hitting a windowpane. Perfect background noise to mask disruptive sounds and ease your brain into sleep."
    },
    {
      id: "s2",
      youtubeId: "H1Yt0R9mhyc",
      title: "Delta Waves & Healing Ambient Frequencies",
      duration: "3 Hours",
      thumbnail: "https://img.youtube.com/vi/H1Yt0R9mhyc/maxresdefault.jpg",
      description: "Clinically structured low-frequency Delta wave binaural beats to help calm deep brain activity and promote REM cycles."
    }
  ];

  return (
    <div className="wellness-category-page">
      <header className="category-header">
        <Link to="/Wellnesshub" className="btn-back-hub">
          <ArrowLeft size={16} /> Back to Wellness Hub
        </Link>
        <h1>🌙 Sleep & Relaxation</h1>
        <p>Expert sleep tips and ambient soundscapes to help you unwind and rest deeply</p>
      </header>

      {/* Sleep Guides Section */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 16px 0", color: "var(--slate-900)" }}>
        Clinical Sleep Hygiene Guide
      </h2>
      <div className="doc-grid" style={{ marginBottom: "40px" }}>
        <div className="doc-card">
          <div className="doc-card-header">
            <span className="doc-card-badge">🛌</span>
            <div className="doc-card-title">
              <h3>Pre-Sleep Wind-Down Routine</h3>
              <p>Prepare your mind and body for sleep</p>
            </div>
          </div>
          <div className="steps-list">
            <div className="step-item">
              <span className="step-num">1</span>
              <span><strong>Screen Ban:</strong> Turn off all mobile devices, tablets, and computers at least 45 minutes before sleep. Blue light blocks melatonin synthesis.</span>
            </div>
            <div className="step-item">
              <span className="step-num">2</span>
              <span><strong>Calm Reading:</strong> Spend 15 minutes reading a physical book or listening to relaxing audio (avoid bright white lighting).</span>
            </div>
            <div className="step-item">
              <span className="step-num">3</span>
              <span><strong>Therapeutic Temperature:</strong> Keep your bedroom cool (around 18-20°C). A drop in body temperature triggers sleepiness.</span>
            </div>
            <div className="step-item">
              <span className="step-num">4</span>
              <span><strong>Keep It Consistent:</strong> Go to bed and wake up at the exact same time every day, including on weekends, to stabilize your internal clock.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Relaxing Sounds Section */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 16px 0", color: "var(--slate-900)" }}>
        Relaxing Ambient Soundscapes
      </h2>
      <main className="video-grid">
        {soundscapes.map((sound) => (
          <div 
            className="video-item-card" 
            key={sound.id}
            onClick={() => setActiveSound(sound)}
          >
            <div 
              className="video-card-thumbnail"
              style={{ backgroundImage: `url(${sound.thumbnail})` }}
            >
              <button className="video-card-play-btn">
                <Play size={20} fill="currentColor" />
              </button>
              <span className="video-card-duration">{sound.duration}</span>
            </div>
            <div className="video-card-content">
              <span className="video-card-tag" style={{ backgroundColor: "#fff5e6", color: "#d4a34b" }}>Ambient Audio</span>
              <h3>{sound.title}</h3>
              <p>{sound.description}</p>
            </div>
          </div>
        ))}
      </main>

      {/* --- SOUNDSCAPE PLAYER MODAL --- */}
      {activeSound && (
        <div className="video-modal-backdrop" onClick={() => setActiveSound(null)}>
          <div className="video-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h3>{activeSound.title}</h3>
              <button className="btn-close-video" onClick={() => setActiveSound(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="video-iframe-wrapper">
              <iframe
                src={`https://www.youtube.com/embed/${activeSound.youtubeId}?autoplay=1`}
                title={activeSound.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WellnessSleep;
