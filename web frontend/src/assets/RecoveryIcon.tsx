import React from "react";

type RecoveryIconProps = {
  className?: string;
};

const RecoveryIcon = ({ className }: RecoveryIconProps): React.ReactElement => (
  <svg
    className={className}
    width="22"
    height="16"
    viewBox="0 0 22 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19.4282 8.00065H17.238C16.852 8.00003 16.4764 8.09485 16.1686 8.27063C15.8608 8.4464 15.6378 8.69345 15.5336 8.97398L13.4582 14.5473C13.4448 14.5819 13.417 14.6123 13.3787 14.634C13.3405 14.6556 13.294 14.6673 13.2463 14.6673C13.1985 14.6673 13.152 14.6556 13.1138 14.634C13.0756 14.6123 13.0477 14.5819 13.0343 14.5473L8.15946 1.45398C8.14608 1.41937 8.11819 1.38895 8.07998 1.36732C8.04176 1.34568 7.99528 1.33398 7.94751 1.33398C7.89974 1.33398 7.85326 1.34568 7.81504 1.36732C7.77682 1.38895 7.74893 1.41937 7.73556 1.45398L5.66021 7.02732C5.55641 7.30675 5.33467 7.55299 5.02866 7.72866C4.72264 7.90432 4.34905 7.99982 3.96461 8.00065H1.76562"
      stroke="#0D47A1"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default RecoveryIcon;
