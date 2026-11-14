import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  ShieldCheck,
  CalendarCheck,
  Users,
  DollarSign,
  Mail,
  FileText,
  Settings,
  LogOut
} from 'lucide-react';
import { apiFetch, clearAuthToken } from '../api/api';
import './AdminSidebar.css';

export interface AdminSidebarProps {
  activeRoute: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeRoute }) => {
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    apiFetch<any>('/doctors/approval-stats')
      .then((res) => {
        if (isMounted && res?.data?.pending !== undefined) {
          setPendingApprovals(res.data.pending);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  const navItems = [
    {
      label: 'Dashboard',
      path: '/admin-dashboard',
      icon: <LayoutDashboard size={19} />
    },
    {
      label: 'Manage Doctors',
      path: '/manage-doctors',
      icon: <Stethoscope size={19} />
    },
    {
      label: 'Doctor Approvals',
      path: '/doctor-approvals',
      icon: <ShieldCheck size={19} />,
      badge: pendingApprovals > 0 ? pendingApprovals : undefined
    },
    {
      label: 'Manage Sessions',
      path: '/manage-sessions',
      icon: <CalendarCheck size={19} />
    },
    {
      label: 'Manage Patients',
      path: '/manage-patients',
      icon: <Users size={19} />
    },
    {
      label: 'Payments & Revenue',
      path: '/admin-payments',
      icon: <DollarSign size={19} />
    },
    {
      label: 'Send Notifications',
      path: '/send-notifications',
      icon: <Mail size={19} />
    },
    {
      label: 'Reports',
      path: '/admin-reports',
      icon: <FileText size={19} />
    },
    {
      label: 'Settings',
      path: '/admin-settings',
      icon: <Settings size={19} />
    }
  ];

  return (
    <aside className="admin-sidebar">
      {/* Logo & Portal Badge */}
      <div className="sidebar-logo-section">
        <h2 className="sidebar-logo">MediLink</h2>
        <span className="admin-portal-badge">Admin Portal</span>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-navigation">
        <ul className="sidebar-nav-list">
          {navItems.map((item) => {
            const isActive = activeRoute === item.path;
            return (
              <li
                key={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="sidebar-counter-badge">{item.badge}</span>
                )}
                {isActive && <span className="sidebar-nav-arrow">›</span>}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Log Out Button */}
      <button className="sidebar-logout-btn" onClick={handleLogout}>
        <span className="sidebar-logout-icon">
          <LogOut size={18} />
        </span>
        <span className="sidebar-logout-text">Log Out</span>
      </button>
    </aside>
  );
};

export default AdminSidebar;
