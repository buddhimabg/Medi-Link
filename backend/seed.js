// backend/seed.js
// Full test data seed — doctors, patients, appointments, sessions, history, conversations, FAQs
// Run: node seed.js

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
require('dotenv').config();

const User           = require('./models/user');
const Appointment    = require('./models/appointment');
const VideoSession   = require('./models/VideoSession');
const Prescription   = require('./models/Prescription');
const PatientHistory = require('./models/PatientHistory');

const seed = async () => {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected!\n');

  // ── 0) Which doctor account should own this test data? ─────
  // Default: a brand-new "doctor@test.com" test account.
  // Override: run `SEED_DOCTOR_EMAIL=doctor2@test.com node seed.js`
  // to attach all the test data to an EXISTING real doctor account
  // instead (its password is left completely untouched).
  const DOCTOR_EMAIL = process.env.SEED_DOCTOR_EMAIL || 'doctor@test.com';

  // ── 1) Clear old test data ─────────────────────────────────
  console.log('🗑  Clearing old test data...');
  const testEmails = [
    'doctor@test.com',
    'patient1@test.com',
    'patient2@test.com',
    'patient3@test.com',
    'patient4@test.com',
  ];
  // Never delete the account we're actually attaching data to,
  // even if it happens to be one of the default test emails above.
  await User.deleteMany({ email: { $in: testEmails.filter(e => e !== DOCTOR_EMAIL) } });

  const existingTestUsers = await User.find({ email: { $in: testEmails.filter(e => e !== DOCTOR_EMAIL) } });
  const staleIds = existingTestUsers.map(u => u._id.toString());
  if (staleIds.length > 0) {
    await Appointment.deleteMany({ $or: [{ doctorId: { $in: staleIds } }, { patientId: { $in: staleIds } }] });
    await VideoSession.deleteMany({ doctorId: { $in: staleIds } });
    await PatientHistory.deleteMany({ doctorId: { $in: staleIds } });
  }

  const hashedPw = await bcrypt.hash('test1234', 10);

  // ── 2) Resolve the doctor account ──────────────────────────
  console.log(`👨‍⚕️  Resolving doctor account (${DOCTOR_EMAIL})...`);
  let doctor = await User.findOne({ email: DOCTOR_EMAIL, role: 'doctor' });
  if (doctor) {
    console.log(`   ℹ️  Using EXISTING doctor: ${doctor.name} (${doctor._id}) — password left untouched`);
  } else {
    doctor = await User.create({
      name:     'Dr. Dilshari Perera',
      email:    DOCTOR_EMAIL,
      password: hashedPw,
      role:     'doctor',
      mobile:   '0771234567',
      gender:   'Female',
      city:     'Colombo',
      dob:      new Date('1990-01-01'),
    });
    console.log(`   ✅ Created NEW doctor: ${doctor.name} (${doctor._id}) — password: test1234`);
  }

  // ── 3) Create test patients ────────────────────────────────
  console.log('\n👤 Creating patients...');
  const patients = await User.insertMany([
    {
      name: 'Priyanka Jayawardhana', email: 'patient1@test.com',
      password: hashedPw, role: 'patient',
      mobile: '0771111111', gender: 'Female', city: 'Colombo', dob: new Date('1997-03-14'),
    },
    {
      name: 'Ravindra Perera', email: 'patient2@test.com',
      password: hashedPw, role: 'patient',
      mobile: '0772222222', gender: 'Male', city: 'Kandy', dob: new Date('1990-07-22'),
    },
    {
      name: 'Kavindi Gunawardana', email: 'patient3@test.com',
      password: hashedPw, role: 'patient',
      mobile: '0773333333', gender: 'Female', city: 'Galle', dob: new Date('2003-11-02'),
    },
    {
      name: 'Sudarshana Jayakodi', email: 'patient4@test.com',
      password: hashedPw, role: 'patient',
      mobile: '0774444444', gender: 'Male', city: 'Negombo', dob: new Date('1994-05-09'),
    },
  ]);
  patients.forEach(p => console.log(`   ✅ Patient: ${p.name} (${p._id})`));

  const [p1, p2, p3, p4] = patients;
  const doctorId = doctor._id.toString();

  // ── 4) Create appointments (ongoing queue) ─────────────────
  console.log('\n📅 Creating appointments...');
  const now = new Date();

  // Idempotent: clear this doctor's own prior appointments with these
  // 4 test patients before recreating (safe to re-run the script).
  await Appointment.deleteMany({ doctorId, patientId: { $in: [p1._id.toString(), p2._id.toString(), p3._id.toString(), p4._id.toString()] } });

  const appts = await Appointment.insertMany([
    {
      patientId: p1._id.toString(), doctorId,
      notes: 'GAD + MDD follow-up. Anxiety and sleep issues.',
      status: 'ongoing',
      date: new Date(now.getTime() + 0 * 30 * 60000),
    },
    {
      patientId: p2._id.toString(), doctorId,
      notes: 'MDD — medication review.',
      status: 'ongoing',
      date: new Date(now.getTime() + 1 * 30 * 60000),
    },
    {
      patientId: p3._id.toString(), doctorId,
      notes: 'Anxiety disorder — routine check.',
      status: 'ongoing',
      date: new Date(now.getTime() + 2 * 30 * 60000),
    },
    {
      patientId: p4._id.toString(), doctorId,
      notes: 'New medication started — follow-up.',
      status: 'ongoing',
      date: new Date(now.getTime() + 3 * 30 * 60000),
    },
  ]);
  console.log(`   ✅ ${appts.length} appointments created`);

  // ── 5) Create active video session ────────────────────────
  console.log('\n🎥 Creating video session...');
  const sessionId = 'Ce9f8c';
  await VideoSession.deleteMany({ sessionId });

  const session = await VideoSession.create({
    sessionId,
    doctorId,
    patientId:  null,
    roomId:     sessionId,
    status:     'waiting',
    callMetadata: {
      appId:        parseInt(process.env.ZEGO_APP_ID) || 0,
      doctorUserId: `doctor_${doctorId}`,
    },
  });
  console.log(`   ✅ Session: ${session.sessionId} (status: ${session.status})`);

  // ── 6) Create past sessions + prescriptions + history ─────
  console.log('\n📋 Creating past sessions + prescriptions + history...');

  const pastSessions = [
    // P1 (Priyanka) — 3 past sessions
    {
      sessionId: 'HIST_P1_001', patientId: p1._id.toString(),
      moodLabel: 'Improving', moodColor: '#22C55E',
      notes: 'Patient reports reduced panic attacks. Sleep improved. Cortisol trending down. Continue CBT program.',
      duration: 2820, daysAgo: 12,
      meds: [
        { name: 'Sertraline', dose: '75mg',  frequency: 'Once daily', duration: '30 days', withFood: 'Yes' },
        { name: 'Lorazepam',  dose: '0.5mg', frequency: 'As needed',  duration: '14 days', withFood: 'No'  },
      ],
    },
    {
      sessionId: 'HIST_P1_002', patientId: p1._id.toString(),
      moodLabel: 'Moderate', moodColor: '#F59E0B',
      notes: 'Discussed breathing techniques. Patient showing improvement in sleep patterns. Sertraline dose increased.',
      duration: 3120, daysAgo: 33,
      meds: [
        { name: 'Sertraline', dose: '50mg', frequency: 'Once daily', duration: '30 days', withFood: 'Yes' },
      ],
    },
    {
      sessionId: 'HIST_P1_003', patientId: p1._id.toString(),
      moodLabel: 'Poor', moodColor: '#EF4444',
      notes: 'Initial assessment. High anxiety levels noted. Started medication plan. Referred for CBT therapy.',
      duration: 2280, daysAgo: 60,
      meds: [
        { name: 'Sertraline', dose: '25mg', frequency: 'Once daily', duration: '14 days', withFood: 'Yes' },
      ],
    },
    // P2 (Ravindra) — 2 past sessions
    {
      sessionId: 'HIST_P2_001', patientId: p2._id.toString(),
      moodLabel: 'Moderate', moodColor: '#F59E0B',
      notes: 'Low mood and sleep disturbances reported. Fluoxetine showing early signs of improvement.',
      duration: 2400, daysAgo: 15,
      meds: [
        { name: 'Fluoxetine', dose: '20mg', frequency: 'Once daily', duration: '30 days', withFood: 'Yes' },
      ],
    },
    {
      sessionId: 'HIST_P2_002', patientId: p2._id.toString(),
      moodLabel: 'Poor', moodColor: '#EF4444',
      notes: 'First session. Diagnosed with MDD. Started Fluoxetine 20mg.',
      duration: 2700, daysAgo: 45,
      meds: [
        { name: 'Fluoxetine', dose: '20mg', frequency: 'Once daily', duration: '14 days', withFood: 'Yes' },
      ],
    },
    // P3 (Kavindi) — 2 past sessions
    {
      sessionId: 'HIST_P3_001', patientId: p3._id.toString(),
      moodLabel: 'Good', moodColor: '#22C55E',
      notes: 'Significant improvement noted. Anxiety levels reduced. Continue Escitalopram and breathing exercises.',
      duration: 1980, daysAgo: 10,
      meds: [
        { name: 'Escitalopram', dose: '10mg', frequency: 'Once daily', duration: '30 days', withFood: 'Yes' },
      ],
    },
    {
      sessionId: 'HIST_P3_002', patientId: p3._id.toString(),
      moodLabel: 'Moderate', moodColor: '#F59E0B',
      notes: 'Started Escitalopram. Patient anxious but cooperative.',
      duration: 2100, daysAgo: 40,
      meds: [
        { name: 'Escitalopram', dose: '10mg', frequency: 'Once daily', duration: '30 days', withFood: 'Yes' },
      ],
    },
  ];

  for (const s of pastSessions) {
    const sessionDate = new Date(now.getTime() - s.daysAgo * 24 * 60 * 60 * 1000);

    await VideoSession.deleteMany({ sessionId: s.sessionId });
    await VideoSession.create({
      sessionId:    s.sessionId,
      doctorId,
      patientId:    s.patientId,
      roomId:       s.sessionId,
      status:       'ended',
      startedAt:    sessionDate,
      endedAt:      new Date(sessionDate.getTime() + s.duration * 1000),
      duration:     s.duration,
      sessionNotes: s.notes,
      callMetadata: { appId: parseInt(process.env.ZEGO_APP_ID) || 0, doctorUserId: `doctor_${doctorId}` },
    });

    await Prescription.deleteMany({ sessionId: s.sessionId });
    if (s.meds.length > 0) {
      await Prescription.create({
        sessionId:   s.sessionId,
        doctorId,
        patientId:   s.patientId,
        medications: s.meds,
        notes:       s.notes.slice(0, 80),
        issuedAt:    sessionDate,
      });
    }

    await PatientHistory.deleteMany({ sessionId: s.sessionId });
    await PatientHistory.create({
      patientId:   s.patientId,
      sessionId:   s.sessionId,
      doctorId,
      date:        sessionDate,
      duration:    s.duration,
      notes:       s.notes,
      medications: s.meds,
      moodLabel:   s.moodLabel,
      moodColor:   s.moodColor,
    });
  }
  console.log(`   ✅ ${pastSessions.length} past sessions + prescriptions + history created`);

  // ── 7) Create conversations + messages ────────────────────
  console.log('\n💬 Creating conversations + messages...');
  const Conversation = require('./models/Conversation');
  const Message      = require('./models/Message');

  const oldConvs   = await Conversation.find({ doctorId });
  const oldConvIds = oldConvs.map(c => c._id);
  await Message.deleteMany({ conversationId: { $in: oldConvIds } });
  await Conversation.deleteMany({ doctorId });

  const convData = [
    {
      patient: p1,
      messages: [
        { role: 'bot',     text: "Hello Priyanka! I'm your health assistant. Dr. Dilshari is available. How can I help?", mtype: 'ai-auto', confidence: 90 },
        { role: 'patient', text: 'What are the side effects of Sertraline 50mg?' },
        { role: 'bot',     text: 'Common side effects include nausea, headache, dizziness and insomnia especially in the first 2 weeks.', mtype: 'ai-auto', confidence: 88 },
        { role: 'patient', text: "I've been feeling nauseous. Is that normal?" },
        { role: 'doctor',  text: "Hi Priyanka! Yes, mild nausea in the first few weeks is normal. Try taking it with food 😊" },
      ],
    },
    {
      patient: p2,
      messages: [
        { role: 'patient', text: "Can I reschedule tomorrow's session?" },
        { role: 'doctor',  text: "Of course Ravindra. Please call the clinic at 0771234567 to reschedule." },
      ],
    },
    {
      patient: p3,
      messages: [
        { role: 'patient', text: 'Thank you doctor, feeling better!' },
        { role: 'doctor',  text: "That's wonderful to hear Kavindi! Keep up with the breathing exercises 🌟" },
      ],
    },
    {
      patient: p4,
      messages: [
        { role: 'patient', text: 'Doctor, I started the new anxiety medication 3 days ago. I feel more anxious. Is this normal?' },
        { role: 'bot',     text: "It's common to experience increased anxiety in the first 1-2 weeks. This is temporary as your body adjusts.", mtype: 'ai-auto', confidence: 92 },
      ],
    },
  ];

  for (const cd of convData) {
    const lastMsg = cd.messages[cd.messages.length - 1];
    const unread  = cd.messages.filter(m => m.role === 'patient').length > 1 ? 1 : 0;

    const conv = await Conversation.create({
      doctorId,
      patientId:      cd.patient._id.toString(),
      lastMessage:    lastMsg.text.slice(0, 100),
      lastMessageAt:  new Date(),
      lastSenderRole: lastMsg.role,
      unreadCount:    unread,
    });

    for (const m of cd.messages) {
      await Message.create({
        conversationId: conv._id,
        senderId:       m.role === 'doctor' ? doctorId : cd.patient._id.toString(),
        senderRole:     m.role,
        text:           m.text,
        type:           m.mtype || 'normal',
        aiConfidence:   m.confidence || null,
        isRead:         true,
        createdAt:      new Date(Date.now() - Math.random() * 3600000),
      });
    }
    console.log(`   ✅ ${cd.patient.name}: ${cd.messages.length} messages`);
  }

  // ── 8) Create FAQs ─────────────────────────────────────────
  console.log('\n❓ Creating FAQs...');
  const FAQ = require('./models/FAQ');
  await FAQ.deleteMany({ doctorId });

  await FAQ.insertMany([
    {
      doctorId, isActive: true, usageCount: 14, category: 'MEDICATION',
      question: 'What foods should I avoid while taking Sertraline?',
      answer: 'While taking Sertraline, avoid:\n• Alcohol — intensifies drowsiness and side effects\n• Grapefruit — affects drug metabolism\n• Excessive caffeine — worsens anxiety\n• St. Johns Wort — dangerous serotonin interaction',
      keywords: ['sertraline', 'food', 'avoid', 'diet', 'alcohol', 'grapefruit'],
    },
    {
      doctorId, isActive: true, usageCount: 9, category: 'MEDICATION',
      question: 'What are the common side effects of Sertraline?',
      answer: 'Common side effects of Sertraline include:\n• Nausea (especially in the first 2 weeks)\n• Headache and dizziness\n• Insomnia or drowsiness\n• Dry mouth\nThese typically improve after 2-4 weeks. Take with food to reduce nausea.',
      keywords: ['sertraline', 'side effects', 'nausea', 'headache', 'dizziness'],
    },
    {
      doctorId, isActive: true, usageCount: 7, category: 'MENTAL_HEALTH',
      question: 'Is it normal to feel more anxious when starting anxiety medication?',
      answer: 'Yes, it is very common to experience increased anxiety in the first 1-2 weeks of starting anxiety medication. This is a temporary adjustment period. It typically improves significantly after 2-4 weeks of consistent use.',
      keywords: ['anxiety', 'medication', 'worse', 'starting', 'early treatment', 'normal'],
    },
    {
      doctorId, isActive: true, usageCount: 5, category: 'APPOINTMENT',
      question: 'How do I reschedule my appointment?',
      answer: 'To reschedule your appointment:\n1. Call our clinic at 0771234567 (Mon-Fri, 8AM-5PM)\n2. Or email us at appointments@medilink.lk\n3. Please give at least 24 hours notice\nWe will confirm your new appointment within 24 hours.',
      keywords: ['reschedule', 'appointment', 'cancel', 'change', 'book'],
    },
    {
      doctorId, isActive: true, usageCount: 3, category: 'GENERAL',
      question: 'How do I use the MediLink app?',
      answer: 'MediLink allows you to:\n• Join video consultations with your doctor\n• Message your doctor anytime\n• View your prescriptions and session history\n• Access your health records\nSimply log in with your registered email and password.',
      keywords: ['medilink', 'app', 'how to', 'use', 'video call', 'message'],
    },
    {
      doctorId, isActive: false, usageCount: 0, category: 'GENERAL',
      question: 'What is a healthy diet for someone with depression?',
      answer: 'A healthy diet that supports mental health includes:\n• Omega-3 rich foods (salmon, walnuts)\n• Leafy greens and vegetables\n• Whole grains\n• Probiotic foods (yogurt)\n• Limit processed foods and sugar',
      keywords: ['diet', 'depression', 'nutrition', 'food', 'healthy eating'],
    },
  ]);
  console.log('   ✅ 6 FAQs created');

  // ── 9) Summary ─────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 Seed complete!\n');
  console.log('📧 Login credentials:');
  console.log(`   👨‍⚕️  Doctor    → ${doctor.email}  (existing password kept, or "test1234" if newly created)`);
  console.log('   👤 Patient 1 → patient1@test.com / test1234  (Priyanka  - 3 sessions)');
  console.log('   👤 Patient 2 → patient2@test.com / test1234  (Ravindra  - 2 sessions)');
  console.log('   👤 Patient 3 → patient3@test.com / test1234  (Kavindi   - 2 sessions)');
  console.log('   👤 Patient 4 → patient4@test.com / test1234  (Sudarshana - new patient)');
  console.log('\n🎥 Active session:');
  console.log('   URL → http://localhost:5173/video-call/Ce9f8c');
  console.log('\n📅 Queue (4 patients waiting):');
  patients.forEach((p, i) => console.log(`   ${i + 1}. ${p.name}`));
  console.log('\n❓ FAQs: 6 created (5 active, 1 inactive)');
  console.log('═'.repeat(50));

  await mongoose.disconnect();
};

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});