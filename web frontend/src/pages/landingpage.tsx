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
  return (
    <div className="landing-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <span className="logo-blue">Medi</span>Link
        </div>
        <ul className="navbar-links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/services">Services</Link>
          </li>
          <li>
            <Link to="/doctors">Doctors</Link>
          </li>
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

      {/* Hero Section */}
      <header className="hero-section">
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
          <button className="btn-book-appointment">
            Book an appointment
            <Navigation size={18} className="btn-icon" />
          </button>
        </div>
        <div className="hero-image-wrapper">
          {/* Background Image 2 (Middle layer) */}
          <img
            src={backgroundImage}
            alt="Hospital room"
            className="hero-bg-image hero-bg-2"
          />

          {/* Main Doctor Image (Front layer) */}
          <img src={Doctor} alt="Doctor smiling" className="hero-image" />
        </div>
      </header>

      {/* Features Section */}
      <section className="features-section">
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

      {/* Search/Filter Section */}
      <section className="search-section-wrapper">
        <div className="search-bar-container">
          <div className="search-input-group">
            <label>Doctor name</label>
            <input type="text" placeholder="Search doctor name" />
          </div>
          <div className="search-input-group">
            <label>Specialization</label>
            <input type="text" placeholder="Select Specialization" />
          </div>
          <div className="search-input-group">
            <label>Hospital</label>
            <input type="text" placeholder="Select hospital" />
          </div>
          <div className="search-input-group">
            <label>Date</label>
            <input type="text" placeholder="MM/DD/YYYY" />
          </div>
          <div className="search-button-group">
            <button className="btn-search">Search</button>
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
