import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
// Import Sidebar with explicit extension to help TS/IDE module resolution in some setups
import Sidebar from '../components/sidebar.tsx';
import CancelDialog from '../pages/cancel.tsx';
import './schedule.css';

interface ScheduleItem {
  id: number;
  time: string;
  status: 'Available' | 'Booked';
  hospital: string;
  location: string;
  day: string;
  totalPatients?: number;
  // If your backend returns a specific session ID, uncomment and rename this:
  // sessionId?: number; 
  // bookingId?: number;
}

const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<ScheduleItem | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 15) return 'Good Afternoon';
    if (hour < 18) return 'Good Evening';
    return 'Good Nimal';
  };

  const getFormattedDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayAbbr = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  };

  const getWeekDays = () => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const fetchSlotsForDate = async (date: Date) => {
    try {
      const dateStr = getDateString(date);
      console.log('🔍 Fetching slots for:', dateStr);
      const data = await api.getSlotsByDate(dateStr);
      console.log('✅ Fetched slots:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch slots:', error);
      return [];
    }
  };

  const fetchAllWeekSlots = async () => {
    try {
      setLoading(true);
      const weekDays = getWeekDays();
      setWeekDates(weekDays);
      const today = new Date();
      const todaySlots = await fetchSlotsForDate(today);
      setSlots(todaySlots);
      console.log('✅ Week slots loaded:', todaySlots.length);
    } catch (error) {
      console.error('❌ Failed to fetch week slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    const slotsData = await fetchSlotsForDate(date);
    setSlots(slotsData);
  };

  useEffect(() => {
    fetchAllWeekSlots();
  }, []);

  const handleView = (slot: ScheduleItem) => {
    navigate(`/view/${slot.id}`, { state: { slot: { ...slot, source: 'slot' } } });
  };

  const handleCancelClick = (slot: ScheduleItem) => {
    setSelectedSlot(slot);
    setShowCancelModal(true);
  };

  // --- UPDATED CANCEL FUNCTION (NOW REMOVES THE SLOT) ---
  const handleConfirmCancel = async () => {
    if (!selectedSlot) return;

    try {
      // STEP 1: Determine ID to delete
      const idToDelete = selectedSlot.id; 

      console.log(`🗑️ Attempting to delete session ID: ${idToDelete}`);

      // Attempt to cancel the session on the backend
      try {
        const cancelRes = await api.cancelSession(idToDelete);
        console.debug('cancelSession response:', cancelRes);
      } catch (err: any) {
        console.warn('Session delete attempt (likely already deleted):', err.message);
      }

      // STEP 2: REMOVE the slot completely from the UI list (Instead of turning it green)
      setSlots(prev => prev.filter(s => s.id !== selectedSlot.id));

      // STEP 3: Update the backend status (Mark the time slot as Available)
      try {
        const updated = await api.updateSlot(selectedSlot.id, { status: 'Available', totalPatients: 0 });
        console.debug('updateSlot response:', updated);
      } catch (err) {
        console.error('updateSlot failed:', err);
        // If it fails, we should fetch fresh data to put the slot back into the list
        const today = new Date();
        const slotsData = await fetchSlotsForDate(today);
        setSlots(slotsData);
        throw err; 
      }

      // STEP 4: Final backend sync and close modal
      const today = new Date();
      const slotsData = await fetchSlotsForDate(today);
      setSlots(slotsData); // This ensures it stays deleted from the server's perspective
      
      setShowCancelModal(false);
      setSelectedSlot(null);

    } catch (error) {
      console.error('Failed to cancel:', error);
      alert('Failed to cancel session. Please try again.');
    }
  };
  // -----------------------------

  const parseTime = (timeStr: string) => {
    if (timeStr.includes(' - ')) {
      const [start, end] = timeStr.split(' - ');
      return { start, end };
    }
    return { start: timeStr, end: '' };
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const currentSlotCount = slots.filter(slot => slot.status === 'Booked').length;

  return (
    <div className="schedule-page">
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>
      <div className="particle"></div>

      <Sidebar />

      <div className="schedule-main">
        {loading ? (
          <div className="loading-state">Loading schedule...</div>
        ) : (
          <>
            <div className="greeting-section">
              <p className="greeting-text">{getGreeting()}, Dr. Nimal Perera</p>
              <p className="doctor-title">Consultant Psychiatrist</p>
            </div>

            <div className="page-header">
              <h1>Schedule Managing</h1>
              <p className="date">{getFormattedDate(selectedDate)}</p>
            </div>

            <div className="week-calendar">
              {weekDates.map((date, index) => {
                const isActive = date.toDateString() === selectedDate.toDateString();
                const today = isToday(date);
                const dateNumber = date.getDate();
                const dayName = getDayAbbr(date);

                return (
                  <div
                    key={index}
                    className={`calendar-day ${isActive ? 'active' : ''} ${today ? 'today' : ''}`}
                    onClick={() => handleDateClick(date)}
                  >
                    <div className="calendar-day-name">{dayName}</div>
                    <div className="calendar-day-date">{dateNumber}</div>
                  </div>
                );
              })}
            </div>

            <div className="today-section">
              <div className="today-header">
                <h2>Today's Schedule</h2>
                <div className="today-stats">
                  <span className="total-slots">Total: {currentSlotCount} slots</span>
                </div>
              </div>

              {currentSlotCount === 0 ? (
                <div className="no-slots">
                  <p>No appointments scheduled for today</p>
                </div>
              ) : (
                <div className="slots-list">
                  {slots.filter(slot => slot.status === 'Booked').map((slot) => {
                    const { start, end } = parseTime(slot.time);

                    return (
                      <div key={slot.id} className={`slot-card ${slot.status.toLowerCase()}`}>
                        <div className="slot-left">
                          <div className="slot-time">
                            {start} - {end}
                          </div>
                          <div className={`slot-status ${slot.status.toLowerCase()}`}>
                            {slot.status}
                          </div>
                        </div>

                        <div className="slot-middle">
                          <div className="slot-hospital">{slot.hospital}</div>
                          <div className="slot-location">{slot.location}</div>
                        </div>

                        <div className="slot-right">
                          <button className="btn-view" onClick={() => handleView(slot)}>View</button>
                          <button className="btn-cancel" onClick={() => handleCancelClick(slot)}>Cancel</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showCancelModal && selectedSlot && (
        <CancelDialog
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleConfirmCancel}
          appointment={{
            startTime: parseTime(selectedSlot.time).start,
            endTime: parseTime(selectedSlot.time).end,
            hospital: selectedSlot.hospital,
            location: selectedSlot.location || 'Colombo 7'
          }}
        />
      )}
    </div>
  );
};

export default Schedule;