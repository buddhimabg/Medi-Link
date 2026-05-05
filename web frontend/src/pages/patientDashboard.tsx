import React, { useState, useEffect } from "react";
import {
  Calendar,
  Video,
  FileText,
  CreditCard,
  Bell,
  Search,
  User,
  Loader,
} from "lucide-react";
import "./patientDashboard.css";
import Sidebar from "../component/sidebar";

// Define a real appointment
interface Appointment {
  _id: string;
  doctorName: string;
  specialty: string;
  credentials: string;
  type: string;
  imageUrl: string;
}

const PatientDashboard: React.FC = () => {
  // Set up state for our real data, loading status, and errors
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  //Set up state for the user's dynamic name
  const [userName, setUserName] = useState("Guest");

  //Fetch the user's name from local storage when the dashboard loads
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData && userData.name) {
          setUserName(userData.name.split(" ")[0]);
        }
      } catch (err) {
        console.error("Error reading user data", err);
      }
    }
  }, []);

  // Fetch the data from the backend when the page loads
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/appointments");

        if (!response.ok) {
          throw new Error("Failed to fetch appointments");
        }

        const data = await response.json();
        setAppointments(data);
      } catch (err) {
        setError("Could not load appointments. Please try again later.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main-content">
        <header className="dashboard-top-nav">
          <div className="nav-left">
            <h2 className="mobile-logo">MediLink</h2>
          </div>
          <div className="nav-right">
            <button className="icon-btn">
              <Search size={20} />
            </button>
            <button className="icon-btn">
              <Bell size={20} />
            </button>
            <button className="icon-btn profile-btn">
              <User size={20} />
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          {/* Greeting Section */}
          <div className="greeting-section">
            <h1>Good evening, {userName}!</h1>
            <p className="text-muted">
              Here is an overview of your health portal today.
            </p>
          </div>

          {/* Quick Actions Grid */}
          <section className="quick-actions-grid">
            <button className="action-card">
              <div className="icon-wrapper blue-bg">
                <Calendar size={24} className="blue-icon" />
              </div>
              <h3>Book Appointment</h3>
              <p>Schedule a consultation</p>
            </button>
            <button className="action-card">
              <div className="icon-wrapper green-bg">
                <Video size={24} className="green-icon" />
              </div>
              <h3>Consult Online</h3>
              <p>Start Virtual Consultation</p>
            </button>
            <button className="action-card">
              <div className="icon-wrapper yellow-bg">
                <FileText size={24} className="yellow-icon" />
              </div>
              <h3>Prescription History</h3>
              <p>Access Medication History</p>
            </button>
            <button className="action-card">
              <div className="icon-wrapper pink-bg">
                <CreditCard size={24} className="pink-icon" />
              </div>
              <h3>Payment History</h3>
              <p>Managing Bills</p>
            </button>
          </section>

          {/* Upcoming Appointments Section */}
          <section className="appointments-section">
            <div className="section-header">
              <h2>Upcoming Appointments</h2>
              <p className="text-muted">Your Scheduled Consultations</p>
            </div>

            <div className="appointments-list">
              {isLoading ? (
                <div className="empty-state" style={{ padding: "40px" }}>
                  <Loader
                    size={32}
                    className="empty-icon"
                    style={{ animation: "spin 2s linear infinite" }}
                  />
                  <p>Loading your appointments...</p>
                </div>
              ) : error ? (
                <div className="empty-state">
                  <p style={{ color: "#e53e3e" }}>{error}</p>
                </div>
              ) : appointments.length > 0 ? (
                appointments.map((appt) => (
                  <div key={appt._id} className="appointment-card">
                    <div className="appt-info-wrapper">
                      <img
                        src={
                          appt.imageUrl ||
                          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=250&auto=format&fit=crop"
                        }
                        alt={appt.doctorName}
                        className="doctor-avatar"
                      />
                      <div className="doctor-details">
                        <h4>{appt.doctorName}</h4>
                        <p className="specialty">{appt.specialty}</p>
                        <p className="credentials">{appt.credentials}</p>
                        <span className="badge-online">
                          <Video size={14} /> {appt.type || "Online"}
                        </span>
                      </div>
                    </div>

                    <div className="appt-actions">
                      <button className="btn-cancel">Cancel</button>
                      <button className="btn-reschedule">Reschedule</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Calendar size={48} className="empty-icon" />
                  <h3>No upcoming appointments</h3>
                  <p>
                    You don't have any consultations scheduled at the moment.
                  </p>
                  <button className="btn-book-now">Book an Appointment</button>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default PatientDashboard;
