// src/pages/VideoCall/ConnectingScreen.tsx
import React, { useEffect, useState } from 'react'
import styles from './ConnectingScreen.module.css'

interface Props {
  onBack: () => void
}

const STEPS = [
  'Establishing secure connection…',
  'Verifying session credentials…',
  'Connecting to patient…',
]

const ConnectingScreen: React.FC<Props> = ({ onBack }) => {
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx(i => (i < STEPS.length - 1 ? i + 1 : i))
    }, 900)
    return () => clearInterval(t)
  }, [])

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.spinner} />
        <h2 className={styles.title}>Connecting…</h2>
        <p className={styles.sub}>{STEPS[stepIdx]}</p>
        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <div key={i} className={`${styles.dot} ${i <= stepIdx ? styles.dotActive : ''}`} />
          ))}
        </div>
        <button className={styles.backBtn} onClick={onBack}>← Cancel &amp; Go Back</button>
      </div>
    </div>
  )
}

export default ConnectingScreen