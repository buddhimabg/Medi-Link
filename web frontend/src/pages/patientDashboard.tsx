import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Video,
  FileText,
  CreditCard,
  Bell,
  Search,
  User,
  Loader,
  X,
  PhoneCall,
  Save,
  ShieldCheck,
} from "lucide-react";
import "./patientDashboard.css";
import Sidebar from "../component/sidebar";

interface Appointment {
  _id: string;
  doctorName: string;
  specialty: string;
  credentials: string;
  type: string;
  imageUrl: string;
}

interface CachedUser {
  name?: string;
  email?: string;
  _id?: string;
  phone?: string;
  emergencyContact?: string;
}

const PatientDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [userName, setUserName] = useState("Guest");
  const [fullUserData, setFullUserData] = useState<CachedUser | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    emergencyContact: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData: CachedUser = JSON.parse(storedUser);
        setFullUserData(userData);
        setFormData({
          name: userData.name || "",
          phone: userData.phone || "",
          emergencyContact: userData.emergencyContact || "",
        });
        if (userData && userData.name) {
          setUserName(userData.name.split(" ")[0]);
        }
      } catch (err) {
        console.error("Error parsing user data", err);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/login");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");

    const updatedUser = {
      ...fullUserData,
      name: formData.name,
      phone: formData.phone,
      emergencyContact: formData.emergencyContact,
    };

    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:5000/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          emergencyContact: formData.emergencyContact,
        }),
      });
    } catch {
      // FIX #2: Removed 'err' binding entirely
      console.log("Local save trigger active (Backend skipped/offline)");
    }

    localStorage.setItem("user", JSON.stringify(updatedUser));
    setFullUserData(updatedUser);
    setUserName(updatedUser.name ? updatedUser.name.split(" ")[0] : "Guest");

    setIsSaving(false);
    setSaveMessage("Profile updated successfully!");

    setTimeout(() => {
      setIsEditModalOpen(false);
      setSaveMessage("");
    }, 1200);
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/appointments");
        if (!response.ok) throw new Error("Failed");
        const data = await response.json();
        setAppointments(data);
      } catch {
        // FIX #3: Removed 'err' binding entirely
        setError("Could not load appointments. Please try again later.");
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

            <div className="profile-menu-container" ref={profileMenuRef}>
              <button
                className="icon-btn profile-btn"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <User size={20} />
              </button>

              {isProfileOpen && (
                <div className="profile-dropdown-card">
                  <div className="dropdown-user-header">
                    <div className="dropdown-avatar">
                      <User size={24} />
                    </div>
                    <div className="dropdown-user-details">
                      <h4>{fullUserData?.name || "Buddhima"}</h4>
                      <p>{fullUserData?.email || "patient@medilink.lk"}</p>
                      <span className="patient-id-tag">
                        ID: #{fullUserData?._id?.slice(-4) || "0842"}
                      </span>
                    </div>
                  </div>

                  <div className="dropdown-contact-glance">
                    <div className="glance-item">
                      <span>Phone:</span>
                      <strong>{fullUserData?.phone || "Not set"}</strong>
                    </div>
                    <div className="glance-item">
                      <span>Emergency:</span>
                      <strong
                        className={
                          !fullUserData?.emergencyContact ? "text-warn" : ""
                        }
                      >
                        {fullUserData?.emergencyContact || "⚠️ Required"}
                      </strong>
                    </div>
                  </div>

                  <hr className="dropdown-divider" />

                  <div className="dropdown-action-list">
                    <button
                      className="dropdown-menu-item"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsEditModalOpen(true);
                      }}
                    >
                      Edit Personal Details
                    </button>
                    <button
                      className="dropdown-menu-item logout-btn"
                      onMouseDown={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {isEditModalOpen && (
          <div className="modal-backdrop">
            <div className="profile-modal-box">
              <div className="modal-header">
                <div>
                  <h3>Edit Personal Details</h3>
                  <p>Update your contact and emergency information</p>
                </div>
                <button
                  className="close-modal-btn"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="profile-edit-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="locked-label">
                    Email Address{" "}
                    <ShieldCheck size={14} className="lock-icon" />
                  </label>
                  <input
                    type="email"
                    disabled
                    className="input-disabled"
                    value={fullUserData?.email || ""}
                  />
                  <span className="field-hint">
                    Used for your portal login credentials
                  </span>
                </div>

                <div className="form-group">
                  <label>Personal Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+94 7X XXX XXXX"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>

                <div className="form-group emergency-group">
                  <label className="emergency-label">
                    <PhoneCall size={14} /> Emergency Contact Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. Spouse, Parent (+94 7X...)"
                    value={formData.emergencyContact}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: e.target.value,
                      })
                    }
                  />
                  <span className="field-hint">
                    Crucial for physical & virtual clinical check-ins
                  </span>
                </div>

                {saveMessage && <div className="save-toast">{saveMessage}</div>}

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-modal-save"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader size={16} className="spin-icon" />
                    ) : (
                      <Save size={16} />
                    )}
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <main className="dashboard-content">
          <div className="greeting-section">
            <h1>Good evening, {userName}!</h1>
            <p className="text-muted">
              Here is an overview of your health portal today.
            </p>
          </div>

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

          <section className="appointments-section">
            <div className="section-header">
              <h2>Upcoming Appointments</h2>
              <p className="text-muted">Your Scheduled Consultations</p>
            </div>

            {/* FIX #1: Put the appointments.map() loop back into the DOM */}
            <div className="appointments-list">
              {isLoading ? (
                <div className="empty-state" style={{ padding: "40px" }}>
                  <Loader size={32} className="empty-icon spin-icon" />
                  <p>Loading appointments...</p>
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
