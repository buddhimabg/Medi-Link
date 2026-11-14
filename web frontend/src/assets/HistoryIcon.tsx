import React from "react";

type Props = React.SVGProps<SVGSVGElement>;

const HistoryIcon: React.FC<Props> = ({ className, ...rest }) => (
  <svg
    width={30}
    height={30}
    viewBox="0 0 36 34"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...rest}
  >
    <path
      d="M18 34C8.05887 34 0 26.3888 0 17C0 7.61116 8.05887 0 18 0C27.941 0 36 7.61116 36 17C36 26.3888 27.941 34 18 34ZM18 30.6C25.9529 30.6 32.4 24.5111 32.4 17C32.4 9.48892 25.9529 3.4 18 3.4C10.0471 3.4 3.6 9.48892 3.6 17C3.6 24.5111 10.0471 30.6 18 30.6ZM19.8 17H27V20.4H16.2V8.5H19.8V17Z"
      fill="#0D47A1"
      strokeWidth={0.5}
    />
  </svg>
);

export default HistoryIcon;