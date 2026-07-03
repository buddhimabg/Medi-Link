import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  Calendar,
  BookOpen,
  BarChart2,
  User,
  Clock,
  Bell,
  Book,
  Settings,
  LogOut,
} from "lucide-react";
import "./Sidebar.css";

const Sidebar: React.FC = () => {
  // We use this to check which page is currently active so we can highlight it
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <Home size={20} /> },
    {
      name: "Book Appointment",
      path: "/BookAppointment",
      icon: <Calendar size={20} />,
    },
    {
      name: "Appointment History",
      path: "/history",
      icon: <BookOpen size={20} />,
    },
    {
      name: "Report Analysis",
      path: "/reports",
      icon: <BarChart2 size={20} />,
    },
    { name: "Mood Track", path: "/mood-track", icon: <User size={20} /> },
    { name: "Mood Fix", path: "/mood-fix", icon: <User size={20} /> },
    {
      name: "Reminders",
      path: "/reminders",
      icon: <Clock size={20} />,
      badge: 0,
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: <Bell size={20} />,
      badge: 0,
    },
    { name: "Journal Reading", path: "/journal", icon: <Book size={20} /> },
  ];

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h2>MediLink</h2>
        <button className="collapse-btn">
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.name} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${
                  location.pathname === item.path ? "active" : ""
                }`}
              >
                <div className="nav-link-content">
                  <span className="icon">{item.icon}</span>
                  <span className="text">{item.name}</span>
                </div>
                {/* Render badge if it exists (even if it's 0) */}
                {item.badge !== undefined && (
                  <span className="badge">{item.badge}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="sidebar-footer">
        <ul className="nav-list">
          <li className="nav-item">
            <Link to="/settings" className="nav-link">
              <div className="nav-link-content">
                <span className="icon">
                  <Settings size={20} />
                </span>
                <span className="text">Settings</span>
              </div>
            </Link>
          </li>
          <li className="nav-item">
            <button className="nav-link logout-btn">
              <div className="nav-link-content">
                <span className="icon">
                  <LogOut size={20} />
                </span>
                <span className="text">Logout</span>
              </div>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
