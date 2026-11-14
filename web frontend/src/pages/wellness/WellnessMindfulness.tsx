import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./wellnessCategory.css";

interface ExerciseItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  steps: string[];
}

const WellnessMindfulness: React.FC = () => {
  const exercises: ExerciseItem[] = [
    {
      id: "ex1",
      title: "The 5-4-3-2-1 Grounding Method",
      subtitle: "Sensory Awareness Exercise",
      icon: "🧘",
      description: "Use this grounding tool to help ease anxiety or panic. By focusing on your five senses, you can gently steer your mind away from racing thoughts and anchor yourself in the present moment.",
      steps: [
        "👀 5 things you can see: Look around you and spot five details (e.g. a painting, a cup, a spot on the wall).",
        "🖐️ 4 things you can touch: Notice physical sensations (e.g. the texture of your jeans, the cool surface of a desk).",
        "👂 3 things you can hear: Tune into your surroundings (e.g. humming traffic, distant birds, air conditioning).",
        "👃 2 things you can smell: Search for subtle scents (e.g. soap, coffee, fresh air, wood).",
        "👅 1 thing you can taste: Focus on your mouth (e.g. mint, toothpaste, or just a sip of cold water)."
      ]
    },
    {
      id: "ex2",
      title: "Box Breathing Technique",
      subtitle: "4-4-4-4 Relaxing Breath",
      icon: "💨",
      description: "A simple technique used by professionals in high-stress roles to trigger the parasympathetic nervous system and reset breathing patterns.",
      steps: [
        "💨 Step 1: Slowly exhale all of the air from your lungs for 4 seconds.",
        "🧘 Step 2: Hold your breath empty for another 4 seconds.",
        "💨 Step 3: Gently inhale through your nose for 4 seconds.",
        "🧘 Step 4: Hold your breath full for a final 4 seconds. Repeat the cycle 4 times."
      ]
    },
    {
      id: "ex3",
      title: "Body Scan Relaxation",
      subtitle: "Release Muscle Tension",
      icon: "💆",
      description: "A mental sweep across the body to help identify areas where you hold stress, followed by a conscious release of that tension.",
      steps: [
        "🛌 Step 1: Lie down or sit in a comfortable, relaxed position.",
        "👣 Step 2: Bring your attention to your feet and toes. Breathe in, and as you exhale, release all weight.",
        "🦵 Step 3: Move your attention slowly up to your legs, thighs, hips, and lower back, relaxing each muscle group.",
        " shoulders Step 4: Continue upward through your chest, neck, shoulders, and jaw, consciously letting go of any tight spots."
      ]
    }
  ];

  return (
    <div className="wellness-category-page">
      <header className="category-header">
        <Link to="/Wellnesshub" className="btn-back-hub">
          <ArrowLeft size={16} /> Back to Wellness Hub
        </Link>
        <h1>🧘 Mindfulness Exercises</h1>
        <p>Practical clinical exercises to bring you back to the present and calm your nervous system</p>
      </header>

      <main className="doc-grid">
        {exercises.map((ex) => (
          <div className="doc-card" key={ex.id}>
            <div className="doc-card-header">
              <span className="doc-card-badge">{ex.icon}</span>
              <div className="doc-card-title">
                <h3>{ex.title}</h3>
                <p>{ex.subtitle}</p>
              </div>
            </div>
            <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "#555", marginBottom: "20px" }}>
              {ex.description}
            </p>
            <div className="steps-list">
              {ex.steps.map((step, idx) => (
                <div className="step-item" key={idx}>
                  <span className="step-num">{idx + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default WellnessMindfulness;
