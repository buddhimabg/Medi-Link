import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
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


interface ScheduleSlot {
  _id: string;
  time: string;
  isBooked: boolean;
}

interface DoctorSchedule {
  _id: string;
  doctorId: string;
  date: string;
  slots: ScheduleSlot[];
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
  availableDays?: string[];
  schedules?: DoctorSchedule[];
}

const BookAppointment: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedDoctorName, setSelectedDoctorName] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState("");

  // Dynamically compute unique values for filters from loaded doctors
  const specialties = useMemo(() => {
    return Array.from(new Set(doctors.map((d) => d.specialty).filter(Boolean))).sort();
  }, [doctors]);

  const hospitals = useMemo(() => {
    return Array.from(
      new Set(
        doctors
          .flatMap((d) => (d.availableHospitals && d.availableHospitals.length > 0 ? d.availableHospitals : [d.hospital]))
          .filter(Boolean)
      )
    ).sort();
  }, [doctors]);

  const doctorNames = useMemo(() => {
    return Array.from(new Set(doctors.map((d) => d.name).filter(Boolean))).sort();
  }, [doctors]);

  // Group doctors by name to check for duplicate names
  const doctorNameGroups = useMemo(() => {
    const groups: Record<string, Doctor[]> = {};
    doctors.forEach((doc) => {
      if (!groups[doc.name]) {
        groups[doc.name] = [];
      }
      groups[doc.name].push(doc);
    });
    return groups;
  }, [doctors]);

  // State to track if the user has clicked search yet
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState("");

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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [userName, setUserName] = useState<string>("Patient");
  const [fullUserData, setFullUserData] = useState<any>(null);

  const [bookingTarget, setBookingTarget] = useState<"myself" | "someone_else">("myself");
  const [patientTitle, setPatientTitle] = useState("Mr");
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhoneCountryCode, setPatientPhoneCountryCode] = useState("+94");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientArea, setPatientArea] = useState("");
  const [identityType, setIdentityType] = useState<"nic" | "passport">("nic");
  const [patientIdNumber, setPatientIdNumber] = useState("");
  const [noShowRefund, setNoShowRefund] = useState(false);
  const [formValidationError, setFormValidationError] = useState("");
  const formContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read unused state variables to satisfy TypeScript compiler (TS6133)
    if (isProfileLoading || userName) {
      // Do nothing
    }
    if (formContainerRef.current) {
      formContainerRef.current.scrollTop = 0;
    }
  }, [bookingStep, isProfileLoading, userName]);

  useEffect(() => {
    if (bookingTarget === "myself" && fullUserData) {
      setPatientName(fullUserData.name || "");
      setPatientEmail(fullUserData.email || "");
      setPatientArea(fullUserData.city || "");
      setPatientTitle(fullUserData.gender === "Female" ? "Mrs" : "Mr");
      setPatientIdNumber(fullUserData.nic || "");

      const rawPhone = fullUserData.mobile || fullUserData.phone || "";
      if (rawPhone.startsWith("+94")) {
        setPatientPhoneCountryCode("+94");
        setPatientPhone(rawPhone.slice(3));
      } else if (rawPhone.startsWith("0")) {
        setPatientPhoneCountryCode("+94");
        setPatientPhone(rawPhone.slice(1));
      } else {
        setPatientPhoneCountryCode("+94");
        setPatientPhone(rawPhone);
      }
    } else if (bookingTarget === "someone_else") {
      setPatientName("");
      setPatientEmail("");
      setPatientPhone("");
      setPatientArea("");
      setPatientIdNumber("");
      setPatientTitle("Mr");
    }
  }, [bookingTarget, fullUserData]);

  // const isFormValid = useMemo(() => {
  //   return !!patientName.trim() && !!patientPhone.trim() && !!patientIdNumber.trim();
  // }, [patientName, patientPhone, patientIdNumber]);

  const doctorFee = useMemo(() => {
    if (!activeDoctor) return 0;
    return bookingMode === "Virtual" ? activeDoctor.virtualPrice : activeDoctor.physicalPrice;
  }, [activeDoctor, bookingMode]);

  const hospitalFee = useMemo(() => {
    return bookingMode === "Virtual" ? 0 : 1300;
  }, [bookingMode]);

  const channelingFee = 399;
  const discount = 0;
  const noShowFee = 0;
  const redeemPoints = 0;

  const totalFee = useMemo(() => {
    return doctorFee + hospitalFee + channelingFee + noShowFee - discount - redeemPoints;
  }, [doctorFee, hospitalFee]);

  // Helper functions and memoizations for doctor schedules view
  const formatScheduleDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // Format as "Friday, 17 Jul 2026"
      const day = date.getDate();
      const weekday = date.toLocaleDateString("en-US", { weekday: 'long' });
      const month = date.toLocaleDateString("en-US", { month: 'short' });
      const year = date.getFullYear();
      return `${weekday}, ${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  const getHospitalForSlot = (doc: Doctor, slotIndex: number) => {
    const list = doc.availableHospitals && doc.availableHospitals.length > 0
      ? doc.availableHospitals
      : (doc.hospital ? [doc.hospital] : ["MediLink Clinic"]);
    return list[slotIndex % list.length];
  };

  const getHospitalLogoText = (hospitalName: string) => {
    return hospitalName.split(" ")[0];
  };

  const getHospitalCity = (hospitalName: string) => {
    if (hospitalName.includes("Colombo")) {
      const match = hospitalName.match(/Colombo\s*\d+/i);
      return match ? match[0] : "Colombo";
    }
    if (hospitalName.includes("Lanka")) return "Colombo 05";
    if (hospitalName.includes("Asiri Central")) return "Colombo 10";
    if (hospitalName.includes("Nawaloka")) return "Colombo 02";
    if (hospitalName.includes("Asiri")) return "Colombo 05";
    return "Colombo 03";
  };

  const getSlotPeriod = (timeStr: string) => {
    if (timeStr.includes("AM")) return "Morning";
    const hour = parseInt(timeStr.split(":")[0]);
    if (hour === 12 || hour < 4) return "Afternoon";
    return "Evening";
  };

  const handleStartCheckout = (slotStr: string) => {
    setSelectedSlot(slotStr);
    setBookingStep(1);
    setFormValidationError("");
    setIsCheckoutOpen(true);
  };

  const handleProceedToStep2 = () => {
    setFormValidationError("");
    if (!patientName.trim()) {
      setFormValidationError("Name is required.");
      return;
    }
    if (!patientPhone.trim()) {
      setFormValidationError("Phone number is required.");
      return;
    }
    if (!patientIdNumber.trim()) {
      setFormValidationError(`${identityType === "nic" ? "NIC" : "Passport"} number is required.`);
      return;
    }
    setBookingStep(2);
  };

  const doctorSchedulesGrouped = useMemo(() => {
    if (!activeDoctor || !activeDoctor.schedules) return [];
    let filtered = activeDoctor.schedules;
    if (selectedDate) {
      filtered = activeDoctor.schedules.filter(s => s.date === selectedDate);
    }
    return filtered.map(sched => {
      const slotsWithDetails = sched.slots
        .map((slot, slotIdx) => {
          const hospitalName = getHospitalForSlot(activeDoctor, slotIdx);
          return {
            _id: slot._id,
            time: slot.time,
            isBooked: slot.isBooked,
            hospitalName,
            slotIdx
          };
        })
        .filter(slot => !slot.isBooked && (!selectedHospital || slot.hospitalName === selectedHospital));

      return {
        ...sched,
        slots: slotsWithDetails
      };
    }).filter(sched => sched.slots.length > 0);
  }, [activeDoctor, selectedDate, selectedHospital]);

  const totalSessionsCount = useMemo(() => {
    return doctorSchedulesGrouped.reduce((sum, sched) => sum + sched.slots.length, 0);
  }, [doctorSchedulesGrouped]);

  // Payment Form States
  const [paymentError, setPaymentError] = useState("");
  const [isPaying, setIsPaying] = useState(false);


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

  const handleProcessPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeDoctor || !selectedSlot) return;

    setPaymentError("");
    setIsPaying(true);

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
          amount: totalFee
        })
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || "Failed to initiate payment.");
      }

      const { appointmentId, payhere: payhereConfig } = json.data;

      // Verify window.payhere is loaded
      const payhere = (window as any).payhere;
      if (!payhere) {
        throw new Error("PayHere SDK not loaded. Please try again.");
      }

      payhere.onCompleted = async function onCompleted(orderId: string) {
        console.log("Payment completed. orderId:", orderId);
        setIsPaying(true);

        try {
          await fetch(`http://localhost:5000/api/appointments/${appointmentId}/confirm-payment`, {
            method: "POST"
          });
        } catch (err) {
          console.warn("Could not confirm payment locally:", err);
        }

        // Poll backend to confirm the status has been verified via webhook
        let pollCount = 0;
        const maxPolls = 15;
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`http://localhost:5000/api/payments/${appointmentId}/status`);
            if (statusRes.ok) {
              const statusJson = await statusRes.json();
              if (statusJson.success && statusJson.paymentStatus === "Paid") {
                clearInterval(pollInterval);
                setIsPaying(false);
                setBookingStep(3);

                // Update slot locally
                setDoctors(prevDoctors =>
                  prevDoctors.map(doc =>
                    doc._id === activeDoctor._id
                      ? { ...doc, availableSlots: doc.availableSlots.filter(s => s !== selectedSlot) }
                      : doc
                  )
                );

                // Update activeDoctor state locally
                setActiveDoctor(prev => {
                  if (!prev) return null;
                  const updatedSchedules = prev.schedules?.map(sched => ({
                    ...sched,
                    slots: sched.slots.map(s => {
                      const fullSlotStr = `${sched.date} ${s.time}`;
                      if (fullSlotStr === selectedSlot) {
                        return { ...s, isBooked: true };
                      }
                      return s;
                    })
                  }));
                  return {
                    ...prev,
                    schedules: updatedSchedules,
                    availableSlots: prev.availableSlots.filter(s => s !== selectedSlot)
                  };
                });
                return;
              }
            }
          } catch (pollErr) {
            console.error("Error polling payment status:", pollErr);
          }

          pollCount++;
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            setIsPaying(false);
            setPaymentError("Payment successful, but validation response timed out. Please check your appointment records.");
          }
        }, 1000);
      };

      payhere.onDismissed = async function onDismissed() {
        console.log("PayHere payment window dismissed");
        setIsPaying(false);
        setPaymentError("Payment was canceled. The channeling slot was released.");
        try {
          await fetch(`http://localhost:5000/api/payments/${appointmentId}/cancel`, {
            method: "POST"
          });
        } catch (cancelErr) {
          console.error("Error canceling appointment:", cancelErr);
        }
      };

      payhere.onError = async function onError(error: string) {
        console.error("PayHere error:", error);
        setIsPaying(false);
        setPaymentError(`Payment failed: ${error}`);
        try {
          await fetch(`http://localhost:5000/api/payments/${appointmentId}/cancel`, {
            method: "POST"
          });
        } catch (cancelErr) {
          console.error("Error canceling appointment:", cancelErr);
        }
      };

      // Open PayHere payment gateway sandbox window
      payhere.startPayment(payhereConfig);

    } catch (err: any) {
      console.error("Payment initiation failed:", err);
      setPaymentError(err.message || "Failed to reach backend checkout session.");
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
      !searchTerm ||
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.availableHospitals?.some((h) =>
        h.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      (doc.hospital && doc.hospital.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSpec =
      !selectedSpecialty || doc.specialty === selectedSpecialty;

    // Array-safe hospital check
    const matchesHosp =
      !selectedHospital ||
      (doc.availableHospitals && doc.availableHospitals.length > 0
        ? doc.availableHospitals.includes(selectedHospital)
        : doc.hospital === selectedHospital);

    const matchesDocName =
      !selectedDoctorName || doc.name === selectedDoctorName;

    const matchesSpecificDoc =
      !selectedDoctorId || doc._id === selectedDoctorId;

    // Date search support
    let matchesDate = true;
    if (selectedDate) {
      const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dateObj = new Date(selectedDate);
      const dayName = daysOfWeek[dateObj.getDay()]; // e.g. "Mon"

      const weekdayMatch = doc.availableDays && doc.availableDays.includes(dayName);
      const slotMatch = doc.availableSlots && doc.availableSlots.some(slot => slot.includes(selectedDate));

      matchesDate = !!(weekdayMatch || slotMatch);
    }

    return matchesSearch && matchesSpec && matchesHosp && matchesDocName && matchesSpecificDoc && matchesDate;
  });

  const handleSearch = () => {
    const isSearchCriteriaEmpty =
      !searchTerm.trim() &&
      !selectedSpecialty &&
      !selectedHospital &&
      !selectedDoctorName &&
      !selectedDate;

    if (isSearchCriteriaEmpty) {
      setSearchError("Please select at least one search criteria (Specialty, Hospital, Doctor, or Date) before searching.");
      setHasSearched(false);
    } else {
      setSearchError("");
      setHasSearched(true);
      setActiveDoctor(null); // Go back to results when searching!
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedSpecialty("");
    setSelectedHospital("");
    setSelectedDoctorName("");
    setSelectedDoctorId("");
    setSelectedDate("");
    setHasSearched(false); // Hide results again when reset
    setSearchError(""); // Clear any search validation error
    setActiveDoctor(null); // Go back to results when resetting!
  };

  const handleOpenBooking = (doc: Doctor) => {
    setActiveDoctor(doc);
    setViewingProfile(null); // Close profile modal if open
  };

  // Dropdown style variables removed to prefer modern CSS styles in bookAppointment.css

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
              {/* 1. Specialty Dropdown */}
              <div className="dropdown-group" style={{ flex: "1 1 200px" }}>
                <div className="modern-select-wrapper">
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    style={{ color: selectedSpecialty === "" ? "#94a3b8" : "#334155" }}
                  >
                    <option value="" hidden>Select Specialty</option>
                    {specialties.map((spec) => (
                      <option key={spec} value={spec} style={{ color: "#334155" }}>
                        {spec}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="modern-select-chevron" />
                </div>
              </div>

              {/* 2. Hospital Dropdown */}
              <div className="dropdown-group" style={{ flex: "1 1 200px" }}>
                <div className="modern-select-wrapper">
                  <select
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                    style={{ color: selectedHospital === "" ? "#94a3b8" : "#334155" }}
                  >
                    <option value="" hidden>Select Hospital</option>
                    {hospitals.map((hosp) => (
                      <option key={hosp} value={hosp} style={{ color: "#334155" }}>
                        {hosp}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="modern-select-chevron" />
                </div>
              </div>

              {/* 3. Doctor Names Dropdown */}
              <div className="dropdown-group" style={{ flex: "1 1 200px" }}>
                <div className="modern-select-wrapper">
                  <select
                    value={selectedDoctorName}
                    onChange={(e) => {
                      setSelectedDoctorName(e.target.value);
                      setSelectedDoctorId("");
                    }}
                    style={{ color: selectedDoctorName === "" ? "#94a3b8" : "#334155" }}
                  >
                    <option value="" hidden>Select Doctor</option>
                    {doctorNames.map((name) => (
                      <option key={name} value={name} style={{ color: "#334155" }}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="modern-select-chevron" />
                </div>
              </div>

              {/* 4. Duplicate Doctor Selection (Conditional) */}
              {selectedDoctorName && doctorNameGroups[selectedDoctorName]?.length > 1 && (
                <div className="dropdown-group" style={{ flex: "1 1 250px" }}>
                  <div className="modern-select-wrapper">
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      style={{
                        color: selectedDoctorId === "" ? "#94a3b8" : "#334155",
                        border: "2px solid #0D47A1",
                      }}
                    >
                      <option value="">Select Practitioner</option>
                      {doctorNameGroups[selectedDoctorName].map((doc) => {
                        const description = doc.specialty +
                          (doc.availableHospitals?.[0] ? ` - ${doc.availableHospitals[0]}` : (doc.hospital ? ` - ${doc.hospital}` : ""));
                        return (
                          <option key={doc._id} value={doc._id} style={{ color: "#334155" }}>
                            {doc.name} ({description})
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown size={16} className="modern-select-chevron" />
                  </div>
                </div>
              )}

              {/* 5. Available Date Picker */}
              <div className="dropdown-group" style={{ flex: "1 1 200px" }}>
                <div className="modern-select-wrapper">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      color: selectedDate === "" ? "#94a3b8" : "#334155",
                    }}
                  />
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
                    backgroundColor: "#0D47A1",
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

          {activeDoctor ? (
            <div className="results-subhead">
              <span>
                <button
                  onClick={() => setActiveDoctor(null)}
                  className="back-to-results-btn"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0D47A1",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0"
                  }}
                >
                  &larr; Back to Search Results
                </button>
              </span>
            </div>
          ) : (
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
          )}

          {isLoading && (
            <div className="loading-box">
              <Loader size={32} className="spin-icon" />
              <p>Fetching clinical records from database...</p>
            </div>
          )}

          {dbError && <div className="error-box">{dbError}</div>}

          {activeDoctor ? (
            <div className="doctor-schedule-container">
              {/* Left hand side */}
              <div className="schedule-left-panel">
                <div className="doc-schedule-profile-card">
                  <div className="card-top-avatar-container-static">
                    <img
                      src={activeDoctor.photo || activeDoctor.imageUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=250"}
                      alt={activeDoctor.name}
                      className="doc-card-avatar-centered"
                    />
                  </div>
                  <div className="card-details-centered">
                    <span className="doc-gender-centered">{activeDoctor.gender || "Doctor"}</span>
                    <h3 className="doc-name-centered">{activeDoctor.name}</h3>
                    <p className="doc-specialty-centered">{activeDoctor.specialty}</p>
                  </div>
                  <button
                    onClick={() => handleViewProfile(activeDoctor._id)}
                    className="btn-view-profile-centered"
                  >
                    View Profile
                  </button>
                </div>

                <div className="doc-schedule-hospitals-card">
                  <h4>Available Hospitals</h4>
                  <div className="schedule-hospitals-list">
                    {activeDoctor.availableHospitals && activeDoctor.availableHospitals.length > 0 ? (
                      activeDoctor.availableHospitals.map((h, idx) => {
                        const isSelected = selectedHospital === h;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedHospital(isSelected ? "" : h)}
                            className={`schedule-hospital-item-btn ${isSelected ? "selected" : ""}`}
                          >
                            <MapPin size={16} className="hosp-icon" />
                            <span>{h}</span>
                          </button>
                        );
                      })
                    ) : activeDoctor.hospital ? (
                      (() => {
                        const isSelected = selectedHospital === activeDoctor.hospital;
                        return (
                          <button
                            onClick={() => setSelectedHospital(isSelected ? "" : activeDoctor.hospital || "")}
                            className={`schedule-hospital-item-btn ${isSelected ? "selected" : ""}`}
                          >
                            <MapPin size={16} className="hosp-icon" />
                            <span>{activeDoctor.hospital}</span>
                          </button>
                        );
                      })()
                    ) : (
                      <span className="no-hospitals-label">No registered clinics</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right hand side */}
              <div className="schedule-right-panel">
                {!isCheckoutOpen ? (
                  <>
                    <div className="specialty-banner-bar">
                      <div className="banner-left">
                        <span className="banner-specialty">{activeDoctor.specialty.toUpperCase()}</span>
                        <span className="banner-sessions-count">Sessions: {totalSessionsCount}</span>
                      </div>
                      <ChevronDown size={20} className="banner-chevron" />
                    </div>

                    {doctorSchedulesGrouped.length === 0 ? (
                      <div className="no-sessions-found">
                        <h3>No upcoming sessions available</h3>
                        <p>There are no sessions available for the selected filters.</p>
                      </div>
                    ) : (
                      doctorSchedulesGrouped.map((sched) => {
                        const formattedDate = formatScheduleDate(sched.date);
                        return (
                          <div key={sched._id} className="date-sessions-group">
                            <h4 className="schedule-date-header">{formattedDate}</h4>
                            <div className="sessions-list">
                              {sched.slots.map((slot) => {
                                const hospitalName = slot.hospitalName;
                                const logoText = getHospitalLogoText(hospitalName);
                                const city = getHospitalCity(hospitalName);
                                const period = getSlotPeriod(slot.time);
                                const fullSlotStr = `${sched.date} ${slot.time}`;

                                return (
                                  <div key={slot._id} className="session-row-card">
                                    <div className="session-green-indicator"></div>
                                    <div className="session-logo-box">
                                      <span>{logoText}</span>
                                    </div>
                                    <div className="session-clinic-info">
                                      <h5 className="clinic-name">{hospitalName}</h5>
                                      <span className="clinic-city">{city}</span>
                                      <span className="clinic-specialty">{activeDoctor.specialty}</span>
                                    </div>
                                    <div className="session-time-info">
                                      <span className="session-time">{slot.time}</span>
                                      <span className="session-period">{period}</span>
                                    </div>
                                    <div className="session-patients-info">
                                      <span className="session-patients-count">0</span>
                                      <span className="session-patients-label">Patients</span>
                                    </div>
                                    <div className="session-fee-info">
                                      <span className="session-fee-amount">
                                        Rs. {(bookingMode === "Virtual" ? activeDoctor.virtualPrice : activeDoctor.physicalPrice).toLocaleString()}.00 + Booking Fee
                                      </span>
                                      <span className="session-fee-label">Channelling Fee</span>
                                    </div>
                                    <div className="session-action">
                                      <button
                                        onClick={() => handleStartCheckout(fullSlotStr)}
                                        className="session-available-btn"
                                      >
                                        Available
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                ) : bookingStep === 1 ? (
                  <div className="inline-checkout-layout-grid">
                    {/* Left Panel: Patient Details Form */}
                    <div ref={formContainerRef} className="inline-checkout-form-container">
                      <div className="inline-checkout-header">
                        <button
                          type="button"
                          className="btn-inline-back"
                          onClick={() => {
                            setIsCheckoutOpen(false);
                            setSelectedSlot("");
                          }}
                        >
                          ← Back to Sessions
                        </button>
                        <div className="inline-checkout-title">
                          <h3>Patient Information</h3>
                          <p>Selected Slot: <strong>{selectedSlot}</strong></p>
                        </div>
                      </div>

                      <div className="wizard-form-section">

                        {/* 1. Myself vs Someone Else Radio Selector */}
                        <div className="form-radio-row">
                          <label className="form-radio-label-container">
                            <input
                              type="radio"
                              name="bookingTarget"
                              value="myself"
                              checked={bookingTarget === "myself"}
                              onChange={() => setBookingTarget("myself")}
                            />
                            <span className="radio-custom-dot"></span>
                            <span className="radio-label-text">MySelf</span>
                          </label>
                          <label className="form-radio-label-container">
                            <input
                              type="radio"
                              name="bookingTarget"
                              value="someone_else"
                              checked={bookingTarget === "someone_else"}
                              onChange={() => setBookingTarget("someone_else")}
                            />
                            <span className="radio-custom-dot"></span>
                            <span className="radio-label-text">Someone Else</span>
                          </label>
                        </div>

                        {/* 2. Personal Information Fields Grid */}
                        <div className="form-fields-grid-3">
                          <div className="form-field-group">
                            <label>Title</label>
                            <select
                              value={patientTitle}
                              onChange={(e) => setPatientTitle(e.target.value)}
                              className="form-select-input"
                            >
                              <option value="Mr">Mr</option>
                              <option value="Mrs">Mrs</option>
                              <option value="Miss">Miss</option>
                              <option value="Dr">Dr</option>
                              <option value="Ms">Ms</option>
                            </select>
                          </div>

                          <div className="form-field-group">
                            <label>Name *</label>
                            <input
                              type="text"
                              value={patientName}
                              onChange={(e) => setPatientName(e.target.value)}
                              placeholder="Full Name"
                              className="form-text-input"
                              required
                            />
                          </div>

                          <div className="form-field-group">
                            <label>Email</label>
                            <input
                              type="email"
                              value={patientEmail}
                              onChange={(e) => setPatientEmail(e.target.value)}
                              placeholder="Email Address"
                              className="form-text-input"
                            />
                          </div>
                        </div>

                        {/* 3. Phone number & City Grid */}
                        <div className="form-fields-grid-2">
                          <div className="form-field-group">
                            <label>Number *</label>
                            <div className="phone-input-split">
                              <select
                                value={patientPhoneCountryCode}
                                onChange={(e) => setPatientPhoneCountryCode(e.target.value)}
                                className="form-phone-code-select"
                              >
                                <option value="+94">+94</option>
                                <option value="+1">+1</option>
                                <option value="+44">+44</option>
                                <option value="+91">+91</option>
                              </select>
                              <input
                                type="tel"
                                value={patientPhone}
                                onChange={(e) => setPatientPhone(e.target.value)}
                                placeholder="701971067"
                                className="form-phone-number-input"
                                required
                              />
                            </div>
                          </div>

                          <div className="form-field-group">
                            <label>Area</label>
                            <input
                              type="text"
                              value={patientArea}
                              onChange={(e) => setPatientArea(e.target.value)}
                              placeholder="Please enter your closest city"
                              className="form-text-input"
                            />
                          </div>
                        </div>

                        {/* 4. Identity Type Selector */}
                        <div className="form-radio-row mt-3">
                          <label className="form-radio-label-container">
                            <input
                              type="radio"
                              name="identityType"
                              value="nic"
                              checked={identityType === "nic"}
                              onChange={() => setIdentityType("nic")}
                            />
                            <span className="radio-custom-dot"></span>
                            <span className="radio-label-text">NIC</span>
                          </label>
                          <label className="form-radio-label-container">
                            <input
                              type="radio"
                              name="identityType"
                              value="passport"
                              checked={identityType === "passport"}
                              onChange={() => setIdentityType("passport")}
                            />
                            <span className="radio-custom-dot"></span>
                            <span className="radio-label-text">Passport</span>
                          </label>
                        </div>

                        {/* 5. ID Number Input */}
                        <div className="form-fields-single">
                          <div className="form-field-group">
                            <label>{identityType === "nic" ? "NIC Number *" : "Passport Number *"}</label>
                            <input
                              type="text"
                              value={patientIdNumber}
                              onChange={(e) => setPatientIdNumber(e.target.value)}
                              placeholder={identityType === "nic" ? "200217802365" : "Passport Number"}
                              className="form-text-input"
                              required
                            />
                          </div>
                        </div>

                        {/* 6. Consultation Mode (Radial Button Selection) */}
                        <div className="form-section-title mt-4">Consultation Mode *</div>
                        <div className="form-radio-row">
                          <label className="form-radio-label-container">
                            <input
                              type="radio"
                              name="bookingMode"
                              value="Physical"
                              checked={bookingMode === "Physical"}
                              onChange={() => setBookingMode("Physical")}
                            />
                            <span className="radio-custom-dot"></span>
                            <span className="radio-label-text">Physical (Hospital Visit)</span>
                          </label>
                          <label className="form-radio-label-container">
                            <input
                              type="radio"
                              name="bookingMode"
                              value="Virtual"
                              checked={bookingMode === "Virtual"}
                              onChange={() => setBookingMode("Virtual")}
                            />
                            <span className="radio-custom-dot"></span>
                            <span className="radio-label-text">Virtual (Online Video)</span>
                          </label>
                        </div>

                        {/* 7. No Show Refund Checkbox */}
                        <div className="form-checkbox-row mt-4">
                          <label className="form-checkbox-label-container">
                            <input
                              type="checkbox"
                              checked={noShowRefund}
                              onChange={(e) => setNoShowRefund(e.target.checked)}
                            />
                            <span className="checkbox-custom-box"></span>
                            <span className="checkbox-label-text">No Show Refund</span>
                          </label>
                        </div>

                        {/* Refund Notice Banner */}
                        <div className="refund-notice-banner">
                          <div className="refund-notice-header">
                            <span className="info-icon">🛈</span>
                            <h5>Option for No Show Refund</h5>
                          </div>
                          <p className="refund-text-main">
                            If appointment is cancelled or no show, the total charge will be <strong className="highlight-refund">refunded without LKR 275/= service charge</strong>. Terms and condition apply.
                          </p>
                          <p className="refund-text-sub">
                            All claim requests are required to be received before the commencement of the scheduled session. Requests submitted after the session start time will not be eligible for consideration.
                          </p>
                        </div>

                      </div>
                    </div>

                    {/* Right Panel: Payment Details Card */}
                    <div className="inline-checkout-summary-section">
                      {formValidationError && (
                        <div className="payment-error-alert" style={{ marginBottom: "12px", fontSize: "0.85rem", padding: "10px", backgroundColor: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "8px", color: "#b91c1c", textAlign: "left" }}>
                          ⚠️ {formValidationError}
                        </div>
                      )}
                      <div className="payment-details-card">
                        <h4 className="pd-title">Payment Details</h4>
                        <p className="pd-subtitle">Detailed payment breakdown on your transaction</p>

                        <div className="pd-divider"></div>

                        <div className="pd-row">
                          <span>Doctor fee</span>
                          <strong>Rs {doctorFee.toLocaleString()}.00</strong>
                        </div>
                        <div className="pd-row">
                          <span>Hospital fee</span>
                          <strong>Rs {hospitalFee.toLocaleString()}.00</strong>
                        </div>
                        <div className="pd-row">
                          <span>eChannelling fee</span>
                          <strong>Rs {channelingFee.toLocaleString()}.00</strong>
                        </div>
                        <div className="pd-row discount-row">
                          <span>Discount</span>
                          <strong className="red-text">- Rs {discount.toLocaleString()}.00</strong>
                        </div>
                        <div className="pd-row">
                          <span>No show fee</span>
                          <strong>Rs {noShowFee.toLocaleString()}.00</strong>
                        </div>
                        <div className="pd-row discount-row">
                          <span>Redeem Points</span>
                          <strong className="red-text">- Rs {redeemPoints.toLocaleString()}.00</strong>
                        </div>

                        <div className="pd-divider"></div>

                        <div className="pd-row total-row">
                          <span>Total fee</span>
                          <strong className="total-amount">Rs {totalFee.toLocaleString()}.00</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-pay-securely"
                        onClick={handleProceedToStep2}
                      >
                        🔒 Pay
                      </button>
                      <p className="pay-instruction-caption">
                        Please click "Pay" button to confirm your appointment
                      </p>
                    </div>
                  </div>
                ) : bookingStep === 2 ? (
                  <div className="inline-checkout-layout-grid">
                    {/* Left Panel: PayHere Secure Payment Info */}
                    <div ref={formContainerRef} className="inline-checkout-form-container">
                      <div className="inline-checkout-header">
                        <button
                          type="button"
                          className="btn-inline-back"
                          disabled={isPaying}
                          onClick={() => setBookingStep(1)}
                        >
                          ← Back to Patient Details
                        </button>
                        <div className="inline-checkout-title">
                          <h3>Secure Channeling Payment</h3>
                        </div>
                      </div>

                      <div className="wizard-form-section">
                        <div className="payment-wizard-summary">
                          <span className="pws-title">Channeling summary:</span>
                          <div className="pws-details">
                            <div>Mode: <strong>{bookingMode} Consultation</strong></div>
                            <div>Slot: <strong>{selectedSlot}</strong></div>
                            <div>Total Fee: <strong>Rs. {totalFee.toLocaleString()}.00</strong></div>
                          </div>
                        </div>

                        <div className="payhere-checkout-container">
                          <img
                            className="payhere-logo"
                            src="https://www.payhere.lk/downloads/images/payhere_square_banner.png"
                            alt="PayHere Secure Gateway"
                          />
                          <h4 className="payhere-title">Pay via PayHere</h4>
                          <p className="payhere-desc">
                            You will be routed to the secure PayHere Sandbox payment gateway to complete this transaction using sandbox test cards.
                          </p>

                          {paymentError && <div className="payment-error-alert">{paymentError}</div>}
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: Payment Details Card */}
                    <div className="inline-checkout-summary-section">
                      <div className="payment-details-card">
                        <h4 className="pd-title">Payment Details</h4>
                        <p className="pd-subtitle">Detailed payment breakdown on your transaction</p>

                        <div className="pd-divider"></div>

                        <div className="pd-row">
                          <span>Doctor fee</span>
                          <strong>Rs {doctorFee.toLocaleString()}.00</strong>
                        </div>
                        <div className="pd-row">
                          <span>Hospital fee</span>
                          <strong>Rs {hospitalFee.toLocaleString()}.00</strong>
                        </div>
                        <div className="pd-row">
                          <span>eChannelling fee</span>
                          <strong>Rs {channelingFee.toLocaleString()}.00</strong>
                        </div>
                        <div className="pd-row discount-row">
                          <span>Discount</span>
                          <strong className="red-text">- Rs {discount.toLocaleString()}.00</strong>
                        </div>
                        <div className="pd-row">
                          <span>No show fee</span>
                          <strong>Rs {noShowFee.toLocaleString()}.00</strong>
                        </div>
                        <div className="pd-row discount-row">
                          <span>Redeem Points</span>
                          <strong className="red-text">- Rs {redeemPoints.toLocaleString()}.00</strong>
                        </div>

                        <div className="pd-divider"></div>

                        <div className="pd-row total-row">
                          <span>Total fee</span>
                          <strong className="total-amount">Rs {totalFee.toLocaleString()}.00</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-pay-securely font-bold"
                        disabled={isPaying}
                        onClick={() => handleProcessPayment()}
                      >
                        {isPaying ? "Opening Gateway..." : "Proceed to Checkout"}
                      </button>
                      <p className="pay-instruction-caption">
                        Please click "Proceed to Checkout" to initiate gateway payment
                      </p>
                    </div>
                  </div>
                ) : (
                  <div ref={formContainerRef} className="inline-checkout-form-container text-center">
                    <div className="modal-step-3-success">
                      <CheckCircle2 size={56} className="success-bounce-icon" style={{ color: "#16a34a", margin: "0 auto 16px" }} />
                      <h3>Channeling Confirmed!</h3>
                      <p className="redirect-notice">
                        Your appointment with <strong>{activeDoctor.name}</strong> has been successfully booked on <strong>{selectedSlot}</strong> ({bookingMode} mode).
                      </p>
                      <div className="modal-footer flex-gap">
                        <button
                          type="button"
                          className="btn-proceed-checkout font-bold"
                          onClick={() => {
                            setIsCheckoutOpen(false);
                            setBookingStep(1);
                            setSelectedSlot("");
                          }}
                        >
                          Finish & Return to Sessions
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
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
                  {searchError ? (
                    <p style={{ color: "#ef4444", fontWeight: 500 }}>{searchError}</p>
                  ) : (
                    <p>
                      Select your criteria and click Search to find the right
                      consultant for you.
                    </p>
                  )}
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

                  return (
                    <div key={doc._id} className="doc-grid-card modern-centered-card">
                      <div
                        className="card-top-avatar-container"
                        onClick={() => handleViewProfile(doc._id)}
                        title="Click to view profile"
                      >
                        <img
                          src={avatar}
                          alt={doc.name}
                          className="doc-card-avatar-centered"
                        />
                      </div>

                      <div className="card-details-centered">
                        <span className="doc-gender-centered">{doc.gender || "Doctor"}</span>
                        <h3 className="doc-name-centered">{doc.name}</h3>
                        <p className="doc-specialty-centered">{doc.specialty}</p>
                      </div>

                      <button
                        onClick={() => handleOpenBooking(doc)}
                        className="btn-book-now-centered"
                      >
                        Book Now
                      </button>
                    </div>
                  );
                })
              )}
            </section>
          )}
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


      </div>
    </div>
  );
};

export default BookAppointment;
