const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const Prescription = require('../models/Prescription');
const Doctor = require('../models/doctor');
const User = require('../models/user');
const { dashedRoundedRect, labelValue, drawSeal } = require('../utils/pdfDraw');

const BRAND_BLUE = '#1e3a8a';
const BRAND_BLUE_LIGHT = '#c7d2fe';
const TEXT_DARK = '#1e293b';
const TEXT_GRAY = '#64748b';

/**
 * Resolves the issuing doctor's display info from their User account id
 * (Prescription.doctorId is always the authenticated doctor's User._id).
 * The User record is the authoritative source for the name — it always
 * exists, since that's who was logged in when the prescription was issued.
 * The Doctor directory record (matched by userId, falling back to email if
 * the link is missing/broken) only enriches with specialty/license info.
 */
const resolveDoctorProfile = async (doctorUserId) => {
  const user = await User.findById(doctorUserId).lean().catch(() => null);

  let doctor = null;
  if (mongoose.Types.ObjectId.isValid(doctorUserId)) {
    doctor = await Doctor.findOne({ userId: new mongoose.Types.ObjectId(doctorUserId) }).lean();
  }
  if (!doctor && user?.email) {
    doctor = await Doctor.findOne({ email: user.email }).lean();
  }

  return {
    name: user?.name || doctor?.name || 'Unknown Doctor',
    specialty: doctor?.specialty || doctor?.specialization || '',
    licenseNumber: doctor?.licenseNumber || '',
    doctorRecordId: doctor?._id ? doctor._id.toString() : null,
    userId: doctorUserId,
  };
};

const calculateAge = (dob) => {
  if (!dob) return null;
  const diffMs = Date.now() - new Date(dob).getTime();
  return Math.abs(new Date(diffMs).getUTCFullYear() - 1970);
};

// GET /api/prescriptions/patient/:patientId
// All prescriptions issued to a patient across every appointment/session,
// newest first, with the issuing doctor's name/specialty attached.
exports.getPatientPrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params;

    const prescriptions = await Prescription.find({ patientId })
      .sort({ issuedAt: -1 })
      .lean();

    const uniqueDoctorIds = [...new Set(prescriptions.map((p) => p.doctorId).filter(Boolean))];
    const doctorInfoById = new Map();
    await Promise.all(
      uniqueDoctorIds.map(async (id) => {
        doctorInfoById.set(id, await resolveDoctorProfile(id));
      })
    );

    const data = prescriptions.map((p) => {
      const info = doctorInfoById.get(p.doctorId);
      return {
        ...p,
        doctorName: info?.name || 'Unknown Doctor',
        doctorSpecialty: info?.specialty || '',
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('getPatientPrescriptions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch prescriptions' });
  }
};

/**
 * Draws the prescription content onto an already-created PDFDocument.
 */
const drawPrescription = (doc, { prescription, doctorInfo, patientUser }) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const marginLeft = 50;
  const marginRight = pageWidth - 50;
  const contentWidth = marginRight - marginLeft;

  // ===== Header bar =====
  doc.rect(0, 0, pageWidth, 90).fill(BRAND_BLUE);
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('PRESCRIPTION', marginLeft, 30);
  doc.fontSize(9).font('Helvetica').fillColor(BRAND_BLUE_LIGHT).text('Medical Prescription', marginLeft, 55);
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
    .text('MediLink', marginLeft, 28, { width: contentWidth, align: 'right' });
  doc.fontSize(8.5).font('Helvetica').fillColor(BRAND_BLUE_LIGHT)
    .text('Your Health, Our Priority', marginLeft, 54, { width: contentWidth, align: 'right' });

  // ===== Doctor identity block =====
  let y = 112;
  doc.font('Helvetica-Bold').fontSize(15).fillColor(TEXT_DARK).text(doctorInfo.name, marginLeft, y);
  y += 20;
  if (doctorInfo.specialty) {
    doc.font('Helvetica').fontSize(10.5).fillColor(TEXT_GRAY).text(doctorInfo.specialty, marginLeft, y);
    y += 16;
  }
  const doctorRefId = (doctorInfo.doctorRecordId || doctorInfo.userId || '').toString().slice(-8).toUpperCase();
  const idLine = [
    doctorInfo.licenseNumber ? `License No: ${doctorInfo.licenseNumber}` : null,
    doctorRefId ? `Doctor ID: DR-${doctorRefId}` : null,
  ].filter(Boolean).join('   |   ');
  if (idLine) {
    doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_GRAY).text(idLine, marginLeft, y);
    y += 14;
  }

  y += 10;
  doc.moveTo(marginLeft, y).lineTo(marginRight, y).strokeColor('#cbd5e0').lineWidth(1).stroke();
  y += 20;

  // ===== Patient info row =====
  const patientBoxH = 46;
  dashedRoundedRect(doc, marginLeft, y, contentWidth, patientBoxH);
  const age = calculateAge(patientUser?.dob);
  const cols = [
    ['Patient Name', patientUser?.name || 'N/A'],
    ['Age', age != null ? `${age} yrs` : 'N/A'],
    ['Sex', patientUser?.gender || 'N/A'],
    ['Date', new Date(prescription.issuedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })],
  ];
  const colWidths = [contentWidth * 0.4, contentWidth * 0.18, contentWidth * 0.18, contentWidth * 0.24];
  let colX = marginLeft;
  cols.forEach(([label, value], i) => {
    doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_GRAY).text(label, colX + 12, y + 10, { width: colWidths[i] - 20 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_DARK).text(value, colX + 12, y + 24, { width: colWidths[i] - 20 });
    colX += colWidths[i];
  });
  y += patientBoxH + 30;

  // ===== Medications =====
  doc.font('Helvetica-Bold').fontSize(13).fillColor(TEXT_DARK).text('Medications', marginLeft, y);
  y += 22;

  if (!prescription.medications || prescription.medications.length === 0) {
    doc.font('Helvetica').fontSize(11).fillColor(TEXT_GRAY).text('No medications listed.', marginLeft, y);
    y += 20;
  } else {
    prescription.medications.forEach((med, index) => {
      doc.font('Helvetica-Bold').fontSize(12).fillColor(TEXT_DARK)
        .text(`${index + 1}. ${med.name} — ${med.dose}`, marginLeft, y, { width: contentWidth });
      y += doc.heightOfString(`${index + 1}. ${med.name} — ${med.dose}`, { width: contentWidth }) + 3;

      const details = [];
      if (med.frequency) details.push(`Frequency: ${med.frequency}`);
      if (med.duration) details.push(`Duration: ${med.duration}`);
      details.push(`With food: ${med.withFood || 'Yes'}`);
      doc.font('Helvetica').fontSize(9.5).fillColor(TEXT_GRAY)
        .text(details.join('   '), marginLeft + 15, y, { width: contentWidth - 15 });
      y += doc.heightOfString(details.join('   '), { width: contentWidth - 15 }) + 12;
    });
  }

  // ===== Notes =====
  if (prescription.notes) {
    y += 8;
    doc.font('Helvetica-Bold').fontSize(12).fillColor(TEXT_DARK).text('Notes', marginLeft, y);
    y += 16;
    doc.font('Helvetica').fontSize(10).fillColor(TEXT_GRAY).text(prescription.notes, marginLeft, y, { width: contentWidth });
    y += doc.heightOfString(prescription.notes, { width: contentWidth }) + 10;
  }

  // ===== Doctor's seal, bottom-right =====
  const sealCx = marginRight - 70;
  const sealCy = pageHeight - 130;
  drawSeal(doc, {
    cx: sealCx, cy: sealCy, r: 55, color: BRAND_BLUE,
    topText: 'MEDILINK VERIFIED',
    bottomText: 'LICENSED PRACTITIONER',
    centerLines: [
      { text: doctorInfo.name, bold: true, size: 8.5 },
      { text: doctorInfo.licenseNumber ? `Lic: ${doctorInfo.licenseNumber}` : `ID: DR-${doctorRefId}`, size: 7 },
    ],
  });

  // ===== Footer: MediLink logo =====
  doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND_BLUE)
    .text('MediLink', marginLeft, pageHeight - 55, { width: contentWidth, align: 'center' });
  doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_GRAY)
    .text('This is a computer-generated prescription issued via the MediLink platform.', marginLeft, pageHeight - 38, {
      width: contentWidth, align: 'center',
    });
};

// GET /api/prescriptions/:id/download
// Streams a PDF of a single prescription.
exports.downloadPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id).lean();
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const [doctorInfo, patientUser] = await Promise.all([
      resolveDoctorProfile(prescription.doctorId),
      prescription.patientId ? User.findById(prescription.patientId).lean().catch(() => null) : Promise.resolve(null),
    ]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${prescription._id}.pdf"`);

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    doc.pipe(res);
    drawPrescription(doc, { prescription, doctorInfo, patientUser });
    doc.end();
  } catch (error) {
    console.error('downloadPrescription error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate prescription PDF' });
  }
};
