import React from 'react';
import { Settings } from 'lucide-react';
import Sidebar from '../components/DoctorPortalSidebar';
import './doctorSettings.css';

const DoctorSettings: React.FC = () => {
  return (
    <div className="doc-settings-page">
      <Sidebar />
      <div className="doc-settings-main">
        <div className="doc-settings-card">
          <Settings size={36} className="doc-settings-icon" />
          <h1>Settings</h1>
          <p>Doctor-portal preferences are being prepared for you.</p>
        </div>
      </div>
    </div>
  );
};

export default DoctorSettings;
