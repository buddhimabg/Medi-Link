import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SettingsPage.css';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [privacyMenuOpen, setPrivacyMenuOpen] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Settings saved successfully.');
  };

  // Admin Control Functions
  const handleSystemDiagnostics = () => {
    alert(
      'System Diagnostics:\n' +
      '✓ Database: Connected\n' +
      '✓ API Servers: 3/3 Online\n' +
      '✓ Cache Memory: 85% Used\n' +
      '✓ Storage: 1.2 TB / 5 TB\n' +
      '✓ SSL Certificate: Valid (Expires: 2026-12-15)\n' +
      '✓ Backup Status: Last backup - 2 hours ago\n\n' +
      'All systems operational.'
    );
    setAdminMenuOpen(false);
  };

  const handleViewAuditLogs = () => {
    alert(
      'Recent Audit Logs:\n\n' +
      '1. [2026-04-04 14:32] Admin login - Mr. David\n' +
      '2. [2026-04-04 14:15] Settings updated - Profile\n' +
      '3. [2026-04-04 13:45] Doctor profile created - Dr. Sarah\n' +
      '4. [2026-04-04 13:20] Patient data exported\n' +
      '5. [2026-04-04 12:50] System backup completed\n' +
      '6. [2026-04-04 12:30] Security settings modified\n\n' +
      'Full audit logs available in the logs folder.'
    );
    setAdminMenuOpen(false);
  };

  const handleBackupSystem = () => {
    alert(
      'System Backup Initiated\n\n' +
      'Creating backup of:\n' +
      '✓ Patient Database\n' +
      '✓ Doctor Profiles\n' +
      '✓ Appointment Records\n' +
      '✓ System Configuration\n' +
      '✓ User Credentials\n\n' +
      'Estimated time: 5-10 minutes\n' +
      'Backup file will be stored securely.'
    );
    setAdminMenuOpen(false);
  };

  const handleClearCache = () => {
    const confirmed = window.confirm('Clear all system cache? This may temporarily slow down the system.');
    if (confirmed) {
      alert(
        'Cache Cleared Successfully\n\n' +
        '✓ Application Cache: Cleared\n' +
        '✓ Database Cache: Cleared\n' +
        '✓ Session Cache: Cleared\n' +
        '✓ Temporary Files: Deleted\n\n' +
        'Memory freed: ~450 MB\n' +
        'System ready for normal operation.'
      );
      setAdminMenuOpen(false);
    }
  };

  const handleExportSettings = () => {
    alert(
      'Exporting System Settings...\n\n' +
      'Export includes:\n' +
      '✓ User Roles & Permissions\n' +
      '✓ Doctor Schedules\n' +
      '✓ System Configurations\n' +
      '✓ Email Templates\n' +
      '✓ Report Formats\n\n' +
      'File: medilink_settings_export_2026-04-04.json\n' +
      'Exported to: /exports/ folder'
    );
    setAdminMenuOpen(false);
  };

  const handleManageAPIKeys = () => {
    alert(
      'API Keys Management\n\n' +
      'Active Keys:\n' +
      '1. Production API: sk_prod_****8f4k (Created: 2025-12-01)\n' +
      '2. Development API: sk_dev_****2m9j (Created: 2026-01-15)\n' +
      '3. Staging API: sk_stage_****7p2q (Created: 2026-02-01)\n\n' +
      'Recent API Calls: 12,450 (Last 24 hours)\n\n' +
      'To rotate keys or create new ones, please use the API Dashboard.'
    );
    setAdminMenuOpen(false);
  };

  const handleDatabaseMaintenance = () => {
    alert(
      'Database Maintenance\n\n' +
      'Last Maintenance: 2026-04-03 23:30\n\n' +
      'Operations:\n' +
      '✓ Index Optimization\n' +
      '✓ Query Performance Check\n' +
      '✓ Fragmentation Analysis\n' +
      '✓ Orphaned Records Cleanup\n' +
      '✓ Statistics Update\n\n' +
      'Database Size: 45.2 GB\n' +
      'Free Space: 23.8 GB\n' +
      'Health: Excellent'
    );
    setAdminMenuOpen(false);
  };

  const handleSystemAlerts = () => {
    alert(
      'System Alerts & Notifications\n\n' +
      'Critical: None\n' +
      'Warnings: 2\n' +
      '  • Disk space below 25%\n' +
      '  • Database fragmentation detected\n\n' +
      'Info: 5\n' +
      '  • Scheduled backup completed\n' +
      '  • SSL certificate renewal in 30 days\n' +
      '  • API rate limit usage: 78%\n' +
      '  • Daily report generation completed\n' +
      '  • User login spike detected\n\n' +
      'Last Check: Just now'
    );
    setAdminMenuOpen(false);
  };

  const handleManagePermissions = () => {
    alert(
      'Manage User Permissions\n\n' +
      'Current Users:\n' +
      '• Mr. David (Administrator) - Full Access\n' +
      '• Dr. Sarah Johnson (Doctor) - View/Create Appointments\n' +
      '• Mr. John Smith (Manager) - Manage Doctors & Patients\n' +
      '• Ms. Emily Brown (Staff) - View Patient Records\n\n' +
      'Total Active Users: 4\n' +
      'Pending Invitations: 1\n\n' +
      'To modify permissions, use the User Management Panel.'
    );
    setAdminMenuOpen(false);
  };

  // Privacy & Security Functions
  const handleTwoFactorAuth = () => {
    alert(
      'Two-Factor Authentication (2FA)\n\n' +
      'Status: ✓ Enabled\n' +
      'Method: Authenticator App (Google Authenticator)\n' +
      'Backup Codes: 5 remaining (out of original 10)\n\n' +
      'Last Verified: 2026-04-04 14:30\n\n' +
      'Actions:\n' +
      '• Regenerate backup codes\n' +
      '• Use phone number instead\n' +
      '• Disable 2FA (not recommended)\n\n' +
      'For your security, 2FA is strongly recommended.'
    );
    setPrivacyMenuOpen(false);
  };

  const handleLoginHistory = () => {
    alert(
      'Login History (Last 10 Sessions)\n\n' +
      '1. 2026-04-04 14:35 | Desktop Browser | Chrome | New York, USA\n' +
      '2. 2026-04-04 09:20 | Mobile App | iOS | New York, USA\n' +
      '3. 2026-04-03 18:15 | Desktop Browser | Firefox | New York, USA\n' +
      '4. 2026-04-03 08:45 | Desktop Browser | Chrome | New York, USA\n' +
      '5. 2026-04-02 20:30 | Mobile App | Android | Boston, USA\n' +
      '6. 2026-04-02 09:10 | Desktop Browser | Chrome | New York, USA\n' +
      '7. 2026-04-01 19:50 | Desktop Browser | Chrome | New York, USA\n' +
      '8. 2026-03-31 15:20 | Mobile App | iOS | New York, USA\n' +
      '9. 2026-03-31 10:05 | Desktop Browser | Chrome | New York, USA\n' +
      '10. 2026-03-30 22:40 | Desktop Browser | Safari | New York, USA\n\n' +
      'Suspicious Activity: None detected'
    );
    setPrivacyMenuOpen(false);
  };

  const handleActiveSessions = () => {
    alert(
      'Manage Active Sessions\n\n' +
      'Current Active Sessions: 2\n\n' +
      '1. Current Session (This Device)\n' +
      '   Device: MacBook Pro\n' +
      '   Browser: Chrome\n' +
      '   IP: 192.168.1.100\n' +
      '   Location: New York, USA\n' +
      '   Last Activity: Just now\n\n' +
      '2. Mobile Session\n' +
      '   Device: iPhone 14\n' +
      '   App: MediLink Mobile\n' +
      '   IP: 192.168.1.101\n' +
      '   Location: New York, USA\n' +
      '   Last Activity: 2 hours ago\n\n' +
      'Action: Sign out of all other sessions'
    );
    setPrivacyMenuOpen(false);
  };

  const handleChangePassword = () => {
    alert(
      'Change Password\n\n' +
      'Last Changed: 2026-02-15 (49 days ago)\n' +
      'Password Strength: Strong\n\n' +
      'Password Requirements:\n' +
      '✓ Minimum 12 characters\n' +
      '✓ At least 1 uppercase letter\n' +
      '✓ At least 1 lowercase letter\n' +
      '✓ At least 1 number\n' +
      '✓ At least 1 special character (!@#$%^&*)\n\n' +
      'For better security, change your password every 60 days.\n\n' +
      'Note: You will need to re-login after password change.'
    );
    setPrivacyMenuOpen(false);
  };

  const handleEncryptionStatus = () => {
    alert(
      'Data Encryption Status\n\n' +
      'Connection Security: ✓ HTTPS/TLS 1.3\n' +
      'Database Encryption: ✓ AES-256\n' +
      'API Keys Encryption: ✓ Encrypted at rest\n' +
      'Backup Encryption: ✓ AES-256\n' +
      'Patient Data: ✓ HIPAA Compliant\n\n' +
      'SSL Certificate:\n' +
      'Issuer: Let\'s Encrypt\n' +
      'Valid Until: 2026-12-15\n' +
      'Renewal Status: Auto-renewal enabled\n\n' +
      'All data transmissions are encrypted end-to-end.'
    );
    setPrivacyMenuOpen(false);
  };

  const handlePrivacyPolicy = () => {
    alert(
      'Privacy Policy & GDPR\n\n' +
      'Last Updated: 2026-01-15\n' +
      'Version: 3.2\n\n' +
      'Key Points:\n' +
      '• We collect minimal personal data\n' +
      '• Data is encrypted at rest and in transit\n' +
      '• You have the right to access your data\n' +
      '• You can request data deletion\n' +
      '• GDPR compliant for EU users\n' +
      '• HIPAA compliant for healthcare data\n' +
      '• CCPA compliant for California users\n\n' +
      'Full Privacy Policy available at:\n' +
      'https://medilink.com/privacy-policy\n\n' +
      'Questions? Contact: privacy@medilink.com'
    );
    setPrivacyMenuOpen(false);
  };

  const handleDataDeletion = () => {
    alert(
      'Data Deletion & GDPR Request\n\n' +
      'Right to be Forgotten:\n' +
      'You can request complete deletion of your account and data.\n\n' +
      'Data to be Deleted:\n' +
      '✓ Personal Profile Information\n' +
      '✓ Login History & Activity Logs\n' +
      '✓ Preferences & Settings\n' +
      '✓ Audit Trail (30 days retention)\n\n' +
      'Data Retained for Legal Compliance:\n' +
      '• Medical records (as per regulations)\n' +
      '• Transaction records (7 years)\n' +
      '• Anonymized analytics\n\n' +
      'Deletion Timeline: 30 days\n' +
      'Status: No pending requests\n\n' +
      'WARNING: This action is irreversible.\n' +
      'Contact support@medilink.com to submit request.'
    );
    setPrivacyMenuOpen(false);
  };

  const handleSecurityBreachCheck = () => {
    alert(
      'Security Breach Check\n\n' +
      'Last Scan: 2026-04-04 10:00 UTC\n' +
      'Status: ✓ All Clear\n\n' +
      'Password Breach Check: Not found\n' +
      'Email Exposed: No\n' +
      'Known Vulnerabilities: None\n' +
      'Dark Web Monitoring: No mentions\n' +
      'Credential Stuffing Risk: Low\n\n' +
      'Security Score: 92/100 (Excellent)\n\n' +
      'Recommendations:\n' +
      '1. Continue using strong passwords\n' +
      '2. Keep 2FA enabled\n' +
      '3. Review active sessions regularly\n' +
      '4. Update to latest browser\n\n' +
      'Next Scan: 2026-04-11 10:00 UTC'
    );
    setPrivacyMenuOpen(false);
  };

  const handleIPWhitelist = () => {
    alert(
      'IP Whitelist Management\n\n' +
      'Whitelisted IPs: 3\n\n' +
      '1. 192.168.1.100 (Office Desktop)\n' +
      '   Added: 2026-01-10\n' +
      '   Last Used: 2026-04-04 14:30\n\n' +
      '2. 192.168.1.101 (Mobile Device)\n' +
      '   Added: 2026-02-15\n' +
      '   Last Used: 2026-04-04 12:50\n\n' +
      '3. 10.0.0.50 (VPN Connection)\n' +
      '   Added: 2026-03-20\n' +
      '   Last Used: 2026-04-03 09:15\n\n' +
      'Unlisted IP Warning: Enabled\n' +
      'Require Verification for New IPs: Yes\n\n' +
      'Add or remove IPs from the whitelist.'
    );
    setPrivacyMenuOpen(false);
  };

  const handleDevicePermissions = () => {
    alert(
      'Manage Device & App Permissions\n\n' +
      'Connected Devices: 3\n\n' +
      '1. MacBook Pro (Desktop)\n' +
      '   Browser: Chrome\n' +
      '   Connected: 2026-01-10\n' +
      '   Permissions: Full Access\n\n' +
      '2. iPhone 14 (Mobile)\n' +
      '   App: MediLink Mobile v3.2.1\n' +
      '   Connected: 2026-02-15\n' +
      '   Permissions: Camera, Photos, Contacts\n\n' +
      '3. iPad Air (Tablet)\n' +
      '   Browser: Safari\n' +
      '   Connected: 2026-03-20\n' +
      '   Permissions: Full Access\n\n' +
      'You can revoke access to any device anytime.\n' +
      'Revoked devices will require re-authentication.'
    );
    setPrivacyMenuOpen(false);
  };

  return (
    <div className="settings-container">
      <aside className="sidebar">
        <div className="logo-section">
          <h2 className="logo">MediLink</h2>
        </div>

        <div className="profile-section">
          <img
            src="https://i.pinimg.com/736x/98/d4/e3/98d4e3c28316349f3f7ccc976929e986.jpg"
            alt="Profile"
            className="profile-image"
          />
        </div>

        <nav className="navigation">
          <ul className="nav-list">
            <li className="nav-item" onClick={() => handleNav('/admin-dashboard')}>
              <span className="nav-icon">📊</span>
              <span className="nav-label">Dashboard</span>
            </li>
            <li className="nav-item" onClick={() => handleNav('/manage-doctors')}>
              <span className="nav-icon">👨‍⚕️</span>
              <span className="nav-label">Manage Doctors</span>
            </li>
            <li className="nav-item" onClick={() => handleNav('/manage-patients')}>
              <span className="nav-icon">👥</span>
              <span className="nav-label">Manage Patients</span>
            </li>
            <li className="nav-item" onClick={() => handleNav('/reports')}>
              <span className="nav-icon">📋</span>
              <span className="nav-label">Reports</span>
            </li>
            <li className="nav-item nav-item-active" onClick={() => handleNav('/settings')}>
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Settings</span>
              <span className="nav-arrow">›</span>
            </li>
          </ul>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon">🚪</span>
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
          <div className="page-meta">
            <div className="admin-control-wrapper">
              <button 
                className="admin-control-btn"
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                title="Admin Control Panel"
              >
                <span className="admin-icon">⚙️</span>
                <span>Admin Control</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              
              {adminMenuOpen && (
                <div className="admin-dropdown-menu">
                  <button 
                    className="dropdown-item"
                    onClick={handleSystemDiagnostics}
                  >
                    <span className="item-icon">🏥</span>
                    <div className="item-content">
                      <strong>System Diagnostics</strong>
                      <span>Check system health & status</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleViewAuditLogs}
                  >
                    <span className="item-icon">📋</span>
                    <div className="item-content">
                      <strong>View Audit Logs</strong>
                      <span>Check user activities & changes</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleBackupSystem}
                  >
                    <span className="item-icon">💾</span>
                    <div className="item-content">
                      <strong>Backup System</strong>
                      <span>Create system backup</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleClearCache}
                  >
                    <span className="item-icon">🧹</span>
                    <div className="item-content">
                      <strong>Clear Cache</strong>
                      <span>Free up memory & storage</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleExportSettings}
                  >
                    <span className="item-icon">📤</span>
                    <div className="item-content">
                      <strong>Export Settings</strong>
                      <span>Export system configuration</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleManageAPIKeys}
                  >
                    <span className="item-icon">🔑</span>
                    <div className="item-content">
                      <strong>API Keys</strong>
                      <span>Manage API access & keys</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleDatabaseMaintenance}
                  >
                    <span className="item-icon">🗄️</span>
                    <div className="item-content">
                      <strong>Database Maintenance</strong>
                      <span>Database health & optimization</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleSystemAlerts}
                  >
                    <span className="item-icon">🚨</span>
                    <div className="item-content">
                      <strong>System Alerts</strong>
                      <span>View warnings & notifications</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleManagePermissions}
                  >
                    <span className="item-icon">👤</span>
                    <div className="item-content">
                      <strong>Manage Permissions</strong>
                      <span>User roles & access control</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <div className="privacy-control-wrapper">
              <button 
                className="privacy-control-btn"
                onClick={() => setPrivacyMenuOpen(!privacyMenuOpen)}
                title="Privacy & Security Control Panel"
              >
                <span className="privacy-icon">🔒</span>
                <span>Privacy & Security</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              
              {privacyMenuOpen && (
                <div className="privacy-dropdown-menu">
                  <button 
                    className="dropdown-item"
                    onClick={handleTwoFactorAuth}
                  >
                    <span className="item-icon">🔐</span>
                    <div className="item-content">
                      <strong>Two-Factor Authentication</strong>
                      <span>Manage 2FA settings & backups</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleLoginHistory}
                  >
                    <span className="item-icon">📅</span>
                    <div className="item-content">
                      <strong>Login History</strong>
                      <span>View all login attempts</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleActiveSessions}
                  >
                    <span className="item-icon">💻</span>
                    <div className="item-content">
                      <strong>Active Sessions</strong>
                      <span>Manage logged-in devices</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleChangePassword}
                  >
                    <span className="item-icon">🔑</span>
                    <div className="item-content">
                      <strong>Change Password</strong>
                      <span>Update your account password</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleEncryptionStatus}
                  >
                    <span className="item-icon">🛡️</span>
                    <div className="item-content">
                      <strong>Encryption Status</strong>
                      <span>View data encryption configuration</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handlePrivacyPolicy}
                  >
                    <span className="item-icon">📜</span>
                    <div className="item-content">
                      <strong>Privacy Policy & GDPR</strong>
                      <span>Review our privacy commitments</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleDataDeletion}
                  >
                    <span className="item-icon">🗑️</span>
                    <div className="item-content">
                      <strong>Data Deletion Request</strong>
                      <span>Request permanent data removal</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleSecurityBreachCheck}
                  >
                    <span className="item-icon">🔍</span>
                    <div className="item-content">
                      <strong>Security Breach Check</strong>
                      <span>Check for compromised credentials</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleIPWhitelist}
                  >
                    <span className="item-icon">🌐</span>
                    <div className="item-content">
                      <strong>IP Whitelist</strong>
                      <span>Manage trusted IP addresses</span>
                    </div>
                  </button>
                  
                  <button 
                    className="dropdown-item"
                    onClick={handleDevicePermissions}
                  >
                    <span className="item-icon">📱</span>
                    <div className="item-content">
                      <strong>Device Permissions</strong>
                      <span>Control device & app access</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
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
