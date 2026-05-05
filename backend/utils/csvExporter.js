/**
 * CSV Export Utility Functions
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Column names (optional)
 * @returns {string} CSV string
 */
const convertToCSV = (data, columns = null) => {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Get columns from first object if not provided
  const cols = columns || Object.keys(data[0]);

  // Create header row
  const header = cols.map(escapeCSVField).join(',');

  // Create data rows
  const rows = data.map(obj =>
    cols.map(col => escapeCSVField(obj[col] || '')).join(',')
  );

  return [header, ...rows].join('\n');
};

/**
 * Escape CSV field value
 * @param {*} field - Field value
 * @returns {string} Escaped field
 */
const escapeCSVField = (field) => {
  if (field === null || field === undefined) {
    return '';
  }

  const stringField = String(field);

  // Escape quotes and wrap in quotes if contains comma, newline, or quotes
  if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
};

/**
 * Download CSV file
 * @param {string} csv - CSV content
 * @param {string} filename - Output filename
 */
const downloadCSV = (csv, filename = 'export.csv') => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export appointments to CSV
 * @param {Array} appointments - Appointments data
 * @returns {string} CSV content
 */
const exportAppointmentsToCSV = (appointments) => {
  const data = appointments.map(apt => ({
    'Appointment Date': apt.appointmentDate,
    'Doctor': apt.doctorId?.name || '',
    'Patient': apt.patientId?.name || '',
    'Start Time': apt.startTime,
    'End Time': apt.endTime,
    'Type': apt.consultationType,
    'Status': apt.status,
    'Reason': apt.reason
  }));

  return convertToCSV(data);
};

/**
 * Export patients to CSV
 * @param {Array} patients - Patients data
 * @returns {string} CSV content
 */
const exportPatientsToCSV = (patients) => {
  const data = patients.map(patient => ({
    'Name': patient.userId?.name || '',
    'Email': patient.userId?.email || '',
    'Phone': patient.userId?.phone || '',
    'Date of Birth': patient.dateOfBirth,
    'Gender': patient.gender,
    'Blood Type': patient.bloodType,
    'Status': patient.status,
    'Total Appointments': patient.totalAppointments
  }));

  return convertToCSV(data);
};

/**
 * Export doctors to CSV
 * @param {Array} doctors - Doctors data
 * @returns {string} CSV content
 */
const exportDoctorsToCSV = (doctors) => {
  const data = doctors.map(doctor => ({
    'Name': doctor.userId?.name || '',
    'Email': doctor.userId?.email || '',
    'Specialization': doctor.specialization,
    'Experience': doctor.experience,
    'Rating': doctor.rating,
    'Status': doctor.status,
    'Total Patients': doctor.totalPatients
  }));

  return convertToCSV(data);
};

module.exports = {
  convertToCSV,
  escapeCSVField,
  downloadCSV,
  exportAppointmentsToCSV,
  exportPatientsToCSV,
  exportDoctorsToCSV
};