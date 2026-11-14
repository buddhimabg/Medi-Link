import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import "./wellnessCategory.css";

interface ChecklistItem {
  id: string;
  text: string;
}

interface ChecklistGroup {
  title: string;
  icon: string;
  items: ChecklistItem[];
}

const WellnessSelfCare: React.FC = () => {
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  const groups: ChecklistGroup[] = [
    {
      title: "Mind Habits",
      icon: "🧘",
      items: [
        { id: "m1", text: "Write 3 items in a gratitude journal" },
        { id: "m2", text: "Practice 5 minutes of conscious box breathing" },
        { id: "m3", text: "Read a physical book for 15 minutes" }
      ]
    },
    {
      title: "Body Habits",
      icon: "🍎",
      items: [
        { id: "b1", text: "Drink at least 8 glasses of pure water" },
        { id: "b2", text: "Take a 15-minute walks in fresh daylight" },
        { id: "b3", text: "Get at least 7-8 hours of quality sleep" }
      ]
    },
    {
      title: "Social Habits",
      icon: "🤝",
      items: [
        { id: "s1", text: "Send a supportive text message to a loved one" },
        { id: "s2", text: "Share a sincere thank-you with someone today" }
      ]
    },
    {
      title: "Space Habits",
      icon: "🧹",
      items: [
        { id: "e1", text: "Tidy up your immediate workspace or desk" },
        { id: "e2", text: "Open your windows for 10 minutes of fresh air" }
      ]
    }
  ];

  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);
  const completedItems = checkedIds.length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const toggleItem = (id: string) => {
    if (checkedIds.includes(id)) {
      setCheckedIds(checkedIds.filter((item) => item !== id));
    } else {
      setCheckedIds([...checkedIds, id]);
    }
  };

  return (
    <div className="wellness-category-page">
      <header className="category-header">
        <Link to="/Wellnesshub" className="btn-back-hub">
          <ArrowLeft size={16} /> Back to Wellness Hub
        </Link>
        <h1>♡ Self-Care Checklist</h1>
        <p>A simple, interactive guide to building daily habits that support mental and physical health</p>
      </header>

      {/* Progress Card */}
      <div className="progress-card">
        <div className="progress-header">
          <h3>Daily Self-Care Progress</h3>
          <span className="progress-pct">{progressPercent}%</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <p style={{ margin: "14px 0 0 0", fontSize: "0.85rem", opacity: 0.9 }}>
          {completedItems} of {totalItems} habits completed today. Keep going!
        </p>
      </div>

      {/* Checklist Grid */}
      <main className="checklist-sections">
        {groups.map((group, idx) => (
          <div className="checklist-group" key={idx}>
            <h3>
              <span>{group.icon}</span> {group.title}
            </h3>
            <div className="checklist-items">
              {group.items.map((item) => {
                const isChecked = checkedIds.includes(item.id);
                return (
                  <div 
                    className={`checklist-label ${isChecked ? "checked" : ""}`}
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                  >
                    <div className={`checklist-checkbox ${isChecked ? "checked" : ""}`}>
                      {isChecked && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span>{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default WellnessSelfCare;
