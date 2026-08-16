import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LogOut,
  Hospital,
  UserCircle
} from 'lucide-react';
import './sidebar.css';

interface SidebarProps {
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard',  name: 'Dashboard', icon: LayoutDashboard },
    { path: '/schedule',   name: 'Schedule',  icon: Calendar        },
    { path: '/patients',   name: 'Patients',  icon: Users           },
    { path: '/profile',    name: 'Profile',   icon: UserCircle      },
    { path: '/settings',   name: 'Settings',  icon: Settings        },
  ];

  const handleNavigation = (path: string) => navigate(path);

  const handleLogout = () => {
    if (onLogout) onLogout();
    else navigate('/login');
  };

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === '/schedule' && location.pathname.startsWith('/view')) ||
    (path === '/patients' && location.pathname.startsWith('/patients'));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <Hospital size={28} />
          <span>MediLink</span>
        </div>
      </div>

     

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      <button className="logout-btn-sidebar" onClick={handleLogout}>
        <LogOut size={20} />
        <span>Log Out</span>
      </button>
    </aside>
  );
};

export default Sidebar;