// src/pages/VideoCall/EndSessionDialog.tsx
import React from 'react'
import styles from './EndSessionDialog.module.css'

interface Props {
  duration:          number
  formatDuration:    (s: number) => string
  patientName:       string
  prescriptionCount: number
  unsavedNoteLines:  number   // 0 = nothing to warn about
  queueCount:        number
  nextPatient:       { name: string; time: string } | null
  onConfirm:         () => void
  onReturn:          () => void
}

const EndSessionDialog: React.FC<Props> = ({
  duration,
  formatDuration,
  patientName,
  prescriptionCount,
  unsavedNoteLines,
  queueCount,
  nextPatient,
  onConfirm,
  onReturn,
}) => {
  const displayName = patientName || 'the patient'

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.logo}><span>Medi</span>Link</div>
        <div className={styles.topbarRight}>
          <button className={styles.iconBtn}>🔔</button>
          <div className={styles.avatar}>D</div>
        </div>
      </header>

      <div className={styles.bg}>
        {/* Blurred background ghost card */}
        <div className={styles.ghostCard}>
          <div className={styles.ghostAvatar}>{(patientName?.[0] ?? 'P').toUpperCase()}</div>
          <div className={styles.ghostText}>Session still active…</div>
        </div>

        {/* Confirmation modal */}
        <div className={styles.modal}>
          <div className={styles.iconWrap}>📞</div>
          <h2 className={styles.modalTitle}>End this Session?</h2>
          <p className={styles.modalSub}>
            This will end the video session with <strong>{displayName}</strong>.
            Ensure all notes and prescriptions are saved.
          </p>

          {/* Stats grid */}
          <div className={styles.statsGrid}>
            <div>
              <div className={`${styles.statVal} ${styles.statBlue}`}>
                {formatDuration(duration)}
              </div>
              <div className={styles.statLabel}>Session Duration</div>
            </div>
            <div>
              <div className={`${styles.statVal} ${styles.statPurple}`}>
                {prescriptionCount}
              </div>
              <div className={styles.statLabel}>Prescriptions</div>
            </div>
            <div>
              <div className={`${styles.statVal} ${styles.statAmber}`}>
                {unsavedNoteLines}
              </div>
              <div className={styles.statLabel}>Unsaved Notes</div>
            </div>
            <div>
              <div className={`${styles.statVal} ${styles.statGreen}`}>
                {queueCount}
              </div>
              <div className={styles.statLabel}>Left in Queue</div>
            </div>
          </div>

          {/* Warning — only show if there are unsaved notes */}
          {unsavedNoteLines > 0 && (
            <div className={styles.warning}>
              <span className={styles.warningIcon}>⚠️</span>
              <span>
                You have <strong>{unsavedNoteLines} unsaved {unsavedNoteLines === 1 ? 'note' : 'notes'}</strong>.
                {' '}They will be auto-saved if you proceed.
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className={styles.btnStack}>
            <button
              className={`${styles.btn} ${styles.btnDanger} ${styles.btnFull}`}
              onClick={onConfirm}
            >
              📞 End Session
            </button>
            <button
              className={`${styles.btn} ${styles.btnOutline} ${styles.btnFull}`}
              onClick={onReturn}
            >
              ↩ Return to Session
            </button>
            {nextPatient && (
              <button className={`${styles.btn} ${styles.btnLight} ${styles.btnFull}`}>
                Next Patient — {nextPatient.name} {nextPatient.time} →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default EndSessionDialog