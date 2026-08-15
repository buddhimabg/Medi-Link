import React from "react";
import "./StatsCard.css";

interface StatsCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon: Icon, title, value }) => {
  return (
    <div className="stats-card">
      
      {/* ICON + CONTENT WRAPPER */}
      <div className="stats-content">
        
        {/* ICON CIRCLE */}
        <div className="stats-icon-wrapper">
          
          {/* Inner gradient layer */}
          <div className="stats-icon-bg"></div>

          {/* Actual icon */}
          <Icon className="stats-icon" />
        </div>

        {/* TEXT CONTENT */}
        <div className="stats-text">
          <p className="stats-title">{title}</p>
          <p className="stats-value">{value}</p>
        </div>

      </div>
    </div>
  );
};

export default StatsCard;