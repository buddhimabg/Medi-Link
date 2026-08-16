import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface LayoutProps {
  children: React.ReactNode;
  activePath: string;
}

const MainLayout = ({ children, activePath }: LayoutProps) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 1. TopBar එක උඩින්ම (Full width) */}
      <TopBar onMenuClick={() => {}} onLogout={() => {}} doctorName="Dr. Dilshari" />
      
      {/* 2. ඉතිරි කොටස (Sidebar සහ Content එක එක පෙළට) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* වම් පැත්තේ Sidebar එක (TopBar එකට යටින් පටන් ගනී) */}
        <div style={{ width: '260px', flexShrink: 0 }}>
          <Sidebar activePath={activePath} isOpen={true} onClose={() => {}} />
        </div>
        
        {/* දකුණු පැත්තේ Content එක */}
        <main style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#f9f9f9' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;