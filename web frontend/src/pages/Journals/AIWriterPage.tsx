import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/DoctorPortalSidebar'
import TopBar from '../../components/layout/TopBar'
import TagInput from './TagInput'
import { journalApi } from '../../types/api'
import { JOURNAL_CATEGORIES } from './journalCategories'
import styles from './AIWriterPage.module.css'

const FALLBACK_TOPICS = [
  'How cortisol affects mental health',
  '5 breathing techniques for panic attacks',
  'Link between sleep & depression',
  'Grounding exercises for anxiety',
]

const AIWriterPage: React.FC = () => {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const [title, setTitle] = useState('New Article')
  const [category, setCategory] = useState<string>(JOURNAL_CATEGORIES[0])
  const [tags, setTags] = useState<string[]>([])
  const [prompt, setPrompt] = useState('')
  const [topics] = useState<string[]>(FALLBACK_TOPICS)

  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const [pendingAiText, setPendingAiText] = useState<string | null>(null)

  const editorRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Note: topic ideas use a static list to conserve the limited free-tier
  // AI quota for the main "Generate Content" action, which matters more.

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('⚠️ Type what you want AI to write first')
      return
    }
    setGenerating(true)
    setError('')
    try {
      const result = await journalApi.aiGenerate({ prompt, title, category })
      setPendingAiText(result.content)
      showToast('✨ Draft generated — review below')
    } catch (err: any) {
      setError(err.message || 'AI generation failed')
      showToast('❌ AI generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const acceptAiBlock = () => {
    if (!pendingAiText || !editorRef.current) return
    const html = pendingAiText
      .split('\n\n')
      .filter(Boolean)
      .map(p => `<p>${p}</p>`)
      .join('')
    editorRef.current.innerHTML += html
    setPendingAiText(null)
    showToast('✓ Added to article')
  }

  const discardAiBlock = () => {
    setPendingAiText(null)
  }

  const getContentHtml = () => editorRef.current?.innerHTML || ''

  const saveArticle = async (status: 'Draft' | 'Published') => {
    if (!title.trim()) {
      setError('Article title is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('category', category)
      formData.append('summary', '')
      formData.append('content', getContentHtml())
      formData.append('status', status)
      formData.append('tags', JSON.stringify(tags))

      const saved = await journalApi.create(formData)
      if (status === 'Published') {
        navigate('/journals/success', { state: { articleId: saved._id } })
      } else {
        showToast('📝 Saved as draft!')
        navigate('/journals')
      }
    } catch (err: any) {
      setError(err.message || 'Save failed')
      showToast('❌ Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`medilink-app ${styles.page}`}>
      <TopBar
        onMenuClick={() => setMenuOpen(true)}
        badge={<span className={styles.aiBadgeTop}>✨ AI Writer</span>}
      />
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.main}>
          <div className={styles.aiWriterLayout}>
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
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? '✨ Generating...' : '✨ Generate Content'}
                </button>
              </div>

              <div className={styles.aiSection}>
                <div className={styles.aiSectionTitle}>💡 Topic Ideas</div>
                {topics.map(topic => (
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
                <div className={styles.aiSectionTitle}>📁 Category</div>
                <select
                  className={styles.aiTextarea}
                  style={{ height: 'auto', padding: '8px' }}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {JOURNAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className={styles.aiSection}>
                <div className={styles.aiSectionTitle}>🏷️ Tags</div>
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  className={styles.aiTextarea}
                  tagClassName={styles.topicChip}
                />
              </div>
            </div>

            <div className={styles.aiEditor}>
              <div className={styles.editorToolbar}>
                <button
                  type="button"
                  className={`${styles.editorBtn} ${styles.btnGhost} ${styles.btnSm}`}
                  onClick={() => navigate('/journals')}
                >
                  ← Back to Journals
                </button>
                <div className={styles.toolbarRight}>
                  {error && <span style={{ color: '#e53e3e', fontSize: 13, marginRight: 12 }}>⚠️ {error}</span>}
                  <button
                    type="button"
                    className={`${styles.editorBtn} ${styles.btnGhost} ${styles.btnSm}`}
                    onClick={() => saveArticle('Draft')}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.editorBtn} ${styles.btnPrimary} ${styles.btnSm}`}
                    onClick={() => saveArticle('Published')}
                    disabled={saving}
                  >
                    {saving ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </div>

              <div className={styles.editorBody}>
                <div
                  className={styles.editorH1}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={e => setTitle(e.currentTarget.textContent || 'New Article')}
                >
                  {title}
                </div>

                <div
                  ref={editorRef}
                  className={styles.editorP}
                  contentEditable
                  suppressContentEditableWarning
                  style={{ minHeight: 200 }}
                >
                  <p>Start writing here, or use the AI Assistant on the left to generate a draft.</p>
                </div>

                {pendingAiText && (
                  <div className={styles.aiGeneratedBlock}>
                    <div className={styles.aiGeneratedLabel}>✨ AI GENERATED — REVIEW BEFORE PUBLISHING</div>
                    <div className={styles.aiPoint} style={{ whiteSpace: 'pre-wrap' }}>{pendingAiText}</div>
                    <div className={styles.aiBlockActions}>
                      <button type="button" className={styles.acceptBtn} onClick={acceptAiBlock}>✓ Accept</button>
                      <button type="button" className={styles.discardBtn} onClick={discardAiBlock}>✗ Discard</button>
                    </div>
                  </div>
                )}
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
