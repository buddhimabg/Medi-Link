// src/components/Layout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";
import "./layout.css"; // We will create this next!

const Layout: React.FC = () => {
  return (
    <div className="app-layout">
      {/* The Sidebar stays fixed on the left */}
      <Sidebar />

      {/* The main content area changes based on the URL */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
