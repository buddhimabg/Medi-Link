import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landingpage";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerpage";
import "./App.css";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Here is your Landing Page at the default "/" route! */}
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<LoginPage />} />

        {/* Add this route so localhost:5173/register works */}
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </Router>
  );
};

export default App;
