import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, clearAuthToken } from '../api/api';
import AdminSidebar from '../components/AdminSidebar';
import './SettingsPage.css';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    fullName: 'Mr. David',
    email: 'david@medilink.com',
    phone: '+94 77 999 1234',
    role: 'Administrator'
  });

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactor: true,
    autoLogout: true
  });

  const [notifications, setNotifications] = useState({
    appointmentAlerts: true,
    doctorUpdates: true,
    reportSummaries: false,
    weeklyDigest: true
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiFetch<any>('/auth/profile');
        if (response?.success && response.data) {
          setProfile(prev => ({
            ...prev,
            fullName: response.data.name || prev.fullName,
            email: response.data.email || prev.email,
            phone: response.data.phone || prev.phone,
            role: response.data.role || prev.role
          }));
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };
    
    fetchProfile();
  }, []);

  const handleLogout = () => {
    navigate('/login');
  };

  const handleNav = (path: string) => {
    navigate(path);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSecurityToggle = (field: 'twoFactor' | 'autoLogout') => {
    setSecurity(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleNotificationToggle = (field: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch<any>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: profile.fullName,
          email: profile.email,
          phone: profile.phone
        })
      });
      if (response?.success) {
        alert('Settings saved successfully.');
      } else {
        alert(response?.message || 'Failed to save settings.');
      }
    } catch (error: any) {
      alert(error.message || 'An error occurred while saving.');
    }
  };


  return (
    <div className="settings-container">
      <AdminSidebar activeRoute="" />

      <main className="main-content">
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">Platform Settings</h1>
            <p className="header-subtitle">
              Configure your MediLink admin dashboard, security preferences, and notification options in one place.
            </p>
          </div>
        </div>



        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="settings-grid">
            <section className="settings-card">
              <h2>Profile Settings</h2>
              <p className="section-description">
                Update the administrator contact details and role information used across the system.
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    value={profile.fullName}
                    onChange={handleProfileChange}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    placeholder="example@medilink.com"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    value={profile.phone}
                    onChange={handleProfileChange}
                    placeholder="+94 77 999 1234"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select id="role" name="role" value={profile.role} onChange={handleProfileChange}>
                    <option>Administrator</option>
                    <option>Manager</option>
                    <option>Supervisor</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="settings-card">
              <h2>Security Settings</h2>
              <p className="section-description">
                Keep your account secure with strong password controls and automatic session management.
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={security.currentPassword}
                    onChange={e => setSecurity(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={security.newPassword}
                    onChange={e => setSecurity(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Create a new password"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={security.confirmPassword}
                    onChange={e => setSecurity(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

            </section>




          </div>

          <div className="save-actions">
            <button type="submit" className="save-btn">
              Save Changes
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Settings;
