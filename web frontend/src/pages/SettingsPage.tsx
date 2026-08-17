import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Stethoscope, Users, FileText, Settings as SettingsIcon, LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
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
      <aside className="sidebar">
        <div className="logo-section">
          <h2 className="logo">MediLink</h2>
        </div>


        <nav className="navigation">
          <ul className="nav-list">
            <li className="nav-item" onClick={() => handleNav('/admin-dashboard')}>
              <span className="nav-icon"><LayoutDashboard size={20} /></span>
              <span className="nav-label">Dashboard</span>
            </li>
            <li className="nav-item" onClick={() => handleNav('/manage-doctors')}>
              <span className="nav-icon"><Stethoscope size={20} /></span>
              <span className="nav-label">Manage Doctors</span>
            </li>
            <li className="nav-item" onClick={() => handleNav('/doctor-approvals')}>
              <span className="nav-icon"><ShieldCheck size={20} /></span>
              <span className="nav-label">Doctor Approvals</span>
            </li>
            <li className="nav-item" onClick={() => handleNav('/manage-patients')}>
              <span className="nav-icon"><Users size={20} /></span>
              <span className="nav-label">Manage Patients</span>
            </li>
            <li className="nav-item" onClick={() => handleNav('/reports')}>
              <span className="nav-icon"><FileText size={20} /></span>
              <span className="nav-label">Reports</span>
            </li>
            <li className="nav-item nav-item-active" onClick={() => handleNav('/settings')}>
              <span className="nav-icon"><SettingsIcon size={20} /></span>
              <span className="nav-label">Settings</span>
              <span className="nav-arrow">›</span>
            </li>
          </ul>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon"><LogOut size={20} /></span>
          <span className="logout-text">Log Out</span>
        </button>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">Platform Settings</h1>
            <p className="header-subtitle">
              Configure your MediLink admin dashboard, security preferences, and notification options in one place.
            </p>
          </div>
        </div>

        <div className="settings-overview">
          <div className="quick-card">
            <h3>Profile Overview</h3>
            <p>Administrator account currently active with full system access and audit privileges.</p>
            <strong>{profile.fullName}</strong>
            <span>{profile.email}</span>
          </div>
          <div className="quick-card">
            <h3>Security</h3>
            <p>Two-factor authentication and auto-logout are configured to protect your account.</p>
            <strong>{security.twoFactor ? '2FA Enabled' : '2FA Disabled'}</strong>
          </div>
          <div className="quick-card">
            <h3>Notifications</h3>
            <p>Appointment alerts, doctor updates, and report summaries can be customized below.</p>
            <strong>{notifications.appointmentAlerts ? 'Alerts On' : 'Alerts Off'}</strong>
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
              <div className="toggle-row">
                <div className="toggle-control">
                  <div className="toggle-info">
                    <strong>Two-factor authentication</strong>
                    <span>Protect your login with an additional verification step.</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={security.twoFactor}
                      onChange={() => handleSecurityToggle('twoFactor')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="toggle-control">
                  <div className="toggle-info">
                    <strong>Auto logout</strong>
                    <span>Sign out automatically after periods of inactivity.</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={security.autoLogout}
                      onChange={() => handleSecurityToggle('autoLogout')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </section>

            <section className="settings-card full-width">
              <h2>Notification Preferences</h2>
              <p className="section-description">
                Choose the alerts and update emails you want to receive from the MediLink admin portal.
              </p>
              <div className="toggle-row">
                <div className="toggle-control">
                  <div className="toggle-info">
                    <strong>Appointment alerts</strong>
                    <span>Receive notifications when appointments are scheduled or changed.</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.appointmentAlerts}
                      onChange={() => handleNotificationToggle('appointmentAlerts')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="toggle-control">
                  <div className="toggle-info">
                    <strong>Doctor updates</strong>
                    <span>Get notified when doctor profiles or schedules change.</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.doctorUpdates}
                      onChange={() => handleNotificationToggle('doctorUpdates')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="toggle-control">
                  <div className="toggle-info">
                    <strong>Report summaries</strong>
                    <span>Receive weekly summaries of system analytics and reports.</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.reportSummaries}
                      onChange={() => handleNotificationToggle('reportSummaries')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="toggle-control">
                  <div className="toggle-info">
                    <strong>Weekly digest</strong>
                    <span>Receive a weekly email digest of system activity and updates.</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.weeklyDigest}
                      onChange={() => handleNotificationToggle('weeklyDigest')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </section>

            <section className="settings-card support-card">
              <h2>Need Assistance?</h2>
              <p>
                For help with account recovery, security audits, or administrative support, contact the MediLink support team.
              </p>
              <div className="save-actions">
                <button type="button" className="contact-btn" onClick={() => alert('Contact support at support@medilink.com')}>
                  Contact Support
                </button>
                <button type="button" className="danger-btn" onClick={() => alert('Resetting settings to default values...')}>
                  Reset to Default
                </button>
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
