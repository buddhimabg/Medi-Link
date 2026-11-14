import type { SVGProps } from "react";

// Lab Report Icon - Document with heart/health indicator
type LabReportIconProps = SVGProps<SVGSVGElement>;

const LabReportIcon = ({ className = "w-6 h-6" }: LabReportIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 13h6" />
    <path d="M9 17h3" />
    <circle cx="12" cy="9" r="1" fill="currentColor" />
  </svg>
);

export default LabReportIcon;
