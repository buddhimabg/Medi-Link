import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  FileText,
  ChevronRight,
  Loader,
  X,
  CalendarDays,
  Bell,
  User
} from "lucide-react";
import Sidebar from "../component/sidebar";
import "./appointmentHistory.css";

interface Appointment {
  _id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  credentials: string;
  type: string;
  imageUrl: string;
  slot: string;
  paymentStatus?: string;
}

const AppointmentHistory: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "completed" | "upcoming" | "cancelled">("all");
  const [selectedNoteAppt, setSelectedNoteAppt] = useState<Appointment | null>(null);

  // Top nav dropdown states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [fullUserData, setFullUserData] = useState<any>(null);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);

  const parseSlotStringToDate = (slotStr: string) => {
    if (!slotStr) return new Date();
    const parts = slotStr.split(" ");
    if (parts.length < 3) return new Date(slotStr);

    const datePart = parts[0]; // "YYYY-MM-DD"
    const timePart = parts[1]; // "hh:mm"
    const ampm = parts[2];     // "AM" or "PM"

    const [hoursStr, minutesStr] = timePart.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    const pad = (num: number) => String(num).padStart(2, "0");
    const isoStr = `${datePart}T${pad(hours)}:${pad(minutes)}:00`;
    return new Date(isoStr);
  };

  const formatSlotToUIDateAndTime = (slotStr: string) => {
    if (!slotStr) return { date: "N/A", time: "N/A" };
    const parts = slotStr.split(" ");
    if (parts.length < 3) return { date: slotStr, time: "N/A" };

    try {
      const dateObj = new Date(parts[0] + "T00:00:00");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dayNum = dateObj.getDate();
      const monthStr = months[dateObj.getMonth()];
      const year = dateObj.getFullYear();

      const dayStr = String(dayNum).padStart(2, "0");
      const formattedDate = `${dayStr} ${monthStr} ${year}`;
      const formattedTime = `${parts[1]} ${parts[2]}`;
      return { date: formattedDate, time: formattedTime };
    } catch (e) {
      return { date: parts[0], time: `${parts[1]} ${parts[2]}` };
    }
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      const stored = localStorage.getItem("user");
      if (!stored) {
        setIsLoading(false);
        return;
      }
      try {
        const userData = JSON.parse(stored);
        if (!userData?._id) {
          setIsLoading(false);
          return;
        }
        const response = await fetch(`http://localhost:5000/api/appointments?userId=${userData._id}`);
        if (!response.ok) throw new Error("Failed to load appointments");
        const data = await response.json();
        setAppointments(data);
      } catch (err: any) {
        setError(err.message || "Failed to load appointments");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  // Dropdown click outside close handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
      if (
        notificationsMenuRef.current &&
        !notificationsMenuRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load user data & notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const userData = JSON.parse(stored);
          setFullUserData(userData);
          if (userData?._id) {
            const res = await fetch(`http://localhost:5000/api/notifications?userId=${userData._id}`);
            if (res.ok) {
              const data = await res.json();
              setNotifications(data);
            }
          }
        } catch (e) {
          console.error("Notifications load failed:", e);
        }
      }
    };
    fetchNotifications();
  }, []);

  const getAppointmentStatus = (appt: Appointment) => {
    if (appt.paymentStatus === 'Canceled') {
      return 'Cancelled';
    }
    const slotDate = parseSlotStringToDate(appt.slot);
    if (slotDate.getTime() < Date.now()) {
      return 'Completed';
    }
    return 'Upcoming';
  };

  const getAvatarColors = (index: number, status: string) => {
    if (status === 'Cancelled') {
      return { bg: "#fee2e2", color: "#b91c1c" }; // red
    }
    const palettes = [
      { bg: "#f3e8ff", color: "#6b21a8" }, // Purple
      { bg: "#e0f2fe", color: "#0369a1" }, // Blue
      { bg: "#ffedd5", color: "#c2410c" }, // Orange
      { bg: "#fef9c3", color: "#a16207" }, // Yellow
    ];
    return palettes[index % palettes.length];
  };

  const filteredAppointments = appointments.filter(appt => {
    const status = getAppointmentStatus(appt);
    if (activeTab === "all") return true;
    if (activeTab === "completed") return status === "Completed";
    if (activeTab === "upcoming") return status === "Upcoming";
    if (activeTab === "cancelled") return status === "Cancelled";
    return true;
  });

  const getMockDoctorNotes = (appt: Appointment) => {
    const specialty = appt.specialty.toLowerCase();
    if (specialty.includes("psych") || specialty.includes("mental") || specialty.includes("clinical")) {
      return {
        notes: "Patient reported steady emotional recovery. Discussed cognitive reframing techniques, mindfulness exercises, and sleep logs to keep track of anxiety triggers.",
        rx: "1. Practicing daily deep breathing (3x/day)\n2. Continued relaxation protocols before sleep\n3. Follow up in 2-3 weeks."
      };
    }
    return {
      notes: "Routine health consultation. All checks represent sound physiological recovery. Discussed cardiovascular checks and recommended daily mobility guidelines.",
      rx: "1. Moderate exercise (30 mins walk daily)\n2. Maintain current nutritional guidelines\n3. Check-up in 3 months."
    };
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main-content">

        {/* Top bar navigation section */}
        <header className="dashboard-top-nav">
          <div className="nav-left">
            <h2 className="mobile-logo">MediLink</h2>
          </div>
          <div className="nav-right">

            {/* Notifications Menu Trigger */}
            <div className="notifications-dropdown-container" ref={notificationsMenuRef}>
              <button
                className="icon-btn"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
              >
                <Bell size={20} />
              </button>

              {isNotificationsOpen && (
                <div className="notifications-dropdown-card">
                  <div className="notifications-header">
                    <h4>Notifications</h4>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="notifications-list">
                      {notifications.map((n) => (
                        <div key={n._id} className="notification-item">
                          <div className={`notification-icon-wrapper ${n.type || "system"}`}>
                            <Bell size={16} />
                          </div>
                          <div className="notification-details">
                            <h5 className="notification-title">{n.title}</h5>
                            <p className="notification-message">{n.message}</p>
                            <span className="notification-time">
                              {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="notifications-empty-state">
                      <Bell size={32} />
                      <p>No notifications yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Dropdown Trigger */}
            <div className="profile-menu-container" ref={profileMenuRef}>
              <button
                className="icon-btn profile-btn"
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationsOpen(false);
                }}
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
                      <strong>{fullUserData?.phone || fullUserData?.mobile || "Not set"}</strong>
                    </div>
                    <div className="glance-item">
                      <span>Emergency:</span>
                      <strong className={!fullUserData?.emergencyContact ? "text-warn" : ""}>
                        {fullUserData?.emergencyContact || "⚠️ Required"}
                      </strong>
                    </div>
                    <div className="glance-item">
                      <span>Gender:</span>
                      <strong>{fullUserData?.gender || "Not set"}</strong>
                    </div>
                  </div>

                  <hr className="dropdown-divider" />
                  <div className="dropdown-action-list">
                    <button
                      onClick={() => {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.replace("/");
                      }}
                      className="dropdown-menu-item logout-btn"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <div className="history-page-container">

          {/* Header Block */}
          <header className="history-header">
            <div className="header-text">
              <h1>Appointment History</h1>
              <p>View and manage your past appointments.</p>
            </div>
            <button className="history-calendar-trigger" title="Select Dates">
              <CalendarDays size={20} />
            </button>
          </header>

          {/* Filters Navigation Tabs */}
          <nav className="history-tabs-navigation">
            <button
              className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Appointments
            </button>
            <button
              className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
              onClick={() => setActiveTab("completed")}
            >
              Completed
            </button>
            <button
              className={`tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={`tab-btn ${activeTab === "cancelled" ? "active" : ""}`}
              onClick={() => setActiveTab("cancelled")}
            >
              Cancelled
            </button>
          </nav>

          {/* Content Area */}
          <div className="history-content-cards">
            {isLoading ? (
              <div className="history-loading-spinner">
                <Loader size={36} className="spin-icon" />
                <p>Loading appointments list...</p>
              </div>
            ) : error ? (
              <div className="history-error-state">
                <p>{error}</p>
              </div>
            ) : filteredAppointments.length > 0 ? (
              <div className="history-cards-grid">
                {filteredAppointments.map((appt, index) => {
                  const status = getAppointmentStatus(appt);
                  const { date, time } = formatSlotToUIDateAndTime(appt.slot);
                  const colors = getAvatarColors(index, status);

                  return (
                    <div key={appt._id} className="history-appointment-card">
                      <div className="card-left-section">

                        {/* Colored Status/Avatar wrapper */}
                        <div
                          className="colored-icon-wrapper"
                          style={{ backgroundColor: colors.bg, color: colors.color }}
                        >
                          <Calendar size={24} />
                        </div>

                        {/* Doctor details */}
                        <div className="doctor-info-block">
                          <h3>{appt.doctorName}</h3>
                          <span className="info-specialty">{appt.specialty}</span>

                          <div className="info-date-row">
                            <span className="info-item">
                              <Calendar size={14} className="small-icon" /> {date}
                            </span>
                            <span className="separator-bar">|</span>
                            <span className="info-item">
                              <Clock size={14} className="small-icon" /> {time}
                            </span>
                          </div>

                          <span className="info-consultation-type">
                            {appt.type === "Physical" ? (
                              <>
                                <MapPin size={14} className="small-icon" /> In-clinic Visit
                              </>
                            ) : (
                              <>
                                <Video size={14} className="small-icon" /> Video Consultation
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="card-right-section">

                        {/* Top status flag */}
                        <span className={`status-badge-flag ${status.toLowerCase()}`}>
                          {status}
                        </span>

                        {/* Actions */}
                        <div className="actions-notes-row">
                          {status === "Completed" && (
                            <button
                              className="btn-view-doctor-notes"
                              onClick={() => setSelectedNoteAppt(appt)}
                            >
                              <FileText size={14} /> View Doctor Notes
                            </button>
                          )}
                          <ChevronRight className="chevron-arrow-link" size={18} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Bottom Footer Section */}
                <footer className="history-footer-completion">
                  <div className="history-footer-icon-wrapper">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 12H16" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 8V16" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" />
                    </svg>
                  </div>
                  <h3>That's all your appointments!</h3>
                  <p>You have no more appointments to show.</p>
                </footer>
              </div>
            ) : (
              <div className="history-empty-state">
                <CalendarDays size={48} className="empty-icon-graphic" />
                <h3>No appointments found</h3>
                <p>You don't have any appointments matching this category.</p>
              </div>
            )}
          </div>

          {/* Doctor Notes Preview Modal */}
          {selectedNoteAppt && (
            <div className="notes-modal-backdrop" onClick={() => setSelectedNoteAppt(null)}>
              <div className="notes-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Doctor Consultation Notes</h2>
                  <button className="btn-close-modal" onClick={() => setSelectedNoteAppt(null)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="notes-doctor-header">
                    <h3>{selectedNoteAppt.doctorName}</h3>
                    <p>{selectedNoteAppt.specialty} • {selectedNoteAppt.credentials}</p>
                  </div>

                  <div className="notes-details-row">
                    <p><strong>Appointment Date:</strong> {formatSlotToUIDateAndTime(selectedNoteAppt.slot).date}</p>
                    <p><strong>Consultation Slot:</strong> {formatSlotToUIDateAndTime(selectedNoteAppt.slot).time}</p>
                  </div>

                  <hr className="modal-divider" />

                  <div className="notes-clinical-summary">
                    <h4>Clinical Summary:</h4>
                    <p>{getMockDoctorNotes(selectedNoteAppt).notes}</p>
                  </div>

                  <div className="notes-prescription">
                    <h4>Treatment Plan & Guidelines:</h4>
                    <pre>{getMockDoctorNotes(selectedNoteAppt).rx}</pre>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-modal-done" onClick={() => setSelectedNoteAppt(null)}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default AppointmentHistory;
