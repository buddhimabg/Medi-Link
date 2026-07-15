import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, X } from "lucide-react";
import "./wellnessCategory.css";

interface VideoItem {
  id: string;
  youtubeId: string;
  title: string;
  author: string;
  duration: string;
  description: string;
  category: string;
  thumbnail: string;
}

const WellnessVideos: React.FC = () => {
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const videosList: VideoItem[] = [
    {
      id: "v1",
      youtubeId: "O-6f5wQXSu8",
      title: "10-Minute Guided Meditation for Anxiety",
      author: "Great Meditation",
      duration: "10:25",
      description: "A gentle 10-minute guided mindfulness meditation to calm your nervous system, relax your body, and quiet an anxious mind.",
      category: "Meditation",
      thumbnail: "https://img.youtube.com/vi/O-6f5wQXSu8/maxresdefault.jpg"
    },
    {
      id: "v2",
      youtubeId: "ZToicYcHIOU",
      title: "5 Minute Mindfulness Meditation",
      author: "Goodful",
      duration: "5:12",
      description: "A quick 5-minute meditation practice designed to ground you in the present moment, clear your head, and bring focus to your day.",
      category: "Mindfulness",
      thumbnail: "https://img.youtube.com/vi/ZToicYcHIOU/maxresdefault.jpg"
    },
    {
      id: "v3",
      youtubeId: "tEmt1Znux58",
      title: "Box Breathing Technique for Stress & Anxiety",
      author: "Therapy in a Nutshell",
      duration: "7:07",
      description: "Learn Box Breathing, a clinical technique used by military personnel and therapists alike to quickly reset the stress response system.",
      category: "Breathing",
      thumbnail: "https://img.youtube.com/vi/tEmt1Znux58/maxresdefault.jpg"
    },
    {
      id: "v4",
      youtubeId: "3n962Z5n-Y4",
      title: "Why Do We Feel Anxious? | Understanding Anxiety",
      author: "Psych Hub",
      duration: "4:32",
      description: "Psychoeducational guidance looking at what happens in the brain when we experience stress, fear, and general clinical anxiety.",
      category: "Educational",
      thumbnail: "https://img.youtube.com/vi/3n962Z5n-Y4/maxresdefault.jpg"
    }
  ];

  return (
    <div className="wellness-category-page">
      <header className="category-header">
        <Link to="/Wellnesshub" className="btn-back-hub">
          <ArrowLeft size={16} /> Back to Wellness Hub
        </Link>
        <h1>▶ Guided Videos & Talks</h1>
        <p>Handpicked audio-visual aids and clinical guidance for your mental health journey</p>
      </header>

      <main className="video-grid">
        {videosList.map((video) => (
          <div 
            className="video-item-card" 
            key={video.id}
            onClick={() => setActiveVideo(video)}
          >
            <div 
              className="video-card-thumbnail"
              style={{ backgroundImage: `url(${video.thumbnail})` }}
            >
              <button className="video-card-play-btn">
                <Play size={20} fill="currentColor" />
              </button>
              <span className="video-card-duration">{video.duration}</span>
            </div>
            <div className="video-card-content">
              <span className="video-card-tag">{video.category}</span>
              <h3>{video.title}</h3>
              <p>{video.description}</p>
            </div>
          </div>
        ))}
      </main>

      {/* --- YOUTUBE POPUP MODAL --- */}
      {activeVideo && (
        <div className="video-modal-backdrop" onClick={() => setActiveVideo(null)}>
          <div className="video-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h3>{activeVideo.title} ({activeVideo.author})</h3>
              <button className="btn-close-video" onClick={() => setActiveVideo(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="video-iframe-wrapper">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1`}
                title={activeVideo.title}
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

export default WellnessVideos;
