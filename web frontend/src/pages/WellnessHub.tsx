import React, { useState, useEffect } from "react";
import "./WellnessHub.css";
import Footer from "../component/footer";
import meditatingwomen from "../assets/meditating-women.png";
import Mug from "../assets/mug-removebg-preview.png";
import { Link } from "react-router-dom";

// 1. Define the TypeScript Interface based on your backend schema
interface WellnessCategory {
  _id: string;
  title: string;
  description: string;
  icon: string;
  bgColor: string;
  exploreColor: string;
  linkPath: string;
}

const allTips = [
  // Set A
  { text: "Take a few deep breaths. It helps calm your mind instantly.", icon: "💨", color: "#eef8f8" },
  { text: "It's okay to take breaks. You are not meant to do everything.", icon: "☕", color: "#f3eef8" },
  { text: "Be kind to yourself. You're doing the best you can.", icon: "♡", color: "#fcf0ed" },
  { text: "Step outside, get some light, and reconnect with nature.", icon: "☀️", color: "#fff9eb" },
  { text: "Write down your thoughts. It can help you feel lighter.", icon: "📋", color: "#eef5fc" },
  // Set B
  { text: "Stay hydrated. Drinking water supports cognitive function and mood.", icon: "💧", color: "#eef8f8" },
  { text: "Take a 10-minute walk. Physical movement boosts endorphins.", icon: "🚶", color: "#f3eef8" },
  { text: "Unplug from screens. Give your eyes and mind a rest from social media.", icon: "📵", color: "#fcf0ed" },
  { text: "Listen to your favorite track. Music is a quick way to shift your energy.", icon: "🎶", color: "#fff9eb" },
  { text: "Nourish your body. Enjoy a healthy snack that fuels your day.", icon: "🍎", color: "#eef5fc" },
  // Set C
  { text: "Prioritize your rest. Quality sleep is essential for mental resilience.", icon: "🛌", color: "#eef8f8" },
  { text: "Reach out to a friend. A short chat can make you feel supported.", icon: "🤝", color: "#f3eef8" },
  { text: "Practice mindfulness. Observe your thoughts without any judgment.", icon: "🧘", color: "#fcf0ed" },
  { text: "Do something creative. Draw, write, or cook just for the joy of it.", icon: "🎨", color: "#fff9eb" },
  { text: "Acknowledge one small win from today. Every step forward counts.", icon: "✨", color: "#eef5fc" },
  // Set D
  { text: "Focus on what you can control. Let go of the things you cannot.", icon: "🌸", color: "#eef8f8" },
  { text: "De-clutter your space. A tidy desk or room brings peace of mind.", icon: "🧹", color: "#f3eef8" },
  { text: "Do a quick stretch. Release physical tension held in your shoulders.", icon: "🤸", color: "#fcf0ed" },
  { text: "Practice gratitude. Write down three things you are thankful for.", icon: "🙏", color: "#fff9eb" },
  { text: "Permit yourself to say no. Protecting your boundaries is self-care.", icon: "🧸", color: "#eef5fc" }
];

// Real YouTube videos matching each featured-video topic. Verified titles/
// channels via a web search rather than guessed, since a wrong video ID
// would silently embed unrelated or broken content.
const featuredVideos = [
  {
    id: "O-6f5wQXSu8",
    title: "10-Minute Meditation For Anxiety",
    channel: "Goodful",
    duration: "10 min",
  },
  {
    id: "ssss7V1_eyA",
    title: "5 Minute Mindfulness Meditation",
    channel: "Goodful",
    duration: "5 min",
  },
  {
    id: "grfXR6FAsI8",
    title: "3-Minute Stress Management (Box Breathing)",
    channel: "Therapy in a Nutshell",
    duration: "3 min",
  },
];

const WellnessHub: React.FC = () => {
  // 2. Setup State for the categories
  const [categories, setCategories] = useState<WellnessCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // 3. Fetch data from your backend when the component loads
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/wellness/categories"
        );
        if (!response.ok) throw new Error("Failed to fetch categories");

        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getDailyTips = () => {
    const today = new Date();
    const daysSinceEpoch = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / (1000 * 60 * 60 * 24));
    const setIndex = daysSinceEpoch % 4;
    return allTips.slice(setIndex * 5, (setIndex + 1) * 5);
  };

  const dailyTips = getDailyTips();

  return (
    <div className="wellness-hub-page">
      <div className="top-navigation-bar">
        <Link to="/" className="back-link">
          <button className="btn-back-home">&larr; Back to Home</button>
        </Link>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to your <br />
            <span className="text-teal">Wellness Hub</span>
          </h1>
          <p className="hero-subtitle">
            A safe space with videos, tips, and resources to support your mental
            well-being every day.
          </p>
          <div className="hero-callout">
            <div className="callout-icon-wrapper">
              <span className="heart-icon">♡</span>
            </div>
            <p>
              You don't have to go through it alone. <br />
              <strong>Help is here, and so are you.</strong>
            </p>
          </div>
        </div>
        <div className="hero-illustration">
          <img src={meditatingwomen} alt="Meditating woman" />
        </div>
      </section>

      {/* --- BROWSE BY CATEGORY --- */}
      <section className="category-section">
        <div className="section-header">
          <h2>Browse by category</h2>
          <p>Find what you need right now.</p>
        </div>

        {/* 4. Render the dynamic data from MongoDB */}
        <div className="category-grid">
          {isLoading ? (
            <p
              style={{
                textAlign: "center",
                width: "100%",
                gridColumn: "1 / -1",
              }}
            >
              Loading categories...
            </p>
          ) : (
            categories.map((cat) => (
              <Link
                to={cat.linkPath || "#"}
                className="category-card"
                key={cat._id}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  className="category-icon"
                  style={{ backgroundColor: cat.bgColor }}
                >
                  {cat.icon}
                </div>
                <h3>{cat.title}</h3>
                <p>{cat.description}</p>
                <span
                  className="explore-link"
                  style={{ color: cat.exploreColor }}
                >
                  Explore &rarr;
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* --- FEATURED VIDEOS --- */}
      <section className="videos-section">
        <div className="section-header-flex">
          <div>
            <h2>Featured Videos</h2>
            <p>Handpicked videos to support you today.</p>
          </div>
          <a href="#" className="view-all-link">
            View all videos &rarr;
          </a>
        </div>
        <div className="videos-grid">
          {featuredVideos.map((video) => (
            <div className="video-card" key={video.id}>
              {playingVideoId === video.id ? (
                <div className="video-thumbnail video-embed-wrapper">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    frameBorder={0}
                  />
                </div>
              ) : (
                <div
                  className="video-thumbnail"
                  style={{
                    backgroundImage: `url(https://img.youtube.com/vi/${video.id}/hqdefault.jpg)`,
                  }}
                  onClick={() => setPlayingVideoId(video.id)}
                >
                  <button
                    className="play-button"
                    onClick={() => setPlayingVideoId(video.id)}
                    aria-label={`Play ${video.title}`}
                  >
                    ▶
                  </button>
                </div>
              )}
              <div className="video-info">
                <h3>{video.title}</h3>
                <div className="video-meta">
                  <span>{video.channel}</span>
                  <span className="tag">{video.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- DAILY WELLNESS TIPS --- */}
      <section className="tips-section">
        <div className="section-header">
          <h2>Daily Wellness Tips</h2>
          <p>Small steps can make a big difference.</p>
        </div>
        <div className="tips-grid">
          {dailyTips.map((tip, index) => (
            <div className="tip-card" key={index}>
              <div className="tip-icon" style={{ backgroundColor: tip.color }}>
                {tip.icon}
              </div>
              <p>{tip.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- SUPPORT CTA BANNER --- */}
      <section className="cta-banner">
        <div className="cta-illustration">
          <img src={Mug} alt="Plants and mug" />
        </div>
        <div className="cta-text">
          <h2>Need more support?</h2>
          <p>
            Our mental health professionals are here for you.
            <br />
            Book a session with a trusted counselor today.
          </p>
        </div>
        <div className="cta-actions">
          <button className="btn-primary">🗓 Book an Appointment</button>
          <a href="#" className="view-doctors-link">
            View all doctors &rarr;
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WellnessHub;
