import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import Sidebar from "../component/sidebar";
import "./bookAppointment.css";

interface CachedPatient {
  name?: string;
  email?: string;
}

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

  // Modals
  const [activeDoctor, setActiveDoctor] = useState<Doctor | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Doctor | null>(null);

  // Wizard States
  const [bookingMode, setBookingMode] = useState<"Virtual" | "Physical">(
    "Virtual"
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [bookingStep, setBookingStep] = useState<1 | 2>(1);

  const [userName, setUserName] = useState<string>("Patient");

  useEffect(() => {
    const hydrateUser = () => {
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const u: CachedPatient = JSON.parse(stored);
          if (u?.name) setUserName(u.name.split(" ")[0]);
        } catch {
          setUserName("Patient");
        }
      }
    };
    hydrateUser();
  }, []);

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

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedSpecialty("All");
    setSelectedHospital("All");
    setSelectedMode("All");
  };

  const handleOpenBooking = (doc: Doctor) => {
    setActiveDoctor(doc);
    setSelectedSlot(doc.availableSlots?.[0] || "");
    setBookingStep(1);
    setViewingProfile(null); // Close profile modal if open
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
            <span className="text-sm font-medium text-gray-600 hidden sm:inline">
              Booking as: <strong>{userName}</strong>
            </span>
            <button className="icon-btn">
              <Bell size={20} />
            </button>
            <button className="icon-btn profile-btn">
              <User size={20} />
            </button>
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

            <div className="filter-dropdowns-row">
              <div className="dropdown-group">
                <label>Specialty</label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                >
                  <option value="All">All Specialties</option>
                  <option value="Consultant Psychiatrist">Psychiatry</option>
                  <option value="Cardiologist">Cardiology</option>
                  <option value="Dermatologist">Dermatology</option>
                  <option value="Neurologist">Neurology</option>
                </select>
              </div>

              <div className="dropdown-group">
                <label>Hospital / Channeling Center</label>
                <select
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                >
                  <option value="All">Any Hospital</option>
                  <option value="Asiri Central Hospital">
                    Asiri Central Hospital
                  </option>
                  <option value="Lanka Hospitals">Lanka Hospitals</option>
                  <option value="Nawaloka Hospital">Nawaloka Hospital</option>
                  <option value="Durdans Hospital">Durdans Hospital</option>
                </select>
              </div>

              <div className="dropdown-group">
                <label>Channeling Mode</label>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                >
                  <option value="All">Any Mode</option>
                  <option value="Virtual">Virtual Only</option>
                  <option value="Physical">In-Person Only</option>
                </select>
              </div>

              <button onClick={resetFilters} className="btn-reset-filters">
                <Filter size={16} /> Reset
              </button>
            </div>
          </section>

          <div className="results-subhead">
            <span>
              Showing <strong>{filteredDoctors.length}</strong> available
              consultants
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
            {!isLoading && filteredDoctors.length === 0 && !dbError ? (
              <div className="no-doctors-found">
                <h3>No consultants match your filters</h3>
                <p>Try resetting the dropdowns above.</p>
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
                        onClick={() => setViewingProfile(doc)}
                        className="btn-view-profile"
                      >
                        View Profile
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
              ) : (
                <div className="modal-step-2-success">
                  <CheckCircle2 size={56} className="success-bounce-icon" />
                  <h3>Slot Reserved!</h3>
                  <p className="redirect-notice">
                    Booking <strong>{bookingMode}</strong> session with{" "}
                    {activeDoctor.name} at {selectedSlot}.
                  </p>
                  <div className="modal-footer flex-gap">
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      onClick={() => setActiveDoctor(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-modal-save font-bold"
                      onClick={() =>
                        alert(
                          `Triggering checkout session for ${activeDoctor._id}`
                        )
                      }
                    >
                      Pay Now
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
