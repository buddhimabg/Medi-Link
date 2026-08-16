const express = require('express');
const router = express.Router();
const Patient = require('../models/patient');
const TreatmentPlan = require('../models/treatmentPlan');

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizePlanRecord(plan, patient) {
  if (!plan) {
    return {
      patientId: patient.id,
      patientName: patient.name || '',
      mrn: patient.mrn || '',
      dateOfBirth: patient.dob || '',
      primaryDiagnosis: patient.diagnosis || '',
      goals: [],
      status: 'active',
      updatedBy: '',
      createdAt: null,
      updatedAt: null
    };
  }

  return {
    patientId: plan.patientId,
    patientName: plan.patientName || patient.name,
    mrn: plan.mrn || patient.mrn || '',
    dateOfBirth: plan.dateOfBirth || patient.dob || '',
    primaryDiagnosis: plan.primaryDiagnosis || patient.diagnosis || '',
    goals: plan.goals || [],
    status: plan.status || 'active',
    updatedBy: plan.updatedBy || '',
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt
  };
}

function buildPersistedPlan({ patient, previousPlan, body, autoSave = false }) {
  const {
    goals = [],
    updatedBy = 'Doctor'
  } = body;

  // Build the plan
  const plan = {
    patientId: patient.id,
    patientName: patient.name,
    mrn: patient.mrn || '',
    dateOfBirth: patient.dob || '',
    primaryDiagnosis: patient.diagnosis || '',
    goals: goals.map(g => ({
      text: g.text || '',
      status: g.status || 'Not started',
      startDate: g.startDate || '',
      targetDate: g.targetDate || '',
      interventions: g.interventions || [],  // ✅ ADD THIS
      note: g.note || ''
    })),
    status: 'active',
    updatedBy: updatedBy,
    updatedAt: new Date()
  };

  // Preserve createdAt if exists
  if (previousPlan?.createdAt) {
    plan.createdAt = previousPlan.createdAt;
  }

  return plan;
}

async function getPatientOr404(patientId, res) {
  const patient = await Patient.findOne({ id: patientId });
  if (!patient) {
    res.status(404).json({ error: 'Patient not found' });
    return null;
  }
  return patient;
}

async function saveTreatmentPlan(patientId, req, res, autoSave = false) {
  const patient = await getPatientOr404(patientId, res);
  if (!patient) return;

  const previousPlan = await TreatmentPlan.findOne({ patientId });
  const nextPlan = buildPersistedPlan({
    patient,
    previousPlan,
    body: req.body || {},
    autoSave,
  });

  const savedPlan = await TreatmentPlan.findOneAndUpdate(
    { patientId },
    { $set: nextPlan },
    { upsert: true, setDefaultsOnInsert: true, returnDocument: 'after' }
  );

  res.json(normalizePlanRecord(savedPlan, patient));
}

// ============================================
// API ROUTES
// ============================================

// GET - Fetch treatment plan
router.get('/:patientId', async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    const patient = await getPatientOr404(patientId, res);
    if (!patient) return;

    const treatmentPlan = await TreatmentPlan.findOne({ patientId });
    res.json(normalizePlanRecord(treatmentPlan, patient));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Save treatment plan (Manual Save)
router.post('/:patientId', async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    await saveTreatmentPlan(patientId, req, res, false);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Update treatment plan
router.put('/:patientId', async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    await saveTreatmentPlan(patientId, req, res, false);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Auto-save endpoint
router.post('/:patientId/autosave', async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    await saveTreatmentPlan(patientId, req, res, true);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;