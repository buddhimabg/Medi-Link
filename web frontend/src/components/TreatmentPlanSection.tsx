import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import './TreatmentPlanSection.css';

type GoalStatus = 'Not started' | 'In progress' | 'Achieved' | 'Discontinued';

interface TreatmentGoal {
  text: string;
  status: GoalStatus;
  startDate?: string;
  targetDate?: string;
  interventions?: string[];  // ← Added interventions array
  note?: string;
}

interface TreatmentPlan {
  patientId: number;
  goals: TreatmentGoal[];
  doctorNotes: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  history?: PlanHistory[];
}

interface PlanHistory {
  date: string;
  changes: string[];
}

interface TreatmentPlanSectionProps {
  patientId: number;
  patientName?: string;
  patientMRN?: string;
  patientDOB?: string;
}

const GOAL_STATUS_OPTIONS: GoalStatus[] = ['Not started', 'In progress', 'Achieved', 'Discontinued'];

const createEmptyTreatmentPlan = (patientId: number): TreatmentPlan => ({
  patientId,
  goals: [{ text: '', status: 'Not started', startDate: '', targetDate: '', interventions: [] }],
  doctorNotes: '',
  updatedBy: '',
  history: [],
});

const normalizeTreatmentPlan = (plan: Partial<TreatmentPlan> | null | undefined, patientId: number): TreatmentPlan => ({
  patientId,
  goals: plan?.goals?.length
    ? plan.goals.map(goal => ({
        text: String(goal?.text || ''),
        status: GOAL_STATUS_OPTIONS.includes(goal?.status as GoalStatus) ? (goal?.status as GoalStatus) : 'Not started',
        startDate: String(goal?.startDate || ''),
        targetDate: String(goal?.targetDate || ''),
        interventions: (goal?.interventions || []).map(item => String(item)),
        note: String(goal?.note || ''),
      }))
    : [{ text: '', status: 'Not started', startDate: '', targetDate: '', interventions: [] }],
  doctorNotes: String(plan?.doctorNotes || ''),
  updatedBy: String(plan?.updatedBy || ''),
  createdAt: plan?.createdAt,
  updatedAt: plan?.updatedAt,
  history: plan?.history || [],
});

const TreatmentPlanSection: React.FC<TreatmentPlanSectionProps> = ({ 
  patientId}) => {
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [treatmentForm, setTreatmentForm] = useState<TreatmentPlan>(createEmptyTreatmentPlan(patientId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const fetchTreatmentPlan = async () => {
      setLoading(true);
      setMessage(null);

      try {
        const data = await api.getPatientTreatmentPlan(patientId);
        if (!isActive) return;

        const normalizedPlan = normalizeTreatmentPlan(data, patientId);
        setTreatmentPlan(normalizedPlan);
        setTreatmentForm(normalizedPlan);
      } catch (error) {
        console.error('Failed to fetch treatment plan:', error);
        if (!isActive) return;
        setTreatmentPlan(null);
        setTreatmentForm(createEmptyTreatmentPlan(patientId));
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchTreatmentPlan();

    return () => {
      isActive = false;
    };
  }, [patientId]);

  const getGoals = () => treatmentForm.goals || [];

  const handleTreatmentGoalChange = (index: number, field: keyof TreatmentGoal, value: string) => {
    setTreatmentForm(current => ({
      ...current,
      goals: (current.goals || []).map((goal, goalIndex) =>
        goalIndex === index ? { ...goal, [field]: value } : goal
      ),
    }));
  };

  const showMessage = (text: string, duration: number = 3000) => {
    setMessage(text);
    if (duration > 0) {
        setTimeout(() => {
        setMessage(null);
        }, duration);
    }
  };

  // Handle intervention change inside a goal
  const handleGoalInterventionChange = (goalIndex: number, interventionIndex: number, value: string) => {
    setTreatmentForm(current => ({
      ...current,
      goals: (current.goals || []).map((goal, gIdx) => {
        if (gIdx === goalIndex) {
          const updatedInterventions = [...(goal.interventions || [])];
          updatedInterventions[interventionIndex] = value;
          return { ...goal, interventions: updatedInterventions };
        }
        return goal;
      }),
    }));
  };

  // Add intervention inside a goal
  const handleAddGoalIntervention = (goalIndex: number) => {
    setTreatmentForm(current => ({
      ...current,
      goals: (current.goals || []).map((goal, gIdx) => {
        if (gIdx === goalIndex) {
          return { ...goal, interventions: [...(goal.interventions || []), ''] };
        }
        return goal;
      }),
    }));
  };

  // Remove intervention inside a goal
  const handleRemoveGoalIntervention = (goalIndex: number, interventionIndex: number) => {
    setTreatmentForm(current => ({
      ...current,
      goals: (current.goals || []).map((goal, gIdx) => {
        if (gIdx === goalIndex) {
          const updatedInterventions = (goal.interventions || []).filter((_, i) => i !== interventionIndex);
          return { ...goal, interventions: updatedInterventions };
        }
        return goal;
      }),
    }));
  };

  const handleAddTreatmentGoal = () => {
    setTreatmentForm(current => ({
      ...current,
      goals: [...(current.goals || []), { text: '', status: 'Not started', startDate: '', targetDate: '', interventions: [] }],
    }));
  };

  const handleRemoveTreatmentGoal = (index: number) => {
    setTreatmentForm(current => ({
      ...current,
      goals: (current.goals || []).length > 1 ? (current.goals || []).filter((_, goalIndex) => goalIndex !== index) : current.goals || [],
    }));
  };

  const handleSaveTreatmentPlan = async () => {
    const cleanedGoals = (treatmentForm.goals || [])
        .map(goal => ({
        text: goal.text.trim(),
        status: GOAL_STATUS_OPTIONS.includes(goal.status) ? goal.status : 'Not started',
        startDate: goal.startDate || '',
        targetDate: goal.targetDate || '',
        interventions: (goal.interventions || []).map(item => item.trim()).filter(Boolean),
        note: goal.note || '',
        }))
        .filter(goal => goal.text);

    setSaving(true);
    setMessage(null);

    try {
        const savedPlan = await api.savePatientTreatmentPlan(patientId, {
        goals: cleanedGoals,
        updatedBy: 'Doctor',
        });

        const normalizedPlan = normalizeTreatmentPlan(savedPlan, patientId);
        setTreatmentPlan(normalizedPlan);
        setTreatmentForm(normalizedPlan);
        showMessage('Treatment plan saved successfully.', 3000);
    } catch (error) {
        console.error('Failed to save treatment plan:', error);
        showMessage('Unable to save the treatment plan. Please try again.', 3000);
    } finally {
        setSaving(false);
    }
  };

  const handleCreateNewPlan = () => {
    setTreatmentForm(createEmptyTreatmentPlan(patientId));
    showMessage('New treatment plan created. Add goals and interventions.', 3000);
  };

  const hasTreatmentPlan = Boolean(
    treatmentPlan && (
      (treatmentPlan.goals || []).length > 0 ||
      treatmentPlan.doctorNotes
    )
  );

  if (loading) {
    return (
      <div className="mhos-shell">
        <div className="mhos-loader">Loading treatment plan...</div>
      </div>
    );
  }

  return (
    <div className="mhos-shell">
      {message && (
        <div className={`mhos-notice ${message.includes('saved') ? 'success' : 'info'}`}>
          {message}
        </div>
      )}

      <div className="mhos-main-content">
        {/* Goals & Progress */}
        <section className="mhos-section">
          <div className="mhos-section-header">
            <h3>Goals & Progress</h3>
            <span className="mhos-section-count">
              {getGoals().filter(g => g.text.trim()).length} active
            </span>
          </div>

          <div className="mhos-goals-grid">
            {getGoals().map((goal, index) => (
              <div key={index} className="mhos-goal-card">
                <div className="mhos-goal-header">
                  <input
                    type="text"
                    value={goal.text}
                    onChange={e => handleTreatmentGoalChange(index, 'text', e.target.value)}
                    placeholder="Enter goal"
                    className="mhos-goal-input"
                  />
                  <div className="mhos-goal-actions">
                    <select
                      value={goal.status}
                      onChange={e => handleTreatmentGoalChange(index, 'status', e.target.value)}
                      className={`mhos-status-badge ${goal.status.toLowerCase().replace(' ', '-')}`}
                    >
                      {GOAL_STATUS_OPTIONS.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="mhos-icon-btn-sm"
                      onClick={() => handleRemoveTreatmentGoal(index)}
                      aria-label="Remove goal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mhos-goal-details">
                  <div className="mhos-goal-detail">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={goal.startDate || ''}
                      onChange={e => handleTreatmentGoalChange(index, 'startDate', e.target.value)}
                      className="mhos-input-small"
                    />
                  </div>
                  <div className="mhos-goal-detail">
                    <label>Target Date</label>
                    <input
                      type="date"
                      value={goal.targetDate || ''}
                      onChange={e => handleTreatmentGoalChange(index, 'targetDate', e.target.value)}
                      className="mhos-input-small"
                    />
                  </div>
                </div>

                {/* Interventions inside Goal */}
                <div className="mhos-goal-interventions">
                  <label className="mhos-goal-interventions-label">Interventions for this goal:</label>
                  {(goal.interventions || []).map((intervention, intIndex) => (
                    <div key={intIndex} className="mhos-goal-intervention-row">
                      <input
                        type="text"
                        value={intervention}
                        onChange={e => handleGoalInterventionChange(index, intIndex, e.target.value)}
                        placeholder="Enter intervention for this goal"
                        className="mhos-goal-intervention-input"
                      />
                      <button
                        type="button"
                        className="mhos-icon-btn-sm"
                        onClick={() => handleRemoveGoalIntervention(index, intIndex)}
                        aria-label="Remove intervention"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="mhos-add-goal-intervention-btn"
                    onClick={() => handleAddGoalIntervention(index)}
                  >
                    <Plus size={14} />
                    Add intervention to this goal
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="mhos-add-goal-btn" onClick={handleAddTreatmentGoal}>
            <Plus size={16} />
            Add Goal
          </button>
        </section>
      </div>

      {/* Footer */}
      <div className="mhos-footer">
        <div className="mhos-footer-meta">
          {hasTreatmentPlan && treatmentPlan?.updatedAt 
            ? `Last updated: ${treatmentPlan.updatedAt}` 
            : 'No treatment plan saved yet'}
        </div>
        <div className="mhos-footer-actions">
          <button type="button" className="mhos-btn mhos-btn-secondary" onClick={handleCreateNewPlan}>
            Create New Plan
          </button>
          <button type="button" className="mhos-btn mhos-btn-primary" onClick={handleSaveTreatmentPlan} disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TreatmentPlanSection;