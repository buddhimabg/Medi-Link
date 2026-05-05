import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";

import {
  HomeIcon,
  CalendarIcon,
  BellIcon,
  ClockIcon,
  ChartBarIcon,
  UserIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  activePage: string;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  strictActive?: boolean;
}

interface CountState {
  pendingRemindersCount: number;
  unreadNotificationsCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  collapsed,
  setCollapsed,
  strictActive = false,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [counts, setCounts] = useState<CountState>({
    pendingRemindersCount: 0,
    unreadNotificationsCount: 0,
  });

  const navigate = useNavigate();
  const location = useLocation();

  /* =========================
     SCROLL STATE HANDLER
  ========================= */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* =========================
     LOAD NOTIFICATION COUNTS
  ========================= */
  useEffect(() => {
    // TODO: Implement fetchReminderNotificationCounts when reminderApi.ts is created
    setCounts({
      pendingRemindersCount: 0,
      unreadNotificationsCount: 0,
    });
  }, []);

  /* =========================
     NAVIGATION DATA
  ========================= */
  const mainLinks = [
    { name: "Dashboard", icon: HomeIcon, path: "/home" },
    { name: "Book Appointment", icon: CalendarIcon, path: "/appointments/book" },
    { name: "Appointment History", icon: BookOpenIcon, path: "/appointments/history" },
    { name: "Report Analysis", icon: ChartBarIcon, path: "/reports" },
    { name: "Mood Track", icon: UserIcon, path: "/dashboard" },
    { name: "Mood Fix", icon: UserIcon, path: "/mood-fix" },
    { name: "Reminders", icon: ClockIcon, path: "/reminders", badgeCount: counts.pendingRemindersCount },
    { name: "Notifications", icon: BellIcon, path: "/notifications", badgeCount: counts.unreadNotificationsCount },
    { name: "Journal Reading", icon: BookOpenIcon, path: "/journal" },
  ];

  const bottomLinks = [
    { name: "Settings", icon: Cog6ToothIcon, path: "/settings" },
    { name: "Logout", icon: ArrowRightOnRectangleIcon, path: "/logout" },
  ];

  const isLinkActive = (link: any) => {
    if (strictActive) return activePage === link.name;
    return activePage === link.name || location.pathname === link.path;
  };

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : "expanded"} ${scrolled ? "scrolled" : ""}`}>
      
      {/* TOP SECTION */}
      <div className="sidebar-top">
        <div className={`logo ${collapsed ? "hide" : "show"}`}>
          <span>MediLink</span>
        </div>

        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* MAIN LINKS */}
      <nav className="sidebar-nav">
        {mainLinks.map((link) => (
          <div
            key={link.name}
            onClick={() => navigate(link.path)}
            className={`nav-item ${isLinkActive(link) ? "active" : ""}`}
          >
            <link.icon className="icon" />

            {!collapsed && (
              <>
                <span className="label">{link.name}</span>

                {typeof link.badgeCount === "number" && (
                  <span className="badge">{link.badgeCount}</span>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* BOTTOM LINKS */}
      <div className="sidebar-bottom">
        {bottomLinks.map((link) => (
          <div
            key={link.name}
            onClick={() => navigate(link.path)}
            className="nav-item"
          >
            <link.icon className="icon" />
            {!collapsed && <span className="label">{link.name}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;