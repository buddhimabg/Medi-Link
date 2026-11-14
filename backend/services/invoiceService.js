const PDFDocument = require('pdfkit');
const Appointment = require('../models/appointment');
const Doctor = require('../models/doctor');
const User = require('../models/user');
const { sendEmailNotification } = require('./notificationService');
const { dashedRoundedRect, labelValue, drawSeal } = require('../utils/pdfDraw');

const BRAND_BLUE = '#1e3a8a';
const BRAND_BLUE_LIGHT = '#c7d2fe';
const TEXT_DARK = '#1e293b';
const TEXT_GRAY = '#64748b';
const STAMP_RED = '#dc2626';

const parseSlot = (slot) => {
  const [dateStr, ...timeParts] = (slot || '').split(' ');
  const timeStr = timeParts.join(' ');
  const formattedDate = dateStr
    ? new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'N/A';
  return { formattedDate, timeStr: timeStr || 'N/A' };
};

const formatTxnDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

const formatTxnTime = (date) =>
  date ? new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';

const drawPaidStamp = (doc, cx, cy, r) => {
  drawSeal(doc, {
    cx, cy, r, color: STAMP_RED,
    topText: 'AMOUNT RECEIVED IN FULL',
    bottomText: 'APPROVED AND DELIVERED',
    centerLines: [{ text: 'PAID', bold: true, size: 19 }],
  });
};

/**
 * Draws the invoice content onto an already-created PDFDocument. The caller
 * decides what to do with the stream (pipe to an HTTP response for download,
 * or collect into a Buffer for an email attachment).
 */
const drawInvoice = (doc, { appointment, patientUser, doctor }) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const marginLeft = 50;
  const marginRight = pageWidth - 50;
  const contentWidth = marginRight - marginLeft;

  // ===== Header bar =====
  doc.rect(0, 0, pageWidth, 90).fill(BRAND_BLUE);
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('INVOICE', marginLeft, 30);
  doc.fontSize(9).font('Helvetica').fillColor(BRAND_BLUE_LIGHT).text('Payment Receipt', marginLeft, 55);
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
    .text('MediLink', marginLeft, 28, { width: contentWidth, align: 'right' });
  doc.fontSize(8.5).font('Helvetica').fillColor(BRAND_BLUE_LIGHT)
    .text('Your Health, Our Priority', marginLeft, 54, { width: contentWidth, align: 'right' });

  // ===== Reference strip =====
  let y = 112;
  const refBoxH = 52;
  dashedRoundedRect(doc, marginLeft, y, contentWidth, refBoxH);
  const refId = appointment._id.toString();
  const refCols = [
    ['Reference No', refId.slice(-10).toUpperCase()],
    ['Invoice No', `INV${refId.slice(-6).toUpperCase()}`],
    ['Appointment Date', parseSlot(appointment.slot).formattedDate],
    ['Appointment Time', parseSlot(appointment.slot).timeStr],
  ];
  const colW = contentWidth / 4;
  refCols.forEach(([label, value], i) => {
    const x = marginLeft + colW * i + 12;
    doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_GRAY).text(label, x, y + 10, { width: colW - 20 });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(TEXT_DARK).text(value, x, y + 24, { width: colW - 20 });
  });

  // ===== Hospital/Consultation + Patient details =====
  y += refBoxH + 24;
  const half = contentWidth / 2;
  const gap = 12;
  const leftW = half - gap / 2;
  const rightX = marginLeft + half + gap / 2;
  const rightW = half - gap / 2;

  const leftHeader = appointment.type === 'Physical' ? 'Hospital Details' : 'Consultation Details';
  doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK).text(leftHeader, marginLeft, y);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK).text('Patient Details', rightX, y);
  y += 16;

  const boxH2 = 92;
  dashedRoundedRect(doc, marginLeft, y, leftW, boxH2);
  dashedRoundedRect(doc, rightX, y, rightW, boxH2);

  let ly = y + 14;
  if (appointment.type === 'Physical') {
    labelValue(doc, 'Hospital: ', appointment.hospital || doctor?.hospital || 'N/A', marginLeft + 12, ly);
    labelValue(doc, 'Address: ', doctor?.address || 'N/A', marginLeft + 12, ly + 22);
    labelValue(doc, 'Phone No: ', doctor?.phone || 'N/A', marginLeft + 12, ly + 44);
  } else {
    labelValue(doc, 'Mode: ', 'Virtual Video Consultation', marginLeft + 12, ly);
    labelValue(doc, 'Platform: ', 'MediLink Video Call', marginLeft + 12, ly + 22);
    labelValue(doc, 'Doctor Contact: ', doctor?.phone || 'N/A', marginLeft + 12, ly + 44);
  }

  let ry = y + 14;
  labelValue(doc, 'Name: ', patientUser?.name || 'Patient', rightX + 12, ry);
  labelValue(doc, 'Mobile No: ', patientUser?.mobile || 'N/A', rightX + 12, ry + 22);
  labelValue(doc, 'Email: ', patientUser?.email || 'N/A', rightX + 12, ry + 44);
  labelValue(doc, 'City: ', patientUser?.city || 'N/A', rightX + 12, ry + 66);

  // ===== Appointment details =====
  y += boxH2 + 24;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK).text('Appointment Details', marginLeft, y);
  y += 16;
  const boxH3 = 68;
  dashedRoundedRect(doc, marginLeft, y, contentWidth, boxH3);

  labelValue(
    doc,
    'Doctor Details: ',
    `${doctor?.name || appointment.doctorName} (${(doctor?.specialty || appointment.specialty || '').toUpperCase()})`,
    marginLeft + 14,
    y + 14
  );

  const subColW = contentWidth / 3;
  const txnDate = formatTxnDate(appointment.updatedAt || appointment.createdAt);
  const txnTime = formatTxnTime(appointment.updatedAt || appointment.createdAt);
  const subCols = [
    ['Transaction Date', txnDate],
    ['Transaction Time', txnTime],
    ['Channel through', 'MediLink Web'],
  ];
  subCols.forEach(([label, value], i) => {
    const x = marginLeft + 14 + subColW * i;
    doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_GRAY).text(label, x, y + 42, { width: subColW - 16 });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(TEXT_DARK).text(value, x, y + 54, { width: subColW - 16 });
  });

  // ===== Payment details + PAID stamp =====
  y += boxH3 + 24;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK).text('Payment Details', marginLeft, y);
  y += 20;

  const feeColW = 300;
  const feeRows = [];
  if (appointment.doctorFee != null) feeRows.push(['Doctor Fee', appointment.doctorFee]);
  if (appointment.hospitalFee != null) feeRows.push(['Hospital Fee', appointment.hospitalFee]);
  if (appointment.channelingFee != null) feeRows.push(['Channelling Fee', appointment.channelingFee]);

  let fy = y;
  doc.font('Helvetica').fontSize(10);
  feeRows.forEach(([label, value]) => {
    doc.fillColor(TEXT_GRAY).text(label, marginLeft, fy, { width: feeColW - 100 });
    doc.fillColor(TEXT_DARK).text(`Rs. ${Number(value).toLocaleString()}.00`, marginLeft, fy, { width: feeColW, align: 'right' });
    fy += 18;
  });

  fy += 4;
  doc.moveTo(marginLeft, fy).lineTo(marginLeft + feeColW, fy).strokeColor('#cbd5e0').lineWidth(1).stroke();
  fy += 8;

  doc.rect(marginLeft, fy, feeColW, 26).fill('#eff6ff');
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(BRAND_BLUE).text('Total Fee', marginLeft + 10, fy + 7);
  doc.fillColor(BRAND_BLUE).text(`Rs. ${Number(appointment.amount).toLocaleString()}.00`, marginLeft, fy + 7, {
    width: feeColW - 10, align: 'right',
  });
  fy += 26;

  const stampCx = marginLeft + feeColW + 106;
  const stampCy = y + 60;
  drawPaidStamp(doc, stampCx, stampCy, 52);

  y = Math.max(fy, stampCy + 52) + 20;

  // ===== Refund note =====
  doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(TEXT_GRAY)
    .text(
      'Please note: cancellations made less than 24 hours before the appointment time are not eligible for a refund. ' +
      'For all other cancellations, please contact MediLink support.',
      marginLeft, y, { width: contentWidth }
    );
  y += 24;

  // ===== Terms and Conditions =====
  doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_DARK).text('Terms and Conditions', marginLeft, y);
  y += 14;
  const terms = [
    'Your booking is confirmed. You will receive a confirmation email with this invoice attached.',
    'Please show this invoice (printed or on your phone) at the hospital reception counter.',
    appointment.type === 'Physical'
      ? 'Please arrive at least 15 minutes before your scheduled appointment time.'
      : 'Please join the video call from the MediLink app at least 5 minutes before your scheduled time.',
    'The appointment time shown is approximate and may vary depending on the doctor\'s schedule.',
    'If the doctor or hospital cancels the appointment, you may reschedule or request a refund as per MediLink policy.',
    'MediLink is not liable for any loss or inconvenience caused by a doctor cancelling or rescheduling an appointment.',
  ];
  doc.font('Helvetica').fontSize(7.8).fillColor(TEXT_GRAY);
  terms.forEach((t) => {
    doc.text(`•  ${t}`, marginLeft, y, { width: contentWidth });
    y += doc.heightOfString(`•  ${t}`, { width: contentWidth }) + 3;
  });

  // ===== Footer bar =====
  doc.rect(0, pageHeight - 46, pageWidth, 46).fill(BRAND_BLUE);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff')
    .text('Wishing you Good Health!', marginLeft, pageHeight - 32, { width: contentWidth, align: 'center' });
};

/**
 * Builds the invoice PDF for an appointment and returns it as a Buffer.
 */
const generateInvoiceBuffer = async (appointment) => {
  const [patientUser, doctor] = await Promise.all([
    User.findById(appointment.userId).lean().catch(() => null),
    Doctor.findById(appointment.doctorId).lean().catch(() => null),
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawInvoice(doc, { appointment, patientUser, doctor });
    doc.end();
  });
};

/**
 * Streams the invoice PDF directly to an HTTP response (used by the
 * download-invoice endpoint).
 */
const streamInvoiceToResponse = async (appointment, res) => {
  const [patientUser, doctor] = await Promise.all([
    User.findById(appointment.userId).lean().catch(() => null),
    Doctor.findById(appointment.doctorId).lean().catch(() => null),
  ]);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${appointment._id}.pdf"`);

  const doc = new PDFDocument({ margin: 0, size: 'A4' });
  doc.pipe(res);
  drawInvoice(doc, { appointment, patientUser, doctor });
  doc.end();
};

/**
 * Emails the invoice (with PDF attached) for a Physical appointment once
 * payment is confirmed. No-op for Virtual appointments. Never throws — a
 * failed email shouldn't block the booking/payment flow.
 */
const sendPhysicalInvoiceEmail = async (appointmentId) => {
  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment || appointment.type !== 'Physical') return;

    const patientUser = await User.findById(appointment.userId).lean();
    if (!patientUser?.email) return;

    const pdfBuffer = await generateInvoiceBuffer(appointment);
    const { formattedDate, timeStr } = parseSlot(appointment.slot);

    const html = `
      <h2>Appointment Confirmed</h2>
      <p>Dear ${patientUser.name || 'Patient'},</p>
      <p>Your physical appointment has been confirmed and paid successfully. Details:</p>
      <ul>
        <li><strong>Doctor:</strong> ${appointment.doctorName}</li>
        <li><strong>Specialty:</strong> ${appointment.specialty}</li>
        ${appointment.hospital ? `<li><strong>Hospital:</strong> ${appointment.hospital}</li>` : ''}
        <li><strong>Date:</strong> ${formattedDate}</li>
        <li><strong>Time:</strong> ${timeStr}</li>
        <li><strong>Amount Paid:</strong> Rs. ${Number(appointment.amount).toLocaleString()}.00</li>
      </ul>
      <p>Your invoice is attached to this email for your records.</p>
      <p>Best regards,<br>MediLink Team</p>
    `;

    await sendEmailNotification(patientUser.email, 'MediLink - Appointment Confirmation & Invoice', html, [
      {
        filename: `invoice-${appointment._id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ]);
  } catch (err) {
    console.error('sendPhysicalInvoiceEmail error:', err);
  }
};

module.exports = {
  generateInvoiceBuffer,
  streamInvoiceToResponse,
  sendPhysicalInvoiceEmail,
};
