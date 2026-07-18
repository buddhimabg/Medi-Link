import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Video,
  FileText,
  CreditCard,
  Bell,
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
  doctorId: string;
  doctorName: string;
  specialty: string;
  credentials: string;
  type: string;
  imageUrl: string;
  slot: string;
  paymentStatus?: string;
}

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

const PatientDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [userName, setUserName] = useState("Guest");
  const [fullUserData, setFullUserData] = useState<CachedUser | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    emergencyContact: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Rescheduling wizard modal states
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedApptToReschedule, setSelectedApptToReschedule] = useState<Appointment | null>(null);
  const [doctorSchedules, setDoctorSchedules] = useState<any[]>([]);
  const [selectedNewSlot, setSelectedNewSlot] = useState("");
  const [isReschedulingSubmit, setIsReschedulingSubmit] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleStep, setRescheduleStep] = useState<"confirm" | "select">("confirm");

  // Payment history states
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      window.location.replace("/login");
      return;
    }
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
      if (stored) {
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

  const handleCancelAppointment = async (apptId: string) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      const response = await fetch(`http://localhost:5000/api/appointments/${apptId}/cancel`, {
        method: "POST"
      });
      const json = await response.json();
      if (response.ok && json.success) {
        setAppointments(prev => prev.filter(a => a._id !== apptId));
        alert("Appointment canceled successfully!");
      } else {
        throw new Error(json.message || "Failed to cancel appointment.");
      }
    } catch (err: any) {
      console.error("Cancel failed:", err);
      alert(err.message || "Failed to cancel appointment.");
    }
  };

  const handleStartReschedule = (appt: Appointment) => {
    setSelectedApptToReschedule(appt);
    setRescheduleStep("confirm");
    setSelectedNewSlot("");
    setRescheduleError("");
    setDoctorSchedules([]);
    setIsRescheduleModalOpen(true);
  };

  const handleConfirmRescheduleStep = async () => {
    if (!selectedApptToReschedule) return;
    setRescheduleError("");
    setIsReschedulingSubmit(true);
    try {
      const response = await fetch(`http://localhost:5000/api/doctors/${selectedApptToReschedule.doctorId}`);
      if (!response.ok) throw new Error("Failed to fetch doctor details.");
      const json = await response.json();
      if (json.success && json.data) {
        setDoctorSchedules(json.data.schedules || []);
        setRescheduleStep("select");
      } else {
        throw new Error(json.message || "Failed to load doctor schedules.");
      }
    } catch (err: any) {
      console.error(err);
      setRescheduleError(err.message || "Failed to load schedules.");
    } finally {
      setIsReschedulingSubmit(false);
    }
  };

  const handleFinishReschedule = async () => {
    if (!selectedApptToReschedule || !selectedNewSlot) return;
    setRescheduleError("");
    setIsReschedulingSubmit(true);
    try {
      const response = await fetch(`http://localhost:5000/api/appointments/${selectedApptToReschedule._id}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ newSlot: selectedNewSlot })
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || "Failed to reschedule appointment.");
      }

      setAppointments(prev => prev.map(appt => {
        if (appt._id === selectedApptToReschedule._id) {
          return { ...appt, slot: selectedNewSlot };
        }
        return appt;
      }));

      setIsRescheduleModalOpen(false);
      setSelectedApptToReschedule(null);
      setSelectedNewSlot("");
      setRescheduleStep("confirm");
      alert("Appointment rescheduled successfully!");
    } catch (err: any) {
      console.error(err);
      setRescheduleError(err.message || "Failed to reschedule appointment.");
    } finally {
      setIsReschedulingSubmit(false);
    }
  };

  const handleTogglePaymentHistory = async () => {
    if (isPaymentHistoryOpen) {
      setIsPaymentHistoryOpen(false);
      return;
    }

    setIsPaymentHistoryOpen(true);
    setIsHistoryLoading(true);
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u?._id) {
          const res = await fetch(`http://localhost:5000/api/payments/history?userId=${u._id}`);
          if (res.ok) {
            const data = await res.json();
            setPaymentHistory(data);
          }
        }
      }
    } catch (err) {
      console.error("Error loading payment history:", err);
    } finally {
      setIsHistoryLoading(false);
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
        if (!response.ok) throw new Error("Failed");
        const data = await response.json();
        const activeOnly = data.filter((a: any) => a.paymentStatus !== 'Canceled');
        setAppointments(activeOnly);
      } catch {
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
                      <strong
                        className={
                          !fullUserData?.emergencyContact ? "text-warn" : ""
                        }
                      >
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
                        {fullUserData?.dob
                          ? new Date(fullUserData.dob).toLocaleDateString()
                          : "Not set"}
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
            <button className="action-card" onClick={handleTogglePaymentHistory}>
              <div className="icon-wrapper pink-bg">
                <CreditCard size={24} className="pink-icon" />
              </div>
              <h3>Payment History</h3>
              <p>Managing Bills</p>
            </button>
          </section>

          {isPaymentHistoryOpen && (
            <section className="payment-history-section" style={{ marginBottom: "32px", padding: "24px", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
              <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem", color: "#1a202c", fontWeight: "700", margin: 0 }}>Payment & Refund History</h2>
                  <p className="text-muted" style={{ fontSize: "0.85rem", color: "#718096", margin: "2px 0 0 0" }}>Track all your transactions and auto-refunded cancellations</p>
                </div>
                <button
                  onClick={() => setIsPaymentHistoryOpen(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 12px", fontSize: "0.85rem", fontWeight: "600", color: "#e53e3e", backgroundColor: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "6px", cursor: "pointer", gap: "6px" }}
                >
                  <X size={14} /> Close
                </button>
              </div>

              {isHistoryLoading ? (
                <div style={{ textAlign: "center", padding: "24px" }}>
                  <Loader className="spin-icon" size={24} style={{ color: "#3182ce" }} />
                  <p style={{ fontSize: "0.85rem", color: "#718096", marginTop: "8px" }}>Loading transactions...</p>
                </div>
              ) : paymentHistory.length > 0 ? (
                <div className="payment-history-table-wrapper" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #edf2f7", color: "#4a5568" }}>
                        <th style={{ padding: "12px 8px", fontWeight: "600" }}>Date & Time</th>
                        <th style={{ padding: "12px 8px", fontWeight: "600" }}>Doctor / Service</th>
                        <th style={{ padding: "12px 8px", fontWeight: "600" }}>Amount</th>
                        <th style={{ padding: "12px 8px", fontWeight: "600" }}>Method</th>
                        <th style={{ padding: "12px 8px", fontWeight: "600" }}>Transaction ID</th>
                        <th style={{ padding: "12px 8px", fontWeight: "600", textAlign: "center" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((historyItem) => {
                        const isRefund = historyItem.status === "Refunded";
                        const isPaid = historyItem.status === "Paid" || historyItem.status === "Success";
                        const isCanceled = historyItem.status === "Canceled";

                        let statusColor = "#a0aec0";
                        let statusBg = "#edf2f7";
                        let statusBorder = "#e2e8f0";

                        if (isPaid) {
                          statusColor = "#00a389";
                          statusBg = "#e6fffa";
                          statusBorder = "#b2f5ea";
                        } else if (isRefund) {
                          statusColor = "#3182ce";
                          statusBg = "#ebf8ff";
                          statusBorder = "#bee3f8";
                        } else if (isCanceled) {
                          statusColor = "#e53e3e";
                          statusBg = "#fff5f5";
                          statusBorder = "#fed7d7";
                        }

                        return (
                          <tr key={historyItem._id} style={{ borderBottom: "1px solid #edf2f7", color: "#2d3748" }}>
                            <td style={{ padding: "12px 8px" }}>
                              {new Date(historyItem.date).toLocaleDateString()} at {new Date(historyItem.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              <div><strong>{historyItem.doctorName}</strong></div>
                              <div style={{ fontSize: "0.75rem", color: "#718096" }}>{historyItem.specialty} • {historyItem.slot}</div>
                            </td>
                            <td style={{ padding: "12px 8px", fontWeight: "700", color: isRefund ? "#3182ce" : "#2d3748" }}>
                              {isRefund ? "-" : ""}Rs. {historyItem.amount.toLocaleString()}.00
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span>{historyItem.method}</span>
                                <span style={{ fontSize: "0.72rem", color: "#a0aec0" }}>{historyItem.cardMasked}</span>
                              </div>
                            </td>
                            <td style={{ padding: "12px 8px", fontFamily: "monospace", fontSize: "0.8rem", color: "#718096" }}>
                              {historyItem.paymentId}
                            </td>
                            <td style={{ padding: "12px 8px", textAlign: "center" }}>
                              <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: "700", color: statusColor, backgroundColor: statusBg, border: `1px solid ${statusBorder}` }}>
                                {historyItem.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "#a0aec0" }}>
                  <CreditCard size={36} style={{ marginBottom: "8px", color: "#cbd5e0" }} />
                  <p style={{ margin: 0, fontSize: "0.88rem" }}>No billing history or transaction logs found.</p>
                </div>
              )}
            </section>
          )}

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
                appointments.map((appt) => {
                  const apptDate = parseSlotStringToDate(appt.slot);
                  const canModify = (apptDate.getTime() - Date.now()) / (1000 * 60 * 60) >= 24;

                  return (
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
                          <div className="appt-slot-info" style={{ marginTop: "6px", fontSize: "0.85rem", color: "#1e3a8a", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Calendar size={14} /> {appt.slot}
                          </div>
                          <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
                            <span className="badge-online">
                              <Video size={14} /> {appt.type || "Online"}
                            </span>
                            {appt.paymentStatus === 'Pending' && (
                              <span className="badge-status pending" style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: "12px", fontWeight: "700", backgroundColor: "#fffaf0", color: "#dd6b20", border: "1px solid #fbd38d", display: "inline-flex", alignItems: "center" }}>
                                Payment Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="appt-actions">
                        <button
                          className="btn-cancel"
                          onClick={() => handleCancelAppointment(appt._id)}
                          disabled={!canModify}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn-reschedule"
                          onClick={() => handleStartReschedule(appt)}
                          disabled={!canModify}
                        >
                          Reschedule
                        </button>
                        {!canModify && (
                          <span className="policy-lock-warning" style={{ display: "block", fontSize: "0.7rem", color: "#e53e3e", marginTop: "6px", fontWeight: 600, textAlign: "right", width: "100%" }}>
                            * Locked (under 24h limit)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
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

        {isRescheduleModalOpen && selectedApptToReschedule && (
          <div className="modal-backdrop">
            <div className="reschedule-modal-box">
              <div className="modal-header">
                <div>
                  <h3>Reschedule Appointment</h3>
                  <p>Consultation with {selectedApptToReschedule.doctorName}</p>
                </div>
                <button
                  className="close-modal-btn"
                  onClick={() => setIsRescheduleModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {rescheduleStep === "confirm" ? (
                <div className="reschedule-confirm-view">
                  <p className="reschedule-warning-text">
                    Are you sure you want to reschedule your appointment with <strong>{selectedApptToReschedule.doctorName}</strong>?
                  </p>
                  <div className="current-slot-box">
                    <span className="label">Current Reserved Slot:</span>
                    <strong className="value">📅 {selectedApptToReschedule.slot}</strong>
                  </div>
                  {rescheduleError && <div className="reschedule-error-msg">⚠️ {rescheduleError}</div>}
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      onClick={() => setIsRescheduleModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-modal-save"
                      onClick={handleConfirmRescheduleStep}
                      disabled={isReschedulingSubmit}
                    >
                      {isReschedulingSubmit ? "Checking Schedules..." : "Yes, Confirm"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="reschedule-select-view">
                  <p className="select-instruction">
                    Select a new available date and time slot from the list below:
                  </p>

                  <div className="doctor-slots-container">
                    {doctorSchedules.length > 0 ? (
                      doctorSchedules.map((schedule) => {
                        const availableTimes = schedule.slots.filter((s: any) => !s.isBooked);
                        if (availableTimes.length === 0) return null;

                        return (
                          <div key={schedule._id} className="schedule-date-group">
                            <h5 className="schedule-date-header">
                              {new Date(schedule.date).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </h5>
                            <div className="schedule-slots-grid">
                              {availableTimes.map((slot: any) => {
                                const slotString = `${schedule.date} ${slot.time}`;
                                const isSelected = selectedNewSlot === slotString;
                                return (
                                  <button
                                    key={slot._id || slot.time}
                                    type="button"
                                    className={`slot-picker-btn ${isSelected ? "selected" : ""}`}
                                    onClick={() => setSelectedNewSlot(slotString)}
                                  >
                                    {slot.time}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="no-slots-notice">
                        No upcoming schedules found for this doctor.
                      </div>
                    )}
                  </div>

                  {rescheduleError && <div className="reschedule-error-msg">⚠️ {rescheduleError}</div>}

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      onClick={() => setRescheduleStep("confirm")}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="btn-modal-save"
                      onClick={handleFinishReschedule}
                      disabled={!selectedNewSlot || isReschedulingSubmit}
                    >
                      {isReschedulingSubmit ? "Saving..." : "Confirm Reschedule"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
