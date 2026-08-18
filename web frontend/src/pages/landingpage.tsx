import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Activity,
  FileText,
  Shield,
  Users,
  BarChart,
  Navigation,
  Send,
} from "lucide-react";
import "./landingpage.css";
import Doctor from "../assets/doctorLandingPage.png";
import backgroundImage from "../assets/herobackground.png";

const LandingPage: React.FC = () => {
  // --- NEW: Smooth Scroll Helper Function ---
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <span className="logo-blue">Medi</span>Link
        </div>

        {/* --- UPDATED: Navigation Links point to IDs now --- */}
        {/* --- UPDATED: Navigation Links --- */}
        <ul className="navbar-links">
          <li>
            <a
              href="#hero-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("hero-section");
              }}
            >
              Home
            </a>
          </li>
          <li>
            <a
              href="#services-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("services-section");
              }}
            >
              Services
            </a>
          </li>
          {/* NEW: Wellness Hub Link routing to a new page */}
          <li>
            <Link to="/wellnessHub">Wellness Hub</Link>
          </li>{" "}
        </ul>

        <div className="navbar-actions">
          <Link to="/login">
            <button className="btn-signin">Sign in</button>
          </Link>
          <Link to="/register">
            <button className="btn-signup">Sign up</button>
          </Link>
        </div>
      </nav>

      {/* Hero Section (Target 1: Home) */}
      <header id="hero-section" className="hero-section">
        <div className="hero-content">
          <h1>
            <span className="text-blue">We care</span>
            <br />
            about your health
          </h1>
          <p>
            Book appointments, consult doctors, and access your prescriptions
            securely all in one seamless platform
          </p>
          <Link to="/login" style={{ textDecoration: "none" }}>
            <button className="btn-book-appointment">
              Book an appointment
              <Navigation size={18} className="btn-icon" />
            </button>
          </Link>
        </div>
        <div className="hero-image-wrapper">
          <img
            src={backgroundImage}
            alt="Hospital room"
            className="hero-bg-image hero-bg-2"
          />
          <img src={Doctor} alt="Doctor smiling" className="hero-image" />
        </div>
      </header>

      {/* Features Section (Target 2: Services) */}
      <section id="services-section" className="features-section">
        <h2 className="section-title">
          Everything You Need for Better Healthcare
        </h2>
        <div className="features-grid">
          <div className="feature-card">
            <Calendar className="feature-icon" size={28} />
            <h3>Easy Appointment Booking</h3>
            <p>
              Schedule appointments with your preferred doctors in just a few
              clicks. Get instant confirmations.
            </p>
          </div>
          <div className="feature-card">
            <Activity className="feature-icon" size={28} />
            <h3>Virtual Consultations</h3>
            <p>
              Connect with doctors remotely through secure video calls and
              messaging.
            </p>
          </div>
          <div className="feature-card">
            <FileText className="feature-icon" size={28} />
            <h3>Digital Prescriptions</h3>
            <p>
              Receive and manage e-prescriptions securely. Access medication
              history anytime.
            </p>
          </div>
          <div className="feature-card">
            <Shield className="feature-icon" size={28} />
            <h3>Secure Records</h3>
            <p>
              Your medical records are encrypted and stored safely with
              HIPAA-compliant security.
            </p>
          </div>
          <div className="feature-card">
            <Users className="feature-icon" size={28} />
            <h3>Patient Management</h3>
            <p>
              Doctors can efficiently manage patient records and treatment plans
              in one place.
            </p>
          </div>
          <div className="feature-card">
            <BarChart className="feature-icon" size={28} />
            <h3>Health Analytics</h3>
            <p>
              Track your health metrics and get insights from comprehensive
              analytics dashboards.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section">
        <div className="footer-content">
          <div className="footer-column brand-column">
            <h2 className="footer-logo">MEDILINK</h2>
            <p>
              Leading the Way in Medical
              <br />
              Excellence, Trusted Care.
            </p>
          </div>
          <div className="footer-column links-column">
            <h3>Important Links</h3>
            <ul>
              <li>
                <Link to="/">Appointment</Link>
              </li>
              <li>
                <Link to="/">Doctors</Link>
              </li>
              <li>
                <Link to="/">Services</Link>
              </li>
              <li>
                <Link to="/">About Us</Link>
              </li>
            </ul>
          </div>
          <div className="footer-column contact-column">
            <h3>Contact Us</h3>
            <ul>
              <li>Call: (237) 681-812-255</li>
              <li>Email: fildineesoe@gmail.com</li>
              <li>Address: 0123 Some place</li>
              <li>Some country</li>
            </ul>
          </div>
          <div className="footer-column newsletter-column">
            <h3>Newsletter</h3>
            <div className="newsletter-input-wrapper">
              <input type="email" placeholder="Enter your email address" />
              <button className="btn-newsletter">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2025 something</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
