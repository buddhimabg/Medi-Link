export interface TimeSlot {
  id: number;
  time: string;
  status: 'Available' | 'Booked' | 'Unavailable';
  hospital: string;
  hospitalCode?: string;
  location?: string;
  capacity?: number;
  booked?: number;
}

export interface ScheduleDay {
  date: Date;
  timeSlots: TimeSlot[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  dateTime: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  hospital: string;
  duration: number; // in minutes
}

export interface DoctorSchedule {
  doctorId: string;
  doctorName: string;
  specialization: string;
  availableDates: ScheduleDay[];
  appointments: Appointment[];
}
