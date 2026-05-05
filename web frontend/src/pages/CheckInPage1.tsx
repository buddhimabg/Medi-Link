import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from "../components/Sidebar";
import { useMoodStore } from "../store/moodStore";
import './CheckInPage1.css';

const CheckInPage1: React.FC = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const setCurrentCheckIn = useMoodStore((state: any) => state.setCurrentCheckIn);
  const currentCheckIn = useMoodStore((state: any) => state.currentCheckIn);

  const [selectedMood, setSelectedMood] = useState<string>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    const savedDraft = localStorage.getItem('moodDraft');
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      if (draft.mood) setSelectedMood(draft.mood);
      if (draft.note) setNote(draft.note);
    } else if (currentCheckIn.mood) {
      setSelectedMood(currentCheckIn.mood);
      setNote(currentCheckIn.note);
    }
  }, [currentCheckIn]);

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const moodOptions = [
    { value: 'terrible', label: 'Terrible', emoji: '😫' },
    { value: 'sad', label: 'Sad', emoji: '😔' },
    { value: 'okay', label: 'Okay', emoji: '😐' },
    { value: 'good', label: 'Good', emoji: '🙂' },
    { value: 'great', label: 'Great', emoji: '😊' }
  ];

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
  };

  const handleSaveForLater = () => {
    setCurrentCheckIn({
      mood: selectedMood,
      note,
      date: formattedDate
    });

    const draft = { mood: selectedMood, note, date: formattedDate };
    localStorage.setItem('moodDraft', JSON.stringify(draft));

    alert('Progress saved! You can continue later from Mood Track.');
    navigate('/dashboard');
  };

  const handleContinue = () => {
    if (!selectedMood) {
      alert('Please select a mood to continue');
      return;
    }

    setCurrentCheckIn({
      mood: selectedMood,
      note,
      date: formattedDate
    });

    const draft = { mood: selectedMood, note, date: formattedDate };
    localStorage.setItem('moodDraft', JSON.stringify(draft));

    navigate('/check-in/details', {
      state: { mood: selectedMood, note, date: formattedDate }
    });
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="page-container">
      <Sidebar activePage="Mood Track" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`main-content ${collapsed ? 'collapsed' : 'expanded'}`}>
        <div className="header">
          <h1>Daily Check-in</h1>
          <p>{formattedDate}</p>
        </div>

        <div className="progress-wrapper">
          <div className="progress-label">
            <span>Progress</span>
            <span className="progress-step">1 of 2</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
        </div>

        <div className="card">
          <h2>How are you feeling right now?</h2>

          <div className="mood-grid">
            {moodOptions.map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleMoodSelect(mood.value)}
                className={`mood-btn ${selectedMood === mood.value ? 'active' : ''}`}
              >
                <div className="emoji">{mood.emoji}</div>
                <div>{mood.label}</div>
              </button>
            ))}
          </div>

          <div className="note-section">
            <label>Add a note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's contributing to this feeling? How was your day?... "
              rows={4}
            />
          </div>

          <div className="actions">
            <button onClick={handleBack} className="back-btn">
              ← Back to Dashboard
            </button>

            <div className="right-actions">
              <button onClick={handleSaveForLater} className="save-btn">
                Save for later
              </button>

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
            <p>
              Regular check-ins help track patterns in your emotional wellbeing.
              Try to check in at the same time each day for the most accurate insights.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckInPage1;