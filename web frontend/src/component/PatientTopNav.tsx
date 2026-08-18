import React, { useEffect, useRef, useState } from "react";
import { Bell, User } from "lucide-react";
import "../pages/patientDashboard.css";

interface CachedUser {
  name?: string;
  email?: string;
  _id?: string;
  phone?: string;
  emergencyContact?: string;
  gender?: string;
  city?: string;
  dob?: string | Date;
  mobile?: string;
}

// Shared top-right notification bell + profile menu, used across every
// patient-facing page (dashboard, booking, history, assessments, mood
// tracking, reports, reminders, etc.) so they all behave identically.
const PatientTopNav: React.FC = () => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [fullUserData, setFullUserData] = useState<CachedUser | null>(null);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setFullUserData(JSON.parse(stored));
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

  useEffect(() => {
    const fetchNotifications = async () => {
      const stored = localStorage.getItem("user");
      if (!stored) return;
      try {
        const userData = JSON.parse(stored);
        if (userData?._id) {
          const res = await fetch(`http://localhost:5000/api/notifications?userId=${userData._id}`);
          if (res.ok) {
            const data = await res.json();
            setNotifications(data);
          }
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };
    fetchNotifications();
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/");
  };

  return (
    <header className="dashboard-top-nav">
      <div className="nav-left">
        <h2 className="mobile-logo">MediLink</h2>
      </div>
      <div className="nav-right">
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
                  <h4>{fullUserData?.name || "Patient"}</h4>
                  <p>{fullUserData?.email || "patient@medilink.lk"}</p>
                  <span className="patient-id-tag">
                    ID: #{fullUserData?._id?.slice(-4) || "0000"}
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
                <div className="glance-item">
                  <span>City:</span>
                  <strong>{fullUserData?.city || "Not set"}</strong>
                </div>
                <div className="glance-item">
                  <span>DOB:</span>
                  <strong>
                    {fullUserData?.dob ? new Date(fullUserData.dob).toLocaleDateString() : "Not set"}
                  </strong>
                </div>
              </div>

              <hr className="dropdown-divider" />

              <div className="dropdown-action-list">
                <button className="dropdown-menu-item logout-btn" onMouseDown={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default PatientTopNav;
