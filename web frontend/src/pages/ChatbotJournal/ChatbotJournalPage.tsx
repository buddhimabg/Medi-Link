import React, { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import TopBar from '../../components/layout/TopBar'
import styles from './ChatbotJournalPage.module.css'

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

interface Props {
  defaultStep: StepId
}

const STEP_META: Record<StepId, { label: string; title: string }> = {
  1: { label: 'Dashboard', title: 'Chatbot Panel - Overview Dashboard' },
  2: { label: 'Patient Chat', title: 'Chatbot - Patient Chat Open (Doctor View)' },
  3: { label: 'AI Auto-Reply', title: 'Chatbot - AI Bot Auto-Reply in Action' },
  4: { label: 'FAQ Mode', title: 'Chatbot - FAQ Mode with Article Suggestions' },
  5: { label: 'Notifications', title: 'Chatbot - Notification Center (Sending Notifications)' },
  6: { label: 'Journal Dashboard', title: 'Journal Articles - Dashboard Overview' },
  7: { label: 'Upload Form', title: 'Journal - Upload New Article Form' },
  8: { label: 'Upload Progress', title: 'Journal - File Upload In Progress' },
  9: { label: 'AI Writer', title: 'Journal - AI-Powered Article Writer' },
  10: { label: 'Published View', title: 'Journal - Published Article (How Patients See It)' },
}

const ChatbotJournalPage: React.FC<Props> = ({ defaultStep }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [step, setStep] = useState<StepId>(defaultStep)
  const location = useLocation()

  const activePath = useMemo(() => {
    return location.pathname.startsWith('/journals') ? '/journals' : '/chatbot'
  }, [location.pathname])

  return (
    <div className="medilink-app">
      <div className={styles.shell}>
        <div className={styles.tabNav}>
          <div className={styles.tabSection}>💬 Chatbot</div>
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setStep(num as StepId)}
              className={`${styles.tabBtn} ${step === num ? styles.tabBtnActive : ''}`}
            >
              {num} · {STEP_META[num as StepId].label}
            </button>
          ))}
          <div className={styles.tabSection}>📖 Journal</div>
          {[6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setStep(num as StepId)}
              className={`${styles.tabBtn} ${step === num ? styles.tabBtnActive : ''}`}
            >
              {num} · {STEP_META[num as StepId].label}
            </button>
          ))}
        </div>

        <div className={styles.stepBar}>
          <div className={styles.stepNum}>{step}</div>
          <span>{STEP_META[step].title}</span>
        </div>

        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <div className={styles.layout}>
          <Sidebar activePath={activePath} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className={styles.main}>
            {step <= 5 ? <ChatbotStep step={step} /> : <JournalStep step={step} />}
          </main>
        </div>
      </div>
    </div>
  )
}

const ChatbotStep: React.FC<{ step: StepId }> = ({ step }) => {
  if (step === 1) {
    return (
      <>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.pageTitle}>Chatbot Dashboard</div>
            <div className={styles.pageSub}>Manage patient conversations and AI support tools</div>
          </div>
        </div>
        <div className={styles.statsGrid}>
          <StatCard value="24" label="Active Chats" color="#2B52D4" />
          <StatCard value="87%" label="Auto-Reply Accuracy" color="#22C55E" />
          <StatCard value="12" label="FAQ Matches Today" color="#7C3AED" />
          <StatCard value="5" label="Unread Alerts" color="#EF4444" />
        </div>
      </>
    )
  }

  if (step === 2) {
    return (
      <SimpleCard
        title="Patient Chat"
        body="Live patient conversation panel with suggestions, quick replies, and real-time message timeline."
      />
    )
  }

  if (step === 3) {
    return (
      <SimpleCard
        title="AI Auto-Reply"
        body="Auto-reply engine preview for generating safe, context-based draft responses before doctor approval."
      />
    )
  }

  if (step === 4) {
    return (
      <SimpleCard
        title="FAQ Mode"
        body="Frequently asked question mode with suggested answers and linked educational article recommendations."
      />
    )
  }

  return (
    <SimpleCard
      title="Notifications"
      body="Notification center for chatbot events, pending replies, unread messages, and escalation alerts."
    />
  )
}

const JournalStep: React.FC<{ step: StepId }> = ({ step }) => {
  if (step === 6) {
    return (
      <>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.pageTitle}>Journal Articles</div>
            <div className={styles.pageSub}>Upload and manage educational content for your patients</div>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`}>✍️ AI Writer</button>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>+ Upload Article</button>
          </div>
        </div>
        <div className={styles.statsGrid}>
          <StatCard value="3" label="Published" color="#2B52D4" />
          <StatCard value="1" label="Draft" color="#D97706" />
          <StatCard value="213" label="Total Views" color="#22C55E" />
          <StatCard value="3" label="Categories" color="#7C3AED" />
        </div>
      </>
    )
  }

  if (step === 7) {
    return (
      <SimpleCard
        title="Upload Form"
        body="Upload new journal article form with title, category, summary, tags, visibility, and publish/draft actions."
      />
    )
  }

  if (step === 8) {
    return (
      <SimpleCard
        title="Upload Progress"
        body="File upload in progress with status tracking, processing steps, and validation details."
      />
    )
  }

  if (step === 9) {
    return (
      <SimpleCard
        title="AI Writer"
        body="AI-assisted editor for article generation, structured outline, and rich text drafting controls."
      />
    )
  }

  return (
    <SimpleCard
      title="Published View"
      body="Final article preview exactly as patients see it, including summary, content blocks, and related recommendations."
    />
  )
}

const StatCard: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <div className={styles.card}>
    <div className={styles.statValue} style={{ color }}>{value}</div>
    <div className={styles.statLabel}>{label}</div>
  </div>
)

const SimpleCard: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className={styles.card}>
    <div className={styles.cardTitle}>{title}</div>
    <p className={styles.simpleText}>{body}</p>
    <div className={styles.placeholderBlock}>Layout section ready for full content integration.</div>
  </div>
)

export default ChatbotJournalPage
