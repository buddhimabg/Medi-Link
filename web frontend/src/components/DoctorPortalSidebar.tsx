import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LogOut,
  Hospital,
  UserCircle,
  Video,
  MessageCircle,
  BookOpen
} from 'lucide-react';
import './DoctorPortalSidebar.css';

interface SidebarProps {
  onLogout?: () => void;
}

const DoctorPortalSidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/doctor-dashboard', name: 'Dashboard',  icon: LayoutDashboard },
    { path: '/schedule',         name: 'Schedule',   icon: Calendar        },
    { path: '/patients',         name: 'Patients',   icon: Users           },
    { path: '/video-call',       name: 'Video Call', icon: Video           },
    { path: '/chatbot',          name: 'Chatbot',    icon: MessageCircle   },
    { path: '/journals',         name: 'Journals',   icon: BookOpen        },
    { path: '/doctor-profile',   name: 'Profile',    icon: UserCircle      },
    { path: '/doctor-settings',  name: 'Settings',   icon: Settings        },
  ];

  const handleNavigation = (path: string) => navigate(path);

  const handleLogout = () => {
    if (onLogout) onLogout();
    else navigate('/login');
  };

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === '/schedule' && location.pathname.startsWith('/view')) ||
    (path === '/patients' && location.pathname.startsWith('/patients')) ||
    (path === '/video-call' && location.pathname.startsWith('/video-call')) ||
    (path === '/journals' && location.pathname.startsWith('/journals'));

  return (
    <aside className="dp-sidebar">
      <div className="dp-sidebar-header">
        <div className="dp-logo">
          <Hospital size={28} />
          <span>MediLink</span>
        </div>
      </div>



      <nav className="dp-sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              className={`dp-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      <button className="dp-logout-btn-sidebar" onClick={handleLogout}>
        <LogOut size={20} />
        <span>Log Out</span>
      </button>
    </aside>
  );
};

export default DoctorPortalSidebar;
