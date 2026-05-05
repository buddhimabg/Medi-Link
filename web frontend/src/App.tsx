import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landingpage";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerpage";
import "./App.css";
import Patientdashboard from "./pages/patientDashboard";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<Patientdashboard />} />
      </Routes>
    </Router>
  );
};

export default App;
