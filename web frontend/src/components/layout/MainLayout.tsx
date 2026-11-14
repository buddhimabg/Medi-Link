import React from 'react';
import Sidebar from '../DoctorPortalSidebar';
import TopBar from './TopBar';

interface LayoutProps {
  children: React.ReactNode;
  activePath: string;
}

const MainLayout = ({ children }: LayoutProps) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 1. TopBar එක උඩින්ම (Full width) */}
      <TopBar onMenuClick={() => {}} onLogout={() => {}} doctorName="Dr. Dilshari" />

      {/* 2. ඉතිරි කොටස (Sidebar සහ Content එක එක පෙළට) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Fixed-position doctor-portal sidebar, kept consistent across the whole portal */}
        <Sidebar />

        {/* දකුණු පැත්තේ Content එක */}
        <main style={{ flex: 1, marginLeft: 280, padding: '20px', overflowY: 'auto', backgroundColor: '#f9f9f9' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;