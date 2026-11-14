// src/pages/VideoCall/PrescriptionMode.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { Medication, NewMedication } from '../../types/videoCall'
import styles from './PrescriptionMode.module.css'

interface Props {
  duration:         number
  formatDuration:   (s: number) => string
  medications:      Medication[]
  removeMedication: (id: number) => void
  newMed:           NewMedication
  setNewMed:        (v: NewMedication) => void
  onAddMed:         () => void
  rxNotes:          string
  setRxNotes:       (v: string) => void
  onIssue:          () => void
  rxSaved:          boolean
  onEnd:            () => void
  onBack:           () => void
}

// Curated common-medicine list for the autocomplete. Not exhaustive —
// the doctor can still type any name; this just speeds up the common cases
// and helps avoid typos.
const MEDICINE_LIST = [
  'Sertraline', 'Escitalopram', 'Fluoxetine', 'Paroxetine', 'Citalopram',
  'Venlafaxine', 'Duloxetine', 'Bupropion', 'Mirtazapine', 'Trazodone',
  'Alprazolam', 'Diazepam', 'Lorazepam', 'Clonazepam', 'Buspirone',
  'Quetiapine', 'Risperidone', 'Olanzapine', 'Aripiprazole', 'Lithium',
  'Lamotrigine', 'Valproate', 'Carbamazepine', 'Propranolol', 'Hydroxyzine',
  'Zolpidem', 'Melatonin', 'Methylphenidate', 'Atomoxetine', 'Amitriptyline',
  'Paracetamol', 'Ibuprofen', 'Aspirin', 'Amoxicillin', 'Azithromycin',
  'Omeprazole', 'Metformin', 'Amlodipine', 'Atorvastatin', 'Losartan',
  'Cetirizine', 'Loratadine', 'Salbutamol', 'Prednisolone', 'Vitamin D3',
]

// Dosage validation — expects a number followed by a recognised unit,
// within a sane clinical range so obvious typos (like "5000mg") are
// rejected before they can be added to a prescription.
const DOSE_PATTERN = /^(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml)$/i
const DOSE_RANGE: Record<string, [number, number]> = {
  mg:  [0.01, 2000],
  mcg: [1, 2000],
  g:   [0.01, 10],
  ml:  [0.1, 500],
}

function validateDose(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return 'Dosage is required'
  const match = trimmed.match(DOSE_PATTERN)
  if (!match) return 'Use a number + unit, e.g. 0.25mg, 500mg, 5ml'
  const value = parseFloat(match[1])
  const unit  = match[2].toLowerCase()
  const [min, max] = DOSE_RANGE[unit]
  if (value < min || value > max) return `${unit} dose should be between ${min} and ${max}${unit}`
  return null
}

// Frequency — fixed list only, no free text (stops things like "3ce a week"
// or blank/garbled entries from reaching a prescription).
const FREQUENCY_OPTIONS = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
  'Once weekly', 'As needed (PRN)', 'At bedtime', 'Before meals', 'After meals',
]

// Duration — expects a number + days/weeks/months, within a sane range
// so nobody can accidentally prescribe "999999 days" of anything.
const DURATION_PATTERN = /^(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months)$/i
const DURATION_RANGE: Record<string, [number, number]> = {
  day:    [1, 90],
  days:   [1, 90],
  week:   [1, 26],
  weeks:  [1, 26],
  month:  [1, 12],
  months: [1, 12],
}

function validateDuration(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return 'Duration is required'
  const match = trimmed.match(DURATION_PATTERN)
  if (!match) return 'Use a number + unit, e.g. 7 days, 2 weeks, 1 month'
  const value = parseFloat(match[1])
  const unit  = match[2].toLowerCase()
  const [min, max] = DURATION_RANGE[unit]
  if (value < min || value > max) return `Should be between ${min} and ${max} ${unit}`
  return null
}

const PrescriptionMode: React.FC<Props> = ({
  duration, formatDuration,
  medications, removeMedication,
  newMed, setNewMed, onAddMed,
  rxNotes, setRxNotes,
  onIssue, rxSaved, onEnd, onBack,
}) => {
  const f = (k: keyof NewMedication, v: string) =>
    setNewMed({ ...newMed, [k]: v })

  // ── Medicine name autocomplete — MUST select from the list ──
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const nameWrapRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    const q = newMed.name.trim().toLowerCase()
    if (!q) return []
    return MEDICINE_LIST.filter(m => m.toLowerCase().startsWith(q)).slice(0, 8)
  }, [newMed.name])

  // Only names that exactly match an entry in MEDICINE_LIST (picked from
  // the dropdown, or typed to an exact match) are accepted — this stops
  // gibberish like "parabhfdijeemlr" from being addable to a prescription.
  const isKnownMedicine = (name: string) =>
    MEDICINE_LIST.some(m => m.toLowerCase() === name.trim().toLowerCase())

  const nameError = nameTouched && newMed.name.trim() && !isKnownMedicine(newMed.name)
    ? 'Please select a medicine from the suggestions list'
    : nameTouched && !newMed.name.trim()
      ? 'Medicine name is required'
      : null

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (nameWrapRef.current && !nameWrapRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Dosage validation ────────────────────────────────────────
  const [doseTouched, setDoseTouched] = useState(false)
  const doseError = doseTouched ? validateDose(newMed.dose) : null

  // ── Duration validation ──────────────────────────────────────
  const [durationTouched, setDurationTouched] = useState(false)
  const durationError = durationTouched ? validateDuration(newMed.duration) : null

  // Medicine name, dosage AND duration must all be valid before "+ Add" can
  // be used — evaluated live, not just after the fields have been touched,
  // so the button can never be clicked in an invalid state. Frequency is a
  // fixed dropdown so it's always valid by construction.
  const canAdd = isKnownMedicine(newMed.name) && !validateDose(newMed.dose)
    && !validateDuration(newMed.duration) && newMed.frequency.trim() !== ''

  const handleAddClick = () => {
    setNameTouched(true)
    setDoseTouched(true)
    setDurationTouched(true)
    if (!canAdd) return
    onAddMed()
    setNameTouched(false)
    setDoseTouched(false)
    setDurationTouched(false)
  }

  return (
    <>
      {/* Topbar */}
      <header className={styles.topbar}>
        {/* ── Back Button ── */}
        <button className={styles.backBtn} onClick={onBack} title="Back to Live Call">
          ← Back
        </button>
        <div className={styles.logo}><span>Medi</span>Link</div>
        <div className={styles.livePill}><div className={styles.liveDot}/><span className={styles.liveText}>LIVE</span></div>
        <div className={styles.timer}>{formatDuration(duration)}</div>
        <span className={styles.badgePurple}>💊 Prescription Mode</span>
        <div className={styles.topbarRight}>
          <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnPill} ${styles.btnSm}`} onClick={onEnd}>⏹ End</button>
        </div>
      </header>

      <div className={styles.wrap}>
        {/* Mini video side */}
        <div className={styles.videoSide}>
          <div className={`${styles.videoDark} ${styles.videoArea}`}>
            <div className={styles.avatar}>P</div>
            <div className={styles.patientName}>Priyanka Jayawardhana</div>
            <span className={styles.badgeGreen}>● Connected</span>
            <div className={styles.rxNotice}>Patient sees a notice that prescription is being written.</div>
            <div className={styles.selfPip}><div className={styles.selfPipAvatar}>Dr</div></div>
          </div>
          <div className={styles.miniControls}>
            <button className={styles.ctrlNeutral}>🎤</button>
            <button className={styles.ctrlCamOn}>📹</button>
            <button className={styles.ctrlEnd} onClick={onEnd}>📞</button>
          </div>
        </div>

        {/* Rx panel */}
        <div className={styles.rxPanel}>
          <div className={styles.rxHeader}>
            <span className={styles.rxHeaderIcon}>💊</span>
            <div>
              <div className={styles.rxTitle}>e-Prescription</div>
              <div className={styles.rxSub}>Priyanka Jayawardhana · #P-3af301</div>
            </div>
            <span className={styles.badgeBlue} style={{ marginLeft: 'auto' }}>Session Rx</span>
          </div>

          <div className={styles.rxBody}>
            {/* Observation */}
            <div>
              <div className={styles.sectionTitle}>Observation / Diagnosis</div>
              <div className={styles.obsBox}>
                GAD with improving symptoms. Cortisol still elevated. Adjusted Sertraline dose. Continue CBT program.
              </div>
            </div>

            {/* Medications already added to THIS prescription */}
            <div>
              <div className={styles.sectionTitle}>Prescribed Medications</div>
              {medications.length === 0 && (
                <div style={{ fontSize: 12, color: '#9CA3AF', padding: '6px 0' }}>
                  No medications added yet — use the form below.
                </div>
              )}
              {medications.map(m => (
                <div key={m.id} className={styles.medItem}>
                  <span className={styles.medIcon}>💊</span>
                  <div className={styles.medInfo}>
                    <div className={styles.medName}>{m.name}</div>
                    <div className={styles.medDose}>{m.dose} · {m.frequency} · {m.duration}</div>
                  </div>
                  <button className={styles.removeBtn} onClick={() => removeMedication(m.id)}>✕</button>
                </div>
              ))}
            </div>

            {/* Add new med form */}
            <div className={styles.addForm}>
              <div className={styles.sectionTitle}>New Medication</div>

              <div className={styles.formGroup} ref={nameWrapRef} style={{ position: 'relative' }}>
                <label className={styles.label}>Medicine Name</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Alprazolam"
                  value={newMed.name}
                  onChange={e => { f('name', e.target.value); setShowSuggestions(true); setNameTouched(false) }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setNameTouched(true)}
                  autoComplete="off"
                  style={nameError ? { borderColor: '#DC2626' } : undefined}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                    background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 8,
                    marginTop: 4, boxShadow: '0 4px 14px rgba(0,0,0,0.08)', maxHeight: 200, overflowY: 'auto',
                  }}>
                    {suggestions.map(name => (
                      <div
                        key={name}
                        onClick={() => { f('name', name); setShowSuggestions(false); setNameTouched(false) }}
                        style={{ padding: '8px 12px', fontSize: 12.5, cursor: 'pointer' }}
                        onMouseDown={e => e.preventDefault()}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        💊 {name}
                      </div>
                    ))}
                  </div>
                )}
                {showSuggestions && newMed.name.trim() && suggestions.length === 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                    background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 8,
                    marginTop: 4, padding: '8px 12px', fontSize: 12, color: '#9CA3AF',
                  }}>
                    No match — pick from the list, we don't accept free-text medicine names.
                  </div>
                )}
                {nameError && (
                  <div style={{ fontSize: 10.5, color: '#DC2626', marginTop: 3 }}>{nameError}</div>
                )}
              </div>

              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>Dosage</label>
                  <input
                    className={styles.input}
                    placeholder="e.g. 0.25mg"
                    value={newMed.dose}
                    onChange={e => f('dose', e.target.value)}
                    onBlur={() => setDoseTouched(true)}
                    style={doseError ? { borderColor: '#DC2626' } : undefined}
                  />
                  {doseError && (
                    <div style={{ fontSize: 10.5, color: '#DC2626', marginTop: 3 }}>{doseError}</div>
                  )}
                </div>
                <div>
                  <label className={styles.label}>Frequency</label>
                  <select className={styles.select}
                    value={newMed.frequency} onChange={e => f('frequency', e.target.value)}>
                    <option value="">Select…</option>
                    {FREQUENCY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>Duration</label>
                  <input
                    className={styles.input}
                    placeholder="e.g. 14 days"
                    value={newMed.duration}
                    onChange={e => f('duration', e.target.value)}
                    onBlur={() => setDurationTouched(true)}
                    style={durationError ? { borderColor: '#DC2626' } : undefined}
                  />
                  {durationError && (
                    <div style={{ fontSize: 10.5, color: '#DC2626', marginTop: 3 }}>{durationError}</div>
                  )}
                </div>
                <div>
                  <label className={styles.label}>With Food?</label>
                  <select className={styles.select}
                    value={newMed.withFood} onChange={e => f('withFood', e.target.value)}>
                    <option>Yes</option><option>No</option><option>Optional</option>
                  </select>
                </div>
              </div>
              <button
                className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm} ${styles.btnFull}`}
                onClick={handleAddClick}
                disabled={!canAdd}
                style={!canAdd ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                + Add
              </button>
            </div>

            {/* Notes */}
            <div>
              <label className={styles.label}>Notes for Patient</label>
              <textarea className={styles.textarea} style={{ height: 65 }}
                value={rxNotes} onChange={e => setRxNotes(e.target.value)}
                placeholder="e.g. Avoid alcohol. Follow up in 2 weeks." />
            </div>
          </div>

          <div className={styles.rxFooter}>
            <button className={`${styles.btn} ${styles.btnLight} ${styles.btnSm}`} style={{ flex: 1 }}>Save Draft</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ flex: 2 }} onClick={onIssue}>
              {rxSaved ? '✓ Issued' : '💊 Issue Prescription'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default PrescriptionMode