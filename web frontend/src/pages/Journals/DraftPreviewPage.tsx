import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import TopBar from '../../components/layout/TopBar'
import { journalApi } from '../../types/api'
import styles from './DraftPreviewPage.module.css'

interface JournalArticle {
  _id: string
  title: string
  category: string
  summary?: string
  content?: string
  tags?: string[]
  status: 'Published' | 'Draft'
  createdAt: string
  updatedAt: string
}

const DraftPreviewPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [article, setArticle] = useState<JournalArticle | null>(null)
  const [loading, setLoading] = useState(true)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!id) return
    journalApi.getById(id)
      .then(data => setArticle(data as JournalArticle))
      .catch(err => console.error('Failed to load draft:', err))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!article) return
    if (!window.confirm('Are you sure you want to delete this draft?')) return
    try {
      await journalApi.delete(article._id)
      showToast('🗑️ Draft deleted')
      navigate('/journals')
    } catch {
      showToast('❌ Delete failed')
    }
  }

  const handlePublish = async () => {
    if (!article) return
    try {
      await journalApi.update(article._id, { status: 'Published' })
      navigate('/journals/success', { state: { articleId: article._id } })
    } catch {
      showToast('❌ Publish failed')
    }
  }

  if (loading) {
    return (
      <div className={`medilink-app ${styles.page}`}>
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <div className={styles.layout}>
          <Sidebar activePath="/journals" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className={styles.main}>
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>Loading draft...</div>
          </main>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className={`medilink-app ${styles.page}`}>
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <div className={styles.layout}>
          <Sidebar activePath="/journals" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className={styles.main}>
            <button type="button" className={styles.backLink} onClick={() => navigate('/journals')}>← Back to Journals</button>
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ fontSize: 56 }}>📄</div>
              <h2>Draft not found</h2>
              <p style={{ color: '#888' }}>This draft doesn't exist or has been removed.</p>
              <button type="button" className={`${styles.btn} ${styles.btnPublish}`} onClick={() => navigate('/journals')}>Back to Journals</button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const dateLabel = new Date(article.updatedAt || article.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className={`medilink-app ${styles.page}`}>
      <TopBar
        onMenuClick={() => setMenuOpen(true)}
        badge={<span className={styles.draftBadgeTop}>Draft — Not Published</span>}
      />
      <div className={styles.layout}>
        <Sidebar activePath="/journals" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className={styles.main}>
          <button type="button" className={styles.backLink} onClick={() => navigate('/journals')}>
            ← Back to Journals
          </button>

          <div className={styles.draftBanner}>
            <div className={styles.draftBannerLeft}>
              <span>⚠️</span>
              <span>This article is a <strong>Draft</strong> and is not visible to patients yet.</span>
            </div>
            <div className={styles.draftBannerActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnEdit}`}
                onClick={() => navigate(`/journals/edit/${article._id}`)}
              >
                ✏️ Continue Editing
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPublish}`}
                onClick={handlePublish}
              >
                🚀 Publish Now
              </button>
            </div>
          </div>

          <div className={styles.viewLayout}>
            <div className={styles.articleViewCard}>
              <div className={styles.articleViewCat}>
                <span className={styles.catChip}>{article.category}</span>
                <span className={styles.badgeDraft}>Draft</span>
              </div>

              <h1 className={styles.articleViewTitle}>{article.title}</h1>

              <div className={styles.authorRow}>
                <div className={styles.authorInfo}>
                  <div className={styles.authorAvatar}>{article.title.charAt(0)}</div>
                  <div>
                    <div className={styles.authorMeta}>Draft · {dateLabel}</div>
                  </div>
                </div>
              </div>

              <div className={styles.articleBody}>
                {article.content ? (
                  <div dangerouslySetInnerHTML={{ __html: article.content }} />
                ) : (
                  <p className={styles.draftNote}>📝 <em>No content written yet.</em></p>
                )}
              </div>

              {!!article.tags?.length && (
                <div className={styles.articleTags}>
                  {article.tags.map(tag => (
                    <span key={tag} className={styles.articleTag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.rightSidebar}>
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarCardHeader}>📋 Draft Status</div>
                <div className={styles.sidebarCardBody}>
                  <div className={styles.statusRow}><span>Status</span><span className={styles.statusDraft}>Draft</span></div>
                  <div className={styles.statusRow}><span>Last Edited</span><span className={styles.statusVal}>{dateLabel}</span></div>
                  <div className={styles.statusRow}><span>Visibility</span><span className={styles.statusVal}>Not Published</span></div>
                </div>
              </div>

              <div className={styles.sidebarActionsCard}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  style={{ width: '100%', marginBottom: 10 }}
                  onClick={() => navigate(`/journals/edit/${article._id}`)}
                >
                  ✏️ Continue Editing
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  style={{ width: '100%' }}
                  onClick={handleDelete}
                >
                  🗑️ Delete Draft
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}

export default DraftPreviewPage
