import React from "react";

export interface CategoryMeta {
  label: string;
  iconClass: string;
  icon: string;
  color?: string;
}

export const categoryMeta: Record<string, CategoryMeta> = {
  meditation: {
    label: "Meditation",
    iconClass: "text-[#0C5BD5]",
    icon: "pill",
  },
  mood: {
    label: "Mood Tracking",
    iconClass: "text-[#0C5BD5]",
    icon: "heart",
  },
  activity: {
    label: "Activity",
    iconClass: "text-emerald-600",
    icon: "spark",
  },
  appointment: {
    label: "Appointment",
    iconClass: "text-amber-600",
    icon: "calendar",
  },
  unknown: {
    label: "Other",
    iconClass: "text-gray-500",
    icon: "dot",
  },
};

export const categoryOrder = ["meditation", "mood", "activity", "appointment", "unknown"];

export const categoryOptions = ["meditation", "mood", "activity", "appointment"];

export const normalizeCategory = (categoryValue?: string): string => {
  if (!categoryValue) {
    return "unknown";
  }

  const normalized = String(categoryValue).toLowerCase();
  return categoryMeta[normalized] ? normalized : "unknown";
};

export interface CategoryIconProps {
  type?: string;
  className?: string;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ type, className = "" }) => {
  if (type === "pill") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M14.5 4.5a5 5 0 0 1 7.07 7.07l-6.36 6.36a5 5 0 1 1-7.07-7.07l6.36-6.36Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9.96 9.96 4.08 4.08" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "heart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 20s-7-4.5-7-9.5a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10.5C19 15.5 12 20 12 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M8 3v3M16 3v3M4 10h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "spark") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return <span className={`${className} inline-block h-2.5 w-2.5 rounded-full bg-current`} aria-hidden="true" />;
};

export default CategoryIcon;
