const express = require('express');
const router = express.Router();
const Patient = require('../models/treatmentPatientProfile');
const ChronicDisease = require('../models/chronicDisease');
const Medication = require('../models/medication');
const Visit = require('../models/visit');
const Report = require('../models/treatmentReport');
const Script = require('../models/script');
const TreatmentPlan = require('../models/treatmentPlan');

const VALID_GOAL_STATUSES = ['Not started', 'In progress', 'Achieved', 'Discontinued'];

const sanitizeText = value => String(value || '').trim();

const makeIsoNow = () => new Date().toISOString();

const normalizeGoal = goal => ({
    text: sanitizeText(goal?.text || goal?.description || goal?.name),
    startDate: sanitizeText(goal?.startDate || goal?.started),
    targetDate: sanitizeText(goal?.targetDate || goal?.target),
    status: VALID_GOAL_STATUSES.includes(goal?.status) ? goal.status : 'Not started',
    note: sanitizeText(goal?.note || goal?.details || goal?.targetNote),
});

const normalizeIntervention = intervention => ({
    title: sanitizeText(intervention?.title || intervention?.label || intervention?.name || intervention),
    active: intervention?.active !== false,
    details: sanitizeText(intervention?.details || intervention?.description || intervention?.notes),
});

const normalizeHistoryEntry = entry => ({
    date: sanitizeText(entry?.date || entry?.timestamp || makeIsoNow()),
    action: sanitizeText(entry?.action || entry?.title || 'Treatment plan update'),
    detail: sanitizeText(entry?.detail || entry?.description || ''),
});

const normalizeFollowUp = (followUp, fallback = {}) => ({
    nextAppointment: sanitizeText(followUp?.nextAppointment || followUp?.date || fallback.followUpDate),
    timeSlot: sanitizeText(followUp?.timeSlot || fallback.followUpTimeSlot),
    notes: sanitizeText(followUp?.notes || fallback.doctorNotes),
});

const normalizeList = items =>
    (Array.isArray(items) ? items : [])
        .map(item => String(item || '').trim())
        .filter(Boolean);

const normalizeTreatmentPlanRecord = (plan, patientId) => {
    if (!plan) {
        return {
            patientId,
            activePlan: true,
            goals: [],
            interventions: [],
            followUp: { nextAppointment: '', timeSlot: '', notes: '' },
            history: [],
            updatedBy: '',
            createdAt: undefined,
            updatedAt: undefined,
            followUpDate: '',
            followUpTimeSlot: '',
            doctorNotes: '',
        };
    }

    const raw = typeof plan.toObject === 'function' ? plan.toObject() : plan;
    const goals = Array.isArray(raw.goals) ? raw.goals.map(normalizeGoal) : [];
    const interventions = Array.isArray(raw.interventions) ? raw.interventions.map(normalizeIntervention) : [];
    const followUp = normalizeFollowUp(raw.followUp, raw);
    const history = Array.isArray(raw.history) ? raw.history.map(normalizeHistoryEntry) : [];

    return {
        patientId: raw.patientId || patientId,
        activePlan: raw.activePlan !== false,
        goals,
        interventions,
        followUp,
        history,
        updatedBy: sanitizeText(raw.updatedBy),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        followUpDate: followUp.nextAppointment,
        followUpTimeSlot: followUp.timeSlot,
        doctorNotes: followUp.notes,
    };
};

const goalKey = goal => sanitizeText(goal.text).toLowerCase();

const interventionKey = intervention => sanitizeText(intervention.title).toLowerCase();

const buildHistoryEntries = (previousPlan, nextPlan) => {
    const entries = [];
    const now = makeIsoNow();

    if (!previousPlan) {
        entries.push({
            date: now,
            action: 'Initial treatment plan created',
            detail: `Goals: ${nextPlan.goals.length}; interventions: ${nextPlan.interventions.length}`,
        });
        return entries;
    }

    const previousGoals = new Map((previousPlan.goals || []).map(goal => [goalKey(goal), normalizeGoal(goal)]));
    const nextGoals = new Map((nextPlan.goals || []).map(goal => [goalKey(goal), normalizeGoal(goal)]));

    nextGoals.forEach((goal, key) => {
        const existing = previousGoals.get(key);
        if (!existing) {
            entries.push({
                date: now,
                action: 'Goal added',
                detail: `"${goal.text}" added with status ${goal.status}`,
            });
            return;
        }

        const changed =
            existing.status !== goal.status ||
            existing.startDate !== goal.startDate ||
            existing.targetDate !== goal.targetDate ||
            existing.note !== goal.note;

        if (changed) {
            entries.push({
                date: now,
                action: `Goal updated: "${goal.text}"`,
                detail: `Status set to ${goal.status}`,
            });
        }
    });

    previousGoals.forEach((goal, key) => {
        if (!nextGoals.has(key)) {
            entries.push({
                date: now,
                action: 'Goal removed',
                detail: `"${goal.text}" removed from plan`,
            });
        }
    });

    const previousInterventions = new Map((previousPlan.interventions || []).map(item => [interventionKey(item), normalizeIntervention(item)]));
    const nextInterventions = new Map((nextPlan.interventions || []).map(item => [interventionKey(item), normalizeIntervention(item)]));

    nextInterventions.forEach((intervention, key) => {
        const existing = previousInterventions.get(key);
        if (!existing) {
            entries.push({
                date: now,
                action: 'Intervention added',
                detail: intervention.title,
            });
            return;
        }

        const changed = existing.active !== intervention.active || existing.details !== intervention.details;
        if (changed) {
            entries.push({
                date: now,
                action: `Intervention updated: ${intervention.title}`,
                detail: intervention.active ? 'Marked active' : 'Marked inactive',
            });
        }
    });

    previousInterventions.forEach((intervention, key) => {
        if (!nextInterventions.has(key)) {
            entries.push({
                date: now,
                action: 'Intervention removed',
                detail: intervention.title,
            });
        }
    });

    if (entries.length === 0) {
        entries.push({
            date: now,
            action: 'Treatment plan reviewed',
            detail: 'No major plan changes recorded',
        });
    }

    return entries;
};

// ============================================
// GET ALL PATIENTS
// ============================================
router.get('/', async (req, res) => {
    try {
        const patients = await Patient.find().sort({ id: 1 });
        res.json(patients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET PATIENT FULL PROFILE
// ============================================
router.get('/:id/profile', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const patient = await Patient.findOne({ id: patientId });
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const [chronicDiseases, medications, visits, reports, scripts, treatmentPlan] = await Promise.all([
            ChronicDisease.find({ patientId }).sort({ _id: 1 }),
            Medication.find({ patientId }).sort({ _id: 1 }),
            Visit.find({ patientId }).sort({ _id: -1 }),
            Report.find({ patientId }).sort({ _id: -1 }),
            Script.find({ patientId }).sort({ _id: -1 }),
            TreatmentPlan.findOne({ patientId }),
        ]);

        res.json({
            ...patient.toObject(),
            chronicDiseases,
            medications,
            visits,
            reports,
            scripts,
            treatmentPlan: normalizeTreatmentPlanRecord(treatmentPlan, patientId),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET TREATMENT PLAN
// ============================================
router.get('/:id/treatment-plan', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const patient = await Patient.findOne({ id: patientId });
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const treatmentPlan = await TreatmentPlan.findOne({ patientId });
        res.json(normalizeTreatmentPlanRecord(treatmentPlan, patientId));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// UPDATE TREATMENT PLAN
// ============================================
router.put('/:id/treatment-plan', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const patient = await Patient.findOne({ id: patientId });
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const previousPlan = await TreatmentPlan.findOne({ patientId });
        const {
            goals = [],
            interventions = [],
            followUp = {},
            activePlan,
            updatedBy = '',
            followUpDate = '',
            followUpTimeSlot = '',
            doctorNotes = '',
        } = req.body;

        const cleanedGoals = (Array.isArray(goals) ? goals : [])
            .map(normalizeGoal)
            .filter(goal => goal.text);
        const cleanedInterventions = (Array.isArray(interventions) ? interventions : [])
            .map(normalizeIntervention)
            .filter(intervention => intervention.title);
        const cleanedFollowUp = normalizeFollowUp(followUp, { followUpDate, followUpTimeSlot, doctorNotes });
        const nextActivePlan = typeof activePlan === 'boolean' ? activePlan : cleanedGoals.some(goal => goal.status !== 'Discontinued');
        const historyEntries = buildHistoryEntries(previousPlan ? normalizeTreatmentPlanRecord(previousPlan, patientId) : null, {
            goals: cleanedGoals,
            interventions: cleanedInterventions,
        });

        const treatmentPlan = await TreatmentPlan.findOneAndUpdate(
            { patientId },
            {
                $set: {
                    patientId,
                    activePlan: nextActivePlan,
                    goals: cleanedGoals,
                    interventions: cleanedInterventions,
                    followUp: cleanedFollowUp,
                    history: [...(previousPlan?.history || []).map(normalizeHistoryEntry), ...historyEntries],
                    updatedBy: sanitizeText(updatedBy),
                },
            },
            { upsert: true, setDefaultsOnInsert: true, returnDocument: 'after' }
        );

        res.json(normalizeTreatmentPlanRecord(treatmentPlan, patientId));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GET SINGLE PATIENT
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const patient = await Patient.findOne({ id: patientId });
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 🆕 GET PATIENTS BY SLOT ID
// ============================================
router.get('/slot/:slotId', async (req, res) => {
    try {
        const slotId = parseInt(req.params.slotId);
        const patients = await Patient.find({ $or: [{ sessionId: slotId }, { slotId: slotId }] }).sort({ id: 1 });
        res.json(patients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 🆕 ASSIGN PATIENT TO SLOT
// ============================================
router.post('/:id/assign-slot/:slotId', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const slotId = parseInt(req.params.slotId);
        
        const patient = await Patient.findOneAndUpdate(
            { id: patientId },
            { $set: { sessionId: slotId, slotId: slotId } },
            { new: true }
        );
        
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 🆕 REMOVE PATIENT FROM SLOT
// ============================================
router.delete('/:id/remove-slot', async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        const patient = await Patient.findOneAndUpdate(
            { id: patientId },
            { $set: { sessionId: null, slotId: null } },
            { new: true }
        );
        
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;