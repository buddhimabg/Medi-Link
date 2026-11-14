import React from "react";
import "./QuickActionCard.css";

interface QuickActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
}) => {
  return (
    <button onClick={onClick} className="quick-card">
      <div className="quick-card-content">
        {/* Icon */}
        <div className="quick-card-icon">
          <Icon className="icon" />
        </div>

        {/* Text */}
        <div className="quick-card-text">
          <h3 className="quick-card-title">{title}</h3>
          <p className="quick-card-description">{description}</p>
        </div>
      </div>
    </button>
  );
};

export default QuickActionCard;