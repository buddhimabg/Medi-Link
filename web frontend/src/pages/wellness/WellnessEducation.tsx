import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import "./wellnessCategory.css";

interface ArticleItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
}

const WellnessEducation: React.FC = () => {
  const [openAccordionId, setOpenAccordionId] = useState<string | null>("art1");

  const articles: ArticleItem[] = [
    {
      id: "art1",
      title: "Understanding Anxiety: Your Mind's Alarm System",
      excerpt: "Why does anxiety feel so intense, and how does the brain handle stress?",
      content: "Anxiety is not a sign of weakness; it is the body's natural response to perceived danger. This is controlled by the amygdala, a small almond-shaped structure in the brain that acts as an alarm. When it registers threat, it initiates a 'fight, flight, or freeze' reaction. This floods your system with cortisol and adrenaline, causing a rapid heart rate, muscle tightness, and rapid breathing. When these alarms fire too frequently due to chronic modern stressors, it can feel overwhelming. Learning that this is a survival mechanism is the first step in regaining control and reducing panic."
    },
    {
      id: "art2",
      title: "Stress vs. Burnout: Spotting the Difference early",
      excerpt: "Are you under heavy pressure, or are your reserves fully depleted?",
      content: "While stress and burnout are closely related, they represent different states. Stress is generally characterized by 'over-engagement.' You feel under intense pressure, but still believe that if you can get everything under control, you'll feel better. Burnout, however, is characterized by 'disengagement' and feeling empty. You feel completely exhausted, devoid of motivation, and beyond caring. Burnout doesn't improve with just a weekend of rest; it requires systemic adjustments, boundary setting, and often professional counseling to recover your energy."
    },
    {
      id: "art3",
      title: "Cognitive Reframing: How to Challenge Negative Thoughts",
      excerpt: "Discover how to identify and break out of unhelpful thought loops.",
      content: "Cognitive reframing is a core technique in Cognitive Behavioral Therapy (CBT). It involves identifying automatic negative thoughts (such as 'I always ruin everything' or 'I can't cope with this') and evaluating the objective evidence for them. Once you recognize that these thoughts are cognitive distortions, you can reframe them into more balanced statements. For example, reframing 'I'm going to fail this presentation' to 'This is stressful, but I have prepared well and can get through it.' This practice changes your emotional state by altering the cognitive filter you look through."
    }
  ];

  const toggleAccordion = (id: string) => {
    if (openAccordionId === id) {
      setOpenAccordionId(null);
    } else {
      setOpenAccordionId(id);
    }
  };

  return (
    <div className="wellness-category-page">
      <header className="category-header">
        <Link to="/Wellnesshub" className="btn-back-hub">
          <ArrowLeft size={16} /> Back to Wellness Hub
        </Link>
        <h1>🧠 Understand Your Mind</h1>
        <p>Simple, bite-sized clinical psychoeducation to help make sense of your feelings and thoughts</p>
      </header>

      <main className="accordion-list">
        {articles.map((art) => {
          const isOpen = openAccordionId === art.id;
          return (
            <div className={`accordion-item ${isOpen ? "active" : ""}`} key={art.id}>
              <button 
                className="accordion-trigger" 
                onClick={() => toggleAccordion(art.id)}
              >
                <div>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, display: "block" }}>
                    {art.title}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "#666", fontWeight: 500, marginTop: "4px", display: "block" }}>
                    {art.excerpt}
                  </span>
                </div>
                <ChevronDown size={20} className="accordion-icon" />
              </button>
              {isOpen && (
                <div className="accordion-content">
                  <p>{art.content}</p>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default WellnessEducation;
