import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Calendar,
  Video,
  MapPin,
  Star,
  Filter,
  X,
  User,
  Bell,
  CheckCircle2,
  Loader,
  Award,
  Languages,
  FileText,
  Building2,
  ChevronDown,
} from "lucide-react";
import Sidebar from "../component/sidebar";
import "./bookAppointment.css";


interface Doctor {
  _id: string;
  name: string;
  gender?: string;
  specialty: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  qualifications?: string[];
  languages?: string[];
  bio?: string;
  photo?: string;
  imageUrl?: string;
  rating: number;
  availableHospitals?: string[];
  hospital?: string;
  availableModes?: string[];
  virtualPrice: number;
  physicalPrice: number;
  availableSlots: string[];
}

const BookAppointment: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [selectedHospital, setSelectedHospital] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState("");

  // State to track if the user has clicked search yet
  const [hasSearched, setHasSearched] = useState(false);

  // Modals
  const [activeDoctor, setActiveDoctor] = useState<Doctor | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Doctor | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Wizard States
  const [bookingMode, setBookingMode] = useState<"Virtual" | "Physical">(
    "Virtual"
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);

  // Payment Form States
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const [userName, setUserName] = useState<string>("Patient");
  const [fullUserData, setFullUserData] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);

  const handleViewProfile = async (docId: string) => {
    setIsProfileLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/doctors/${docId}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setViewingProfile(json.data);
        } else {
          throw new Error("Failed to parse database doctor");
        }
      } else {
        throw new Error("API call unsuccessful");
      }
    } catch (err) {
      console.warn("Falling back to local doctor list details:", err);
      const localDoc = doctors.find(d => d._id === docId);
      if (localDoc) {
        setViewingProfile(localDoc);
      }
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoctor || !selectedSlot) return;

    setPaymentError("");
    setIsPaying(true);

    const bookingPrice = bookingMode === "Virtual" ? activeDoctor.virtualPrice : activeDoctor.physicalPrice;

    try {
      const response = await fetch("http://localhost:5000/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: fullUserData?._id || "guest",
          doctorId: activeDoctor._id,
          doctorName: activeDoctor.name,
          specialty: activeDoctor.specialty,
          credentials: activeDoctor.qualifications ? activeDoctor.qualifications.join(", ") : "MBBS, MD",
          type: bookingMode,
          imageUrl: activeDoctor.photo || activeDoctor.imageUrl,
          slot: selectedSlot,
          amount: bookingPrice,
          cardHolderName,
          cardNumber
        })
      });

      const json = await response.json();
      if (response.ok && json.success) {
        // Success! Go to step 3
        setBookingStep(3);
        
        // Remove slot locally so the UI updates without requiring refresh
        setDoctors(prevDoctors => 
          prevDoctors.map(doc => 
            doc._id === activeDoctor._id 
              ? { ...doc, availableSlots: doc.availableSlots.filter(s => s !== selectedSlot) }
              : doc
          )
        );
        
        // Reset payment details
        setCardHolderName("");
        setCardNumber("");
        setCardExpiry("");
        setCardCvc("");
      } else {
        setPaymentError(json.message || "Simulated payment processing failed. Please check card details.");
      }
    } catch (err) {
      console.error("Booking error:", err);
      setPaymentError("Could not reach backend server to complete transaction.");
    } finally {
      setIsPaying(false);
    }
  };

  useEffect(() => {
    const hydrateUser = () => {
      const stored = localStorage.getItem("user");
      if (!stored) {
        window.location.replace("/login");
        return;
      }
      try {
        const u = JSON.parse(stored);
        setFullUserData(u);
        if (u?.name) setUserName(u.name.split(" ")[0]);
      } catch {
        setUserName("Patient");
      }
    };
    hydrateUser();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u?._id) {
            const res = await fetch(`http://localhost:5000/api/notifications?userId=${u._id}`);
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

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/");
  };

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/doctors");
        if (!response.ok) throw new Error("HTTP Error");
        const json = await response.json();
        const payload = Array.isArray(json) ? json : json.data;
        setDoctors(payload || []);
      } catch {
        setDbError("Could not connect to live database server.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  // Upgraded Live Filtering Math
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.availableHospitals?.some((h) =>
        h.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      false ||
      doc.hospital?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;

    const matchesSpec =
      selectedSpecialty === "All" || doc.specialty === selectedSpecialty;

    // Array-safe hospital check
    const matchesHosp =
      selectedHospital === "All" ||
      (doc.availableHospitals
        ? doc.availableHospitals.includes(selectedHospital)
        : doc.hospital === selectedHospital);

    let matchesMode = true;
    if (selectedMode === "Virtual") matchesMode = doc.virtualPrice > 0;
    if (selectedMode === "Physical") matchesMode = doc.physicalPrice > 0;

    return matchesSearch && matchesSpec && matchesHosp && matchesMode;
  });

  const handleSearch = () => {
    setHasSearched(true);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedSpecialty("All");
    setSelectedHospital("All");
    setSelectedMode("All");
    setHasSearched(false); // Hide results again when reset
  };

  const handleOpenBooking = (doc: Doctor) => {
    setActiveDoctor(doc);
    setSelectedSlot(doc.availableSlots?.[0] || "");
    setBookingStep(1);
    setViewingProfile(null); // Close profile modal if open
  };

  // Shared inline style for modern dropdowns
  const modernSelectStyle: React.CSSProperties = {
    appearance: "none",
    width: "100%",
    padding: "10px 36px 10px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    fontSize: "14px",
    color: "#334155",
    cursor: "pointer",
    outline: "none",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  };

  const selectWrapperStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
  };

  const chevronStyle: React.CSSProperties = {
    position: "absolute",
    right: "12px",
    pointerEvents: "none",
    color: "#64748b",
  };

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

        <main className="booking-page-container">
          <div className="page-title-banner">
            <h1>Book a Consultation</h1>
            <p>
              Select a verified practitioner for your online or in-person
              session
            </p>
          </div>

          <section className="search-filter-box">
            <div className="main-search-input">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search by doctor name, specialty, or hospital..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="clear-search-btn"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div
              className="filter-dropdowns-row"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                alignItems: "center",
                marginTop: "16px",
              }}
            >
              {/* 1. Modern Specialty Dropdown (Label Removed) */}
              <div className="dropdown-group" style={{ flex: "1 1 200px" }}>
                <div style={selectWrapperStyle}>
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    style={modernSelectStyle}
                  >
                    <option value="All">Any Specialty</option>
                    <option value="Consultant Psychiatrist">Psychiatry</option>
                    <option value="Cardiologist">Cardiology</option>
                    <option value="Dermatologist">Dermatology</option>
                    <option value="Neurologist">Neurology</option>
                  </select>
                  <ChevronDown size={16} style={chevronStyle} />
                </div>
              </div>

              {/* 2. Modern Hospital Dropdown (Label Removed) */}
              <div className="dropdown-group" style={{ flex: "1 1 200px" }}>
                <div style={selectWrapperStyle}>
                  <select
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                    style={modernSelectStyle}
                  >
                    <option value="All">Any Hospital</option>
                    <option value="Asiri Central Hospital">
                      Asiri Central Hospital
                    </option>
                    <option value="Lanka Hospitals">Lanka Hospitals</option>
                    <option value="Nawaloka Hospital">Nawaloka Hospital</option>
                    <option value="Durdans Hospital">Durdans Hospital</option>
                  </select>
                  <ChevronDown size={16} style={chevronStyle} />
                </div>
              </div>

              {/* 3. Modern Mode Dropdown (Label Removed) */}
              <div className="dropdown-group" style={{ flex: "1 1 200px" }}>
                <div style={selectWrapperStyle}>
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                    style={modernSelectStyle}
                  >
                    <option value="All">Any Mode</option>
                    <option value="Virtual">Virtual Only</option>
                    <option value="Physical">In-Person Only</option>
                  </select>
                  <ChevronDown size={16} style={chevronStyle} />
                </div>
              </div>

              {/* Search & Reset Buttons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleSearch}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 20px",
                    backgroundColor: "#4f46e5",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                    height: "42px",
                  }}
                >
                  <Search size={16} /> Search
                </button>
                <button
                  onClick={resetFilters}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 20px",
                    backgroundColor: "#f8fafc",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 500,
                    height: "42px",
                  }}
                >
                  <Filter size={16} /> Reset
                </button>
              </div>
            </div>
          </section>

          <div className="results-subhead">
            <span>
              {hasSearched ? (
                <>
                  Showing <strong>{filteredDoctors.length}</strong> available
                  consultants
                </>
              ) : (
                <>Find your perfect consultant</>
              )}
            </span>
          </div>

          {isLoading && (
            <div className="loading-box">
              <Loader size={32} className="spin-icon" />
              <p>Fetching clinical records from database...</p>
            </div>
          )}

          {dbError && <div className="error-box">{dbError}</div>}

          <section className="doctors-grid">
            {/* Logic: Only show results if user has clicked search */}
            {!hasSearched ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "#64748b",
                  gridColumn: "1 / -1",
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <Search
                  size={48}
                  style={{ margin: "0 auto 16px", opacity: 0.3 }}
                />
                <h3
                  style={{
                    fontSize: "18px",
                    color: "#334155",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  Start Your Search
                </h3>
                <p>
                  Select your criteria and click Search to find the right
                  consultant for you.
                </p>
              </div>
            ) : !isLoading && filteredDoctors.length === 0 && !dbError ? (
              <div className="no-doctors-found">
                <h3>No consultants match your filters</h3>
                <p>Try resetting the dropdowns or changing your keywords.</p>
              </div>
            ) : (
              filteredDoctors.map((doc) => {
                const avatar =
                  doc.photo ||
                  doc.imageUrl ||
                  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=250";
                const primaryHospital =
                  doc.availableHospitals?.[0] ||
                  doc.hospital ||
                  "Multiple Hospitals";

                return (
                  <div key={doc._id} className="doc-grid-card">
                    <div>
                      <div className="card-top-row">
                        <img
                          src={avatar}
                          alt={doc.name}
                          className="doc-card-avatar"
                        />
                        <div className="doc-card-info">
                          <div className="name-rating-flex">
                            <h3>{doc.name}</h3>
                            <span className="rating-badge">
                              <Star size={12} fill="#d97706" /> {doc.rating}
                            </span>
                          </div>
                          <p className="doc-specialty">{doc.specialty}</p>
                          <span className="doc-gender-tag">
                            {doc.gender || "Specialist"}
                          </span>
                        </div>
                      </div>

                      <div className="hospitals-preview">
                        <Building2 size={14} className="hosp-icon" />
                        <span>
                          {primaryHospital}{" "}
                          {doc.availableHospitals &&
                          doc.availableHospitals.length > 1
                            ? `(+${doc.availableHospitals.length - 1} more)`
                            : ""}
                        </span>
                      </div>

                      <div className="mode-pills-container">
                        {doc.virtualPrice > 0 && (
                          <div className="mode-pill virtual">
                            <Video size={14} /> Virtual:{" "}
                            <span>Rs.{doc.virtualPrice}</span>
                          </div>
                        )}
                        {doc.physicalPrice > 0 && (
                          <div className="mode-pill physical">
                            <Calendar size={14} /> Visit:{" "}
                            <span>Rs.{doc.physicalPrice}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card-bottom-row dual-btns">
                      <button
                        onClick={() => handleViewProfile(doc._id)}
                        className="btn-view-profile"
                        disabled={isProfileLoading}
                      >
                        {isProfileLoading ? "Loading..." : "View Profile"}
                      </button>
                      <button
                        onClick={() => handleOpenBooking(doc)}
                        className="btn-open-book"
                      >
                        Book Slot
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </main>

        {/* ========================================================= */}
        {/* --- 1. DOCTOR PROFILE OVERLAY MODAL --- */}
        {/* ========================================================= */}
        {viewingProfile && (
          <div className="modal-backdrop">
            <div className="profile-detail-modal">
              <div className="modal-header">
                <div>
                  <span className="doc-gender-tag mb-1">
                    {viewingProfile.gender || "Consultant"}
                  </span>
                  <h3>{viewingProfile.name}</h3>
                  <p className="spec-title">{viewingProfile.specialty}</p>
                </div>
                <button
                  className="close-modal-btn"
                  onClick={() => setViewingProfile(null)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="profile-modal-body">
                {/* Top Glance Bar */}
                <div className="glance-metrics">
                  <div>
                    <span>Experience</span>
                    <h4>
                      {viewingProfile.yearsOfExperience
                        ? `${viewingProfile.yearsOfExperience} Years+`
                        : "10 Years+"}
                    </h4>
                  </div>
                  <div>
                    <span>SLMC Reg</span>
                    <h4>{viewingProfile.licenseNumber || "Verified"}</h4>
                  </div>
                  <div>
                    <span>Patient Rating</span>
                    <h4 className="flex-align">
                      <Star size={14} fill="#d97706" color="#d97706" />{" "}
                      {viewingProfile.rating}
                    </h4>
                  </div>
                </div>

                {/* Bio */}
                <div className="detail-section">
                  <h4>
                    <FileText size={16} /> Professional Bio
                  </h4>
                  <p className="bio-text">
                    {viewingProfile.bio ||
                      "No clinical biography provided yet."}
                  </p>
                </div>

                {/* Qualifications */}
                <div className="detail-section">
                  <h4>
                    <Award size={16} /> Academic & Clinical Qualifications
                  </h4>
                  <ul className="qualifications-list">
                    {viewingProfile.qualifications?.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    )) || <li>MBBS, MD (General Consultant)</li>}
                  </ul>
                </div>

                {/* Available Hospitals */}
                <div className="detail-section">
                  <h4>
                    <Building2 size={16} /> Available Channeling Locations
                  </h4>
                  <div className="hospitals-pills-list">
                    {viewingProfile.availableHospitals?.map((h, idx) => (
                      <span key={idx} className="hospital-pill">
                        {h}
                      </span>
                    )) || (
                      <span className="hospital-pill">
                        {viewingProfile.hospital || "Private Hospital"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Languages */}
                <div className="detail-section">
                  <h4>
                    <Languages size={16} /> Spoken Languages
                  </h4>
                  <div className="languages-flex">
                    {viewingProfile.languages?.map((l, idx) => (
                      <span key={idx} className="lang-tag">
                        {l}
                      </span>
                    )) || <span className="lang-tag">English</span>}
                  </div>
                </div>
              </div>

              <div className="modal-footer profile-footer-action">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setViewingProfile(null)}
                >
                  Back to Search
                </button>
                <button
                  type="button"
                  className="btn-proceed-checkout font-bold"
                  onClick={() => handleOpenBooking(viewingProfile)}
                >
                  Book Consultation Slot Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* --- 2. THE 2-STEP BOOKING MODAL (Reused) --- */}
        {/* ========================================================= */}
        {activeDoctor && (
          <div className="modal-backdrop">
            <div className="booking-modal-box">
              <div className="modal-header">
                <div>
                  <h3>Book Consultation</h3>
                  <p>
                    {activeDoctor.name} • {activeDoctor.specialty}
                  </p>
                </div>
                <button
                  className="close-modal-btn"
                  onClick={() => setActiveDoctor(null)}
                >
                  <X size={20} />
                </button>
              </div>

              {bookingStep === 1 ? (
                <div className="modal-step-1">
                  <div className="wizard-section">
                    <h4>1. Select Mode</h4>
                    <div className="mode-selection-cards">
                      <div
                        className={`mode-select-card ${
                          bookingMode === "Virtual" ? "selected" : ""
                        }`}
                        onClick={() => setBookingMode("Virtual")}
                      >
                        <Video size={20} />
                        <div>
                          <h5>Virtual Call</h5>
                          <span>Rs. {activeDoctor.virtualPrice}.00</span>
                        </div>
                      </div>

                      <div
                        className={`mode-select-card ${
                          bookingMode === "Physical" ? "selected" : ""
                        }`}
                        onClick={() => setBookingMode("Physical")}
                      >
                        <MapPin size={20} />
                        <div>
                          <h5>Hospital Visit</h5>
                          <span>Rs. {activeDoctor.physicalPrice}.00</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="wizard-section">
                    <h4>2. Select Time Slot</h4>
                    <div className="slots-pill-grid">
                      {activeDoctor.availableSlots?.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`slot-pill ${
                            selectedSlot === s ? "selected" : ""
                          }`}
                          onClick={() => setSelectedSlot(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="booking-summary-bar">
                    <div>
                      <span className="summary-label">Total Payable</span>
                      <h3 className="summary-price">
                        Rs.{" "}
                        {bookingMode === "Virtual"
                          ? activeDoctor.virtualPrice
                          : activeDoctor.physicalPrice}
                        .00
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="btn-proceed-checkout"
                      disabled={!selectedSlot}
                      onClick={() => setBookingStep(2)}
                    >
                      Proceed to Pay
                    </button>
                  </div>
                </div>
              ) : bookingStep === 2 ? (
                <form onSubmit={handleProcessPayment} className="modal-step-2-payment">
                  <div className="payment-wizard-summary">
                    <span className="pws-title">Channeling summary:</span>
                    <div className="pws-details">
                      <div>Mode: <strong>{bookingMode} Consultation</strong></div>
                      <div>Slot: <strong>{selectedSlot}</strong></div>
                      <div>Total Fee: <strong>Rs. {bookingMode === "Virtual" ? activeDoctor.virtualPrice : activeDoctor.physicalPrice}.00</strong></div>
                    </div>
                  </div>

                  <div className="payment-card-inputs">
                    <h4>Enter Card Details</h4>
                    
                    {paymentError && <div className="payment-error-alert">{paymentError}</div>}
                    
                    <div className="payment-input-group">
                      <label>Cardholder Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value)}
                      />
                    </div>

                    <div className="payment-input-group">
                      <label>Card Number</label>
                      <input
                        type="text"
                        required
                        pattern="\d{16}"
                        maxLength={16}
                        placeholder="xxxx xxxx xxxx xxxx"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>

                    <div className="payment-row-2">
                      <div className="payment-input-group">
                        <label>Expiry Date</label>
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val.length === 2 && !val.includes('/')) {
                              val += '/';
                            }
                            setCardExpiry(val);
                          }}
                        />
                      </div>

                      <div className="payment-input-group">
                        <label>CVC</label>
                        <input
                          type="password"
                          required
                          pattern="\d{3}"
                          maxLength={3}
                          placeholder="123"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer flex-gap">
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      disabled={isPaying}
                      onClick={() => setBookingStep(1)}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="btn-proceed-checkout font-bold"
                      disabled={isPaying}
                    >
                      {isPaying ? "Processing..." : `Pay Rs. ${bookingMode === "Virtual" ? activeDoctor.virtualPrice : activeDoctor.physicalPrice}.00`}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="modal-step-3-success">
                  <CheckCircle2 size={56} className="success-bounce-icon" />
                  <h3>Channeling Confirmed!</h3>
                  <p className="redirect-notice">
                    Your appointment with <strong>{activeDoctor.name}</strong> has been successfully booked on <strong>{selectedSlot}</strong> ({bookingMode} mode).
                  </p>
                  <div className="modal-footer flex-gap">
                    <button
                      type="button"
                      className="btn-proceed-checkout font-bold"
                      onClick={() => {
                        setActiveDoctor(null);
                        setBookingStep(1);
                      }}
                    >
                      Close & Finish
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

export default BookAppointment;
