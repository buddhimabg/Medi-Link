import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import TopBar from '../../components/layout/TopBar'
import styles from './AIWriterPage.module.css'

const TOPIC_IDEAS = [
  'How cortisol affects mental health',
  '5 breathing techniques for panic attacks',
  'Link between sleep & depression',
  'Grounding exercises for anxiety',
]

const STRUCTURE_ITEMS = [
  { label: 'Introduction',  state: 'done'    },
  { label: 'What is CBT?', state: 'done'    },
  { label: 'Key Techniques',state: 'active'  },
  { label: 'Case Study',   state: 'pending' },
  { label: 'Conclusion',   state: 'pending' },
]

const AIWriterPage: React.FC = () => {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [aiBlockAccepted, setAiBlockAccepted] = useState(false)
  const [aiBlockVisible, setAiBlockVisible] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className={`medilink-app ${styles.page}`}>
      <TopBar
        onMenuClick={() => setMenuOpen(true)}
        badge={<span className={styles.aiBadgeTop}>✨ AI Writer</span>}
      />
      <div className={styles.layout}>
        <Sidebar activePath="/journals" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className={styles.main}>
          <div className={styles.aiWriterLayout}>
            {/* AI Sidebar */}
            <div className={styles.aiSidebar}>
              <div className={styles.aiSidebarHeader}>
                <div className={styles.aiSidebarTitle}>🔥 AI Writer</div>
              </div>

              <div className={styles.aiAssistantBox}>
                <div className={styles.aiAssistantTitle}>
                  ✨ AI Assistant
                  <span className={styles.aiBetaBadge}>BETA</span>
                </div>
                <div className={styles.aiAssistantDesc}>Describe what to write and AI will generate a draft.</div>
                <textarea
                  className={styles.aiTextarea}
                  placeholder="e.g. Write an intro about CBT for anxiety..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.aiGenerateBtn}
                  onClick={() => showToast('✨ Generating content...')}
                >
                  ✨ Generate Content
                </button>
              </div>

              <div className={styles.aiSection}>
                <div className={styles.aiSectionTitle}>💡 Topic Ideas</div>
                {TOPIC_IDEAS.map(topic => (
                  <div
                    key={topic}
                    className={styles.topicChip}
                    onClick={() => setPrompt(topic)}
                  >
                    {topic}
                  </div>
                ))}
              </div>

              <div className={styles.aiSection}>
                <div className={styles.aiSectionTitle}>📝 Article Structure</div>
                {STRUCTURE_ITEMS.map(item => (
                  <div
                    key={item.label}
                    className={`${styles.structureItem} ${
                      item.state === 'done' ? styles.structureDone :
                      item.state === 'active' ? styles.structureActive : styles.structurePending
                    }`}
                  >
                    {item.state === 'done' ? '✓' : item.state === 'active' ? '→' : '○'} {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className={styles.aiEditor}>
              <div className={styles.editorToolbar}>
                <select className={styles.toolbarSelect}>
                  <option>Normal</option>
                  <option>Heading 1</option>
                  <option>Heading 2</option>
                </select>
                <button type="button" className={styles.toolbarBtn} style={{ fontWeight: 900 }}>B</button>
                <button type="button" className={styles.toolbarBtn} style={{ fontStyle: 'italic' }}>I</button>
                <button type="button" className={styles.toolbarBtn} style={{ textDecoration: 'underline' }}>U</button>
                <div className={styles.toolbarSep} />
                <button type="button" className={styles.toolbarBtn}>≡</button>
                <button type="button" className={styles.toolbarBtn}>⋮</button>
                <button type="button" className={styles.toolbarBtn}>🔗</button>
                <button type="button" className={styles.toolbarBtn}>🖼</button>
                <div className={styles.toolbarRight}>
                  <button type="button" className={`${styles.editorBtn} ${styles.btnSecondary} ${styles.btnSm}`}>Preview</button>
                  <button type="button" className={`${styles.editorBtn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => showToast('📝 Saved as draft!')}>Save Draft</button>
                  <button type="button" className={`${styles.editorBtn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => navigate('/journals/success')}>Publish</button>
                </div>
              </div>

              <div className={styles.editorBody}>
                <div
                  className={styles.editorH1}
                  contentEditable
                  suppressContentEditableWarning
                >
                  Managing Anxiety with CBT Techniques
                </div>

                <p
                  className={styles.editorP}
                  contentEditable
                  suppressContentEditableWarning
                >
                  Cognitive Behavioral Therapy (CBT) is one of the most widely researched and effective forms of psychotherapy for treating anxiety disorders. This article explores practical, evidence-based strategies that can be implemented during counseling sessions and practiced at home.
                </p>

                {/* AI Generated Block */}
                {aiBlockVisible && !aiBlockAccepted && (
                  <div className={styles.aiGeneratedBlock}>
                    <div className={styles.aiGeneratedLabel}>✨ AI GENERATED — REVIEW BEFORE PUBLISHING</div>
                    <div className={styles.aiBlockTitle}>Key CBT Techniques for Anxiety:</div>
                    <div className={styles.aiPoint}>
                      <strong>1. Cognitive Restructuring</strong> — Identifying and challenging negative thought patterns. Patients learn to recognise automatic negative thoughts and replace them with balanced alternatives.
                    </div>
                    <div className={styles.aiPoint}>
                      <strong>2. Graded Exposure</strong> — Gradually exposing patients to feared situations in a controlled, step-by-step manner to reduce avoidance and build confidence.
                    </div>
                    <div className={styles.aiBlockActions}>
                      <button type="button" className={styles.acceptBtn} onClick={() => setAiBlockAccepted(true)}>✓ Accept</button>
                      <button type="button" className={styles.editBtn}>✏️ Edit</button>
                      <button type="button" className={styles.discardBtn} onClick={() => setAiBlockVisible(false)}>✗ Discard</button>
                    </div>
                  </div>
                )}

                {aiBlockAccepted && (
                  <div className={styles.editorPoint}>
                    <strong>Key CBT Techniques</strong> — Cognitive Restructuring, Graded Exposure, and Mindfulness Integration help patients manage anxiety through structured, evidence-based approaches.
                  </div>
                )}

                <div className={styles.editorPoint} contentEditable suppressContentEditableWarning>
                  <strong>3. Mindfulness Integration</strong> — Mindfulness-based techniques such as the 5-4-3-2-1 grounding exercise help patients anchor themselves in the present during anxiety episodes. Patients are encouraged to practice these strategies daily between sessions.
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}

export default AIWriterPage