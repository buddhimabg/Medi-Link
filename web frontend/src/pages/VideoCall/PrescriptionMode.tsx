// src/pages/VideoCall/PrescriptionMode.tsx
import React from 'react'
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

const PrescriptionMode: React.FC<Props> = ({
  duration, formatDuration,
  medications, removeMedication,
  newMed, setNewMed, onAddMed,
  rxNotes, setRxNotes,
  onIssue, rxSaved, onEnd, onBack,
}) => {
  const f = (k: keyof NewMedication, v: string) =>
    setNewMed({ ...newMed, [k]: v })

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

            {/* Medications */}
            <div>
              <div className={styles.sectionTitle}>Prescribed Medications</div>
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
              <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm} ${styles.btnFull}`}>
                + Add Medication
              </button>
            </div>

            {/* Add new med form */}
            <div className={styles.addForm}>
              <div className={styles.sectionTitle}>New Medication</div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Medicine Name</label>
                <input className={styles.input} placeholder="e.g. Alprazolam"
                  value={newMed.name} onChange={e => f('name', e.target.value)} />
              </div>
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>Dosage</label>
                  <input className={styles.input} placeholder="e.g. 0.25mg"
                    value={newMed.dose} onChange={e => f('dose', e.target.value)} />
                </div>
                <div>
                  <label className={styles.label}>Frequency</label>
                  <input className={styles.input} placeholder="e.g. Twice daily"
                    value={newMed.frequency} onChange={e => f('frequency', e.target.value)} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>Duration</label>
                  <input className={styles.input} placeholder="e.g. 14 days"
                    value={newMed.duration} onChange={e => f('duration', e.target.value)} />
                </div>
                <div>
                  <label className={styles.label}>With Food?</label>
                  <select className={styles.select}
                    value={newMed.withFood} onChange={e => f('withFood', e.target.value)}>
                    <option>Yes</option><option>No</option><option>Optional</option>
                  </select>
                </div>
              </div>
              <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm} ${styles.btnFull}`} onClick={onAddMed}>
                + Add
              </button>
            </div>

            {/* Notes */}
            <div>
              <label className={styles.label}>Notes for Patient</label>
              <textarea className={styles.textarea} style={{ height: 65 }}
                value={rxNotes} onChange={e => setRxNotes(e.target.value)} />
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