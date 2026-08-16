// src/pages/VideoCall/ConnectingScreen.tsx
import React, { useEffect, useState } from 'react'
import styles from './ConnectingScreen.module.css'

interface Props {
  onBack: () => void
}

const STEPS = [
  { label: 'Establishing secure connection…',  icon: '🔐' },
  { label: 'Verifying session credentials…',   icon: '✅' },
  { label: 'Connecting to patient…',            icon: '👤' },
]

const ConnectingScreen: React.FC<Props> = ({ onBack }) => {
  const [stepIdx, setStepIdx] = useState(0)
  const [done,    setDone]    = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx(i => {
        if (i < STEPS.length - 1) return i + 1
        clearInterval(t)
        setTimeout(() => setDone(true), 600)
        return i
      })
    }, 1100)
    return () => clearInterval(t)
  }, [])

  return (
    <div className={styles.wrapper}>

      {/* Ambient background blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />

      <div className={`${styles.card} ${done ? styles.cardDone : ''}`}>

        {/* ── Spinner zone ── */}
        <div className={styles.spinnerWrap}>
          {/* Outer slow ring */}
          <div className={styles.ringOuter} />
          {/* Middle dashed ring */}
          <div className={styles.ringMid} />
          {/* Inner fast spinner */}
          <div className={`${styles.spinner} ${done ? styles.spinnerDone : ''}`} />
          {/* Centre icon */}
          <div className={`${styles.centreIcon} ${done ? styles.centreIconDone : ''}`}>
            {done ? '✓' : STEPS[stepIdx].icon}
          </div>
        </div>

        {/* ── Title ── */}
        <h2 className={`${styles.title} ${done ? styles.titleDone : ''}`}>
          {done ? 'Connected!' : 'Connecting…'}
        </h2>

        {/* ── Step label ── */}
        <p className={styles.sub} key={stepIdx}>
          {done ? 'Starting your session now…' : STEPS[stepIdx].label}
        </p>

        {/* ── Step progress track ── */}
        {!done && (
          <div className={styles.stepTrack}>
            {STEPS.map((s, i) => (
              <div key={i} className={styles.stepItem}>
                <div className={`${styles.stepDot}
                  ${i < stepIdx  ? styles.stepDone    : ''}
                  ${i === stepIdx ? styles.stepActive  : ''}
                `}>
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                <span className={`${styles.stepLabel} ${i <= stepIdx ? styles.stepLabelActive : ''}`}>
                  {s.label.replace('…', '')}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`${styles.stepLine} ${i < stepIdx ? styles.stepLineDone : ''}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Done checkmark pulse ── */}
        {done && <div className={styles.doneRing} />}

        {/* ── Cancel button ── */}
        {!done && (
          <button className={styles.backBtn} onClick={onBack}>
            ← Cancel &amp; Go Back
          </button>
        )}
      </div>
    </div>
  )
}

export default ConnectingScreen