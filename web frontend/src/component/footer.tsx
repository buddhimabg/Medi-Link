import React from "react";
import { Link } from "react-router-dom";
//import { Send, Linkedin, Facebook, Instagram } from 'lucide-react';
import "./footer.css";

const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Top Section */}
        <div className="footer-top">
          {/* Column 1: Brand */}
          <div className="footer-brand">
            <h2 className="footer-logo">MEDILINK</h2>
            <p className="footer-description">
              Leading the Way in Medical Excellence, Trusted Care.
            </p>
          </div>

          <div className="footer-links">
            <h3>Important Links</h3>
            <ul>
              <li>
                <Link to="/book-appointment">Appointment</Link>
              </li>
              <li>
                <Link to="/doctors">Doctors</Link>
              </li>
              <li>
                <Link to="/services">Services</Link>
              </li>
              <li>
                <Link to="/about">About Us</Link>
              </li>
            </ul>
          </div>

          <div className="footer-contact">
            <h3>Contact Us</h3>
            <ul>
              <li>Call: (237) 681-812-255</li>
              <li>Email: fildineesoe@gmail.com</li>
              <li>Address: 0123 Some place</li>
              <li>Some country</li>
            </ul>
          </div>

          <div className="footer-newsletter">
            <h3>Newsletter</h3>
            <form
              className="newsletter-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Enter your email address"
                required
              />
              <button type="submit" aria-label="Subscribe"></button>
            </form>
          </div>
        </div>

        <hr className="footer-divider" />

        <div className="footer-bottom">
          <p className="copyright">© 2025 MediLink</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
