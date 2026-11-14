import React from 'react';

// Trend Icon - Chart/Graph
type TrendIconProps = {
  className?: string;
};

const TrendIcon = ({ className = "w-6 h-6" }: TrendIconProps): React.JSX.Element => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 17" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export default TrendIcon;
