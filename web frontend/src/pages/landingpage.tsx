import React, { useState } from "react";
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

interface Doctor {
  _id: string;
  name: string;
  specialty?: string;
  hospital?: string;
  imageUrl?: string;
}

const LandingPage: React.FC = () => {
  // SEARCH LOGIC & STATE
  const [nameQuery, setNameQuery] = useState("");
  const [specQuery, setSpecQuery] = useState("");
  const [hospQuery, setHospQuery] = useState("");

  const [results, setResults] = useState<Doctor[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- NEW: Smooth Scroll Helper Function ---
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);

    try {
      const queryParams = new URLSearchParams();
      if (nameQuery) queryParams.append("name", nameQuery);
      if (specQuery) queryParams.append("specialization", specQuery);
      if (hospQuery) queryParams.append("hospital", hospQuery);

      const response = await fetch(
        `http://localhost:5000/api/doctors/search?${queryParams.toString()}`
      );

      if (!response.ok) throw new Error("Failed to fetch data");

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
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
          <li>
            <a
              href="#doctors-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("doctors-section");
              }}
            >
              Doctors
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

      {/* Search/Filter Section (Target 3: Doctors) */}
      <section id="doctors-section" className="search-section-wrapper">
        <form className="search-bar-container" onSubmit={handleSearch}>
          <div className="search-input-group">
            <label>Doctor name</label>
            <input
              type="text"
              placeholder="Search doctor name"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
            />
          </div>
          <div className="search-input-group">
            <label>Specialization</label>
            <input
              type="text"
              placeholder="Select Specialization"
              value={specQuery}
              onChange={(e) => setSpecQuery(e.target.value)}
            />
          </div>
          <div className="search-input-group">
            <label>Hospital</label>
            <input
              type="text"
              placeholder="Select hospital"
              value={hospQuery}
              onChange={(e) => setHospQuery(e.target.value)}
            />
          </div>
          <div className="search-input-group">
            <label>Date</label>
            <input type="date" placeholder="MM/DD/YYYY" />
          </div>
          <div className="search-button-group">
            <button type="submit" className="btn-search" disabled={isLoading}>
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>
      </section>

      {/* Doctor Results */}
      {hasSearched && (
        <section
          className="search-results-container"
          style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}
        >
          {results.length === 0 && !isLoading && (
            <h3
              style={{
                textAlign: "center",
                color: "#666",
                marginBottom: "60px",
              }}
            >
              No doctors found. Try a different search.
            </h3>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "24px",
            }}
          >
            {results.map((doctor) => (
              <div
                key={doctor._id}
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "12px",
                  padding: "20px",
                  backgroundColor: "white",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                }}
              >
                <img
                  src={
                    doctor.imageUrl ||
                    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=250&auto=format&fit=crop"
                  }
                  alt={doctor.name}
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    marginBottom: "15px",
                    objectFit: "cover",
                  }}
                />

                <h3
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "1.2rem",
                    color: "#1a365d",
                  }}
                >
                  {doctor.name}
                </h3>
                <p style={{ margin: "5px 0", color: "#4a5568" }}>
                  <strong>Specialty:</strong>{" "}
                  {doctor.specialty || "General Specialist"}
                </p>
                <p style={{ margin: "5px 0", color: "#4a5568" }}>
                  <strong>Hospital:</strong>{" "}
                  {doctor.hospital || "Not specified"}
                </p>

                <button
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginTop: "20px",
                    backgroundColor: "#1e56a0",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Book Now
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

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
