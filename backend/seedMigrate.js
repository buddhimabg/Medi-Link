// backend/seedMigrate.js
// Migrates old medi-link-db messages → new Conversation + Message schema
// Also seeds doctors, patients, FAQs, appointments, video sessions
// Run: node seedMigrate.js

const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');
require('dotenv').config();

const User           = require('./src/models/User');
const Appointment    = require('./src/models/appointment');
const VideoSession   = require('./src/models/VideoSession');
const Prescription   = require('./src/models/Prescription');
const PatientHistory = require('./src/models/PatientHistory');
const Conversation   = require('./src/models/Conversation');
const Message        = require('./src/models/Message');
const FAQ            = require('./src/models/FAQ');

const run = async () => {
  console.log('Connecting to medi-link-db...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected!\n');

  const hashedPw = await bcrypt.hash('test1234', 10);

  // ── 1) Clear existing test data ──────────────────────────────
  console.log('Clearing old test data...');
  const testEmails = ['doctor@test.com','patient1@test.com','patient2@test.com','patient3@test.com','patient4@test.com'];
  const oldUsers   = await User.find({ email: { $in: testEmails } });
  const oldIds     = oldUsers.map(u => u._id.toString());
  if (oldIds.length > 0) {
    const oldConvs   = await Conversation.find({ doctorId: { $in: oldIds } });
    const oldConvIds = oldConvs.map(c => c._id);
    await Message.deleteMany({ conversationId: { $in: oldConvIds } });
    await Conversation.deleteMany({ doctorId: { $in: oldIds } });
    await Appointment.deleteMany({ $or: [{ doctorId: { $in: oldIds } }, { patientId: { $in: oldIds } }] });
    await VideoSession.deleteMany({ doctorId: { $in: oldIds } });
    await PatientHistory.deleteMany({ doctorId: { $in: oldIds } });
    await FAQ.deleteMany({ doctorId: { $in: oldIds } });
  }
  await User.deleteMany({ email: { $in: testEmails } });

  // ── 2) Create doctor ─────────────────────────────────────────
  console.log('Creating doctor...');
  const doctor = await User.create({
    name: 'Dr. Dilshari Perera', email: 'doctor@test.com',
    password: hashedPw, role: 'doctor', phone: '0771234567',
  });
  console.log(`  Doctor: ${doctor.name} (${doctor._id})`);
  const doctorId = doctor._id.toString();

  // ── 3) Create patients ────────────────────────────────────────
  console.log('Creating patients...');
  const patients = await User.insertMany([
    { name: 'Priyanka Jayawardhana', email: 'patient1@test.com', password: hashedPw, role: 'patient', phone: '0771111111', age: 28, bloodType: 'O+' },
    { name: 'Ravindra Perera',       email: 'patient2@test.com', password: hashedPw, role: 'patient', phone: '0772222222', age: 35, bloodType: 'A+' },
    { name: 'Kavindi Gunawardana',   email: 'patient3@test.com', password: hashedPw, role: 'patient', phone: '0773333333', age: 22, bloodType: 'B+' },
    { name: 'Sudarshana Jayakodi',   email: 'patient4@test.com', password: hashedPw, role: 'patient', phone: '0774444444', age: 31, bloodType: 'O-' },
  ]);
  const [p1, p2, p3, p4] = patients;
  patients.forEach(p => console.log(`  Patient: ${p.name}`));

  // ── 4) Create appointments ────────────────────────────────────
  console.log('\nCreating appointments...');
  const now = new Date();
  await Appointment.insertMany([
    { patientId: p1._id.toString(), doctorId, notes: 'GAD + MDD follow-up.', status: 'ongoing', date: new Date(now.getTime() + 0 * 30 * 60000) },
    { patientId: p2._id.toString(), doctorId, notes: 'MDD medication review.', status: 'ongoing', date: new Date(now.getTime() + 1 * 30 * 60000) },
    { patientId: p3._id.toString(), doctorId, notes: 'Anxiety disorder check.', status: 'ongoing', date: new Date(now.getTime() + 2 * 30 * 60000) },
    { patientId: p4._id.toString(), doctorId, notes: 'New medication follow-up.', status: 'ongoing', date: new Date(now.getTime() + 3 * 30 * 60000) },
  ]);
  console.log('  4 appointments created');

  // ── 5) Create active video session ───────────────────────────
  console.log('\nCreating video session...');
  await VideoSession.deleteMany({ sessionId: 'Ce9f8c' });
  await VideoSession.create({
    sessionId: 'Ce9f8c', doctorId, patientId: null,
    roomId: 'Ce9f8c', status: 'waiting',
    callMetadata: { appId: parseInt(process.env.ZEGO_APP_ID) || 0, doctorUserId: `doctor_${doctorId}` },
  });
  console.log('  Session Ce9f8c created');

  // ── 6) Past sessions + history ───────────────────────────────
  console.log('\nCreating past sessions + history...');
  const pastSessions = [
    { sessionId: 'HIST_P1_001', patientId: p1._id.toString(), moodLabel: 'Improving', moodColor: '#22C55E', notes: 'Patient reports reduced panic attacks. Sleep improved. Continue CBT program.', duration: 2820, daysAgo: 12, meds: [{ name: 'Sertraline', dose: '75mg', frequency: 'Once daily', duration: '30 days', withFood: 'Yes' }] },
    { sessionId: 'HIST_P1_002', patientId: p1._id.toString(), moodLabel: 'Moderate',  moodColor: '#F59E0B', notes: 'Discussed breathing techniques. Sleep improving. Sertraline dose increased.', duration: 3120, daysAgo: 33, meds: [{ name: 'Sertraline', dose: '50mg', frequency: 'Once daily', duration: '30 days', withFood: 'Yes' }] },
    { sessionId: 'HIST_P2_001', patientId: p2._id.toString(), moodLabel: 'Moderate',  moodColor: '#F59E0B', notes: 'Low mood and sleep disturbances. Fluoxetine showing early improvement.', duration: 2400, daysAgo: 15, meds: [{ name: 'Fluoxetine', dose: '20mg', frequency: 'Once daily', duration: '30 days', withFood: 'Yes' }] },
    { sessionId: 'HIST_P3_001', patientId: p3._id.toString(), moodLabel: 'Good',      moodColor: '#22C55E', notes: 'Significant improvement. Anxiety reduced. Continue Escitalopram.', duration: 1980, daysAgo: 10, meds: [{ name: 'Escitalopram', dose: '10mg', frequency: 'Once daily', duration: '30 days', withFood: 'Yes' }] },
  ];
  for (const s of pastSessions) {
    const d = new Date(now.getTime() - s.daysAgo * 86400000);
    await VideoSession.deleteMany({ sessionId: s.sessionId });
    await VideoSession.create({ sessionId: s.sessionId, doctorId, patientId: s.patientId, roomId: s.sessionId, status: 'ended', startedAt: d, endedAt: new Date(d.getTime() + s.duration * 1000), duration: s.duration, sessionNotes: s.notes, callMetadata: { appId: 0, doctorUserId: `doctor_${doctorId}` } });
    await Prescription.deleteMany({ sessionId: s.sessionId });
    await Prescription.create({ sessionId: s.sessionId, doctorId, patientId: s.patientId, medications: s.meds, notes: s.notes.slice(0, 80), issuedAt: d });
    await PatientHistory.deleteMany({ sessionId: s.sessionId });
    await PatientHistory.create({ patientId: s.patientId, sessionId: s.sessionId, doctorId, date: d, duration: s.duration, notes: s.notes, medications: s.meds, moodLabel: s.moodLabel, moodColor: s.moodColor });
  }
  console.log(`  ${pastSessions.length} past sessions created`);

  // ── 7) Conversations + Messages (NEW SCHEMA) ─────────────────
  // This is the key part — creates proper Conversation + Message documents
  // matching the backend's new schema (conversationId, senderRole, text)
  console.log('\nCreating conversations + messages...');

  const convData = [
    {
      patient: p1,
      msgs: [
        { role: 'bot',    text: "Hello Priyanka! I'm your health assistant. Dr. Dilshari is available. How can I help?", mtype: 'ai-auto', conf: 90 },
        { role: 'patient', text: 'What are my medication side effects?' },
        { role: 'bot',    text: 'Common side effects of Sertraline include nausea, headache, and mild dizziness in the first 2 weeks.', mtype: 'faq', conf: 88 },
        { role: 'patient', text: "I've been feeling nauseous. Is that normal?" },
        { role: 'doctor',  text: "Hi Priyanka! Yes, mild nausea in the first few weeks is normal. Take it with food 😊" },
      ],
    },
    {
      patient: p2,
      msgs: [
        { role: 'patient', text: "Can I reschedule tomorrow's session?" },
        { role: 'doctor',  text: "Of course Ravindra. Please call the clinic at 0771234567 to reschedule." },
      ],
    },
    {
      patient: p3,
      msgs: [
        { role: 'patient', text: 'Thank you doctor, feeling better!' },
        { role: 'doctor',  text: "That's wonderful to hear Kavindi! Keep up with the breathing exercises 🌟" },
      ],
    },
    {
      patient: p4,
      msgs: [
        { role: 'patient', text: 'I started the new anxiety medication 3 days ago. I feel more anxious. Is this normal?' },
        { role: 'bot',    text: "It's common to experience increased anxiety in the first 1-2 weeks. This is temporary.", mtype: 'ai-auto', conf: 92 },
      ],
    },
  ];

  for (const cd of convData) {
    const lastMsg  = cd.msgs[cd.msgs.length - 1];
    const unread   = cd.msgs.filter(m => m.role === 'patient').length > 1 ? 1 : 0;
    const baseTime = Date.now() - 3600000;

    const conv = await Conversation.create({
      doctorId,
      patientId:      cd.patient._id.toString(),
      lastMessage:    lastMsg.text.slice(0, 100),
      lastMessageAt:  new Date(),
      lastSenderRole: lastMsg.role,
      unreadCount:    unread,
    });

    for (let i = 0; i < cd.msgs.length; i++) {
      const m = cd.msgs[i];
      await Message.create({
        conversationId: conv._id,
        senderId:       m.role === 'doctor' ? doctorId : m.role === 'bot' ? `bot_${doctorId}` : cd.patient._id.toString(),
        senderRole:     m.role,
        text:           m.text,
        type:           m.mtype || 'normal',
        aiConfidence:   m.conf  || null,
        isRead:         true,
        createdAt:      new Date(baseTime + i * 120000),
      });
    }
    console.log(`  ${cd.patient.name}: ${cd.msgs.length} messages`);
  }

  // ── 8) FAQs ───────────────────────────────────────────────────
  console.log('\nCreating FAQs...');
  await FAQ.insertMany([
    { doctorId, isActive: true,  usageCount: 14, category: 'MEDICATION',    question: 'What foods should I avoid while taking Sertraline?', answer: 'Avoid alcohol, grapefruit, excessive caffeine, and St. Johns Wort while taking Sertraline.', keywords: ['sertraline', 'food', 'avoid', 'diet', 'alcohol'] },
    { doctorId, isActive: true,  usageCount: 9,  category: 'MEDICATION',    question: 'What are the common side effects of Sertraline?', answer: 'Common side effects include nausea, headache, dizziness and insomnia — especially in the first 2 weeks. Take with food.', keywords: ['sertraline', 'side effects', 'nausea', 'headache'] },
    { doctorId, isActive: true,  usageCount: 7,  category: 'MENTAL_HEALTH', question: 'Is it normal to feel more anxious when starting anxiety medication?', answer: 'Yes, increased anxiety in the first 1-2 weeks is common and temporary. It typically improves after 2-4 weeks.', keywords: ['anxiety', 'medication', 'worse', 'starting', 'normal'] },
    { doctorId, isActive: true,  usageCount: 5,  category: 'APPOINTMENT',   question: 'How do I reschedule my appointment?', answer: 'Call our clinic at 0771234567 (Mon-Fri 8AM-5PM) or email appointments@medilink.lk. Please give 24 hours notice.', keywords: ['reschedule', 'appointment', 'cancel', 'change'] },
    { doctorId, isActive: true,  usageCount: 3,  category: 'GENERAL',       question: 'How do I use the MediLink app?', answer: 'MediLink lets you join video consultations, message your doctor, and view your health records. Login with your registered email.', keywords: ['medilink', 'app', 'how to', 'use', 'video'] },
    { doctorId, isActive: false, usageCount: 0,  category: 'GENERAL',       question: 'What is a healthy diet for someone with depression?', answer: 'Include omega-3 rich foods, leafy greens, whole grains, and probiotic foods. Limit processed foods and sugar.', keywords: ['diet', 'depression', 'nutrition', 'food'] },
  ]);
  console.log('  6 FAQs created');

  // ── 9) Summary ────────────────────────────────────────────────
  console.log('\n' + '='.repeat(55));
  console.log('Migration complete!\n');
  console.log('Login credentials:');
  console.log('  Doctor    -> doctor@test.com    / test1234');
  console.log('  Patient 1 -> patient1@test.com  / test1234  (Priyanka)');
  console.log('  Patient 2 -> patient2@test.com  / test1234  (Ravindra)');
  console.log('  Patient 3 -> patient3@test.com  / test1234  (Kavindi)');
  console.log('  Patient 4 -> patient4@test.com  / test1234  (Sudarshana)');
  console.log('\nActive video session:');
  console.log('  URL -> http://localhost:5173/video-call/Ce9f8c');
  console.log('='.repeat(55));

  await mongoose.disconnect();
};

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});