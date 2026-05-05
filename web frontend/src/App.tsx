import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ManageDoctors from "./pages/ManageDoctorsPage";
import ManagePatients from "./pages/ManagePatientsPage";
import Reports from "./pages/ReportsPage";
import Settings from "./pages/SettingsPage";
import "./App.css";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminDashboardPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
        <Route path="/manage-doctors" element={<ManageDoctors />} />
        <Route path="/manage-patients" element={<ManagePatients />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
};

export default App;
