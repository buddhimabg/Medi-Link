const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: false,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.Mixed, // Supports numeric doctorId (e.g. 1, 2) or ObjectId
      required: false,
      ref: 'Doctor'
    },
    hospital: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true
    },
    location: {
      type: String,
      trim: true,
      default: 'Colombo'
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Session date is required']
    },
    day: {
      type: String, // MON, TUE, WED, THU, FRI, SAT, SUN
      trim: true,
      uppercase: true
    },
    time: {
      type: String, // e.g. "05:00 PM - 07:00 PM"
      required: [true, 'Session time range is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['Available', 'Booked', 'Completed', 'Cancelled'],
      default: 'Available'
    },
    week: {
      type: String,
      enum: ['this', 'next', 'last', 'upcoming', 'past', ''],
      default: 'this'
    },
    totalPatients: {
      type: Number,
      default: 0,
      min: [0, 'Total patients cannot be negative']
    },
    roomNumber: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'sessions' // Explicitly bind to the existing 'sessions' collection
  }
);

// Helper function to derive 3-letter day from date
function deriveDayOfWeek(dateStr) {
  if (!dateStr) return 'MON';
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'MON';
  return days[d.getDay()];
}

function deriveWeekFromDate(dateStr) {
  if (!dateStr) return 'this';
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 'this';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const currentDay = today.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const currentWeekMonday = new Date(today);
  currentWeekMonday.setDate(today.getDate() + distanceToMonday);

  const currentWeekSunday = new Date(currentWeekMonday);
  currentWeekSunday.setDate(currentWeekMonday.getDate() + 6);
  currentWeekSunday.setHours(23, 59, 59, 999);

  if (target < currentWeekMonday) return 'last';
  if (target >= currentWeekMonday && target <= currentWeekSunday) return 'this';
  return 'next';
}

// Pre-save hook: auto-compute day if missing or calculate week
sessionSchema.pre('save', async function () {
  if (this.date && (!this.day || this.isModified('date'))) {
    this.day = deriveDayOfWeek(this.date);
  }

  if (this.date && (!this.week || this.isModified('date'))) {
    this.week = deriveWeekFromDate(this.date);
  }

  // Auto-generate numeric ID if not provided
  if (!this.id) {
    try {
      const highest = await mongoose.model('Session').findOne().sort({ id: -1 }).select('id');
      this.id = highest && typeof highest.id === 'number' ? highest.id + 1 : 120;
    } catch (err) {
      this.id = Math.floor(100 + Math.random() * 900);
    }
  }
});

// Guard against "OverwriteModelError" when this file is required more than
// once (e.g. nodemon hot-reload or multiple entry points).
module.exports = mongoose.models.Session || mongoose.model('Session', sessionSchema, 'sessions');
