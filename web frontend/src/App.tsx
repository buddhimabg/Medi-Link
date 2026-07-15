import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landingpage";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerpage";
import "./App.css";
import Patientdashboard from "./pages/patientDashboard";
import BookAppointment from "./pages/bookAppointment";
import WellnessHub from "./pages/WellnessHub";
import Assessments from "./pages/assessments"; // Added mental health assessments page
import WellnessVideos from "./pages/wellness/WellnessVideos";
import WellnessMindfulness from "./pages/wellness/WellnessMindfulness";
import WellnessSleep from "./pages/wellness/WellnessSleep";
import WellnessEducation from "./pages/wellness/WellnessEducation";
import WellnessSelfCare from "./pages/wellness/WellnessSelfCare";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<Patientdashboard />} />
        <Route path="/bookAppointment" element={<BookAppointment />} />
        <Route path="/Wellnesshub" element={<WellnessHub />} />
        <Route path="/assessments" element={<Assessments />} />
        
        {/* Wellness Hub Categories */}
        <Route path="/wellness/videos" element={<WellnessVideos />} />
        <Route path="/wellness/mindfulness" element={<WellnessMindfulness />} />
        <Route path="/wellness/sleep" element={<WellnessSleep />} />
        <Route path="/wellness/education" element={<WellnessEducation />} />
        <Route path="/wellness/self-care" element={<WellnessSelfCare />} />
      </Routes>
    </Router>
  );
};

export default App;
