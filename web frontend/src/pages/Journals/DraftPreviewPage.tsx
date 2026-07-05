import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import TopBar from '../../components/layout/TopBar'
import styles from './DraftPreviewPage.module.css'
import { getArticleById } from './articlesData'

const DraftPreviewPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const article = getArticleById(id ?? '')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
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

  const paragraphs = article.content.split('\n\n').filter(Boolean)

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

          {/* Draft banner */}
          <div className={styles.draftBanner}>
            <div className={styles.draftBannerLeft}>
              <span>⚠️</span>
              <span>This article is a <strong>Draft</strong> and is not visible to patients yet.</span>
            </div>
            <div className={styles.draftBannerActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnEdit}`}
                onClick={() => navigate(`/journals/edit/${article.id}`)}
              >
                ✏️ Continue Editing
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPublish}`}
                onClick={() => navigate('/journals/progress')}
              >
                🚀 Publish Now
              </button>
            </div>
          </div>

          <div className={styles.viewLayout}>
            {/* Draft Article Content */}
            <div className={styles.articleViewCard}>
              <div className={styles.articleViewCat}>
                <span className={styles.catChip}>{article.category}</span>
                <span className={styles.readTime}>{article.readTime}</span>
                <span className={styles.badgeDraft}>Draft</span>
              </div>

              <h1 className={styles.articleViewTitle}>{article.title}</h1>

              <div className={styles.authorRow}>
                <div className={styles.authorInfo}>
                  <div className={styles.authorAvatar}>{article.authorInitial}</div>
                  <div>
                    <div className={styles.authorName}>{article.author}</div>
                    <div className={styles.authorMeta}>Draft · {article.dateLabel}</div>
                  </div>
                </div>
              </div>

              {/* Render article body from real data */}
              <div className={styles.articleBody}>
                {paragraphs.map((para, i) => {
                  if (para.length < 60 && !para.includes('.') && !/^\d+\./.test(para) && !para.startsWith('[')) {
                    return <h3 key={i}>{para}</h3>
                  }
                  if (/^\d+\./.test(para)) {
                    return <div key={i} className={styles.articlePoint}>{para}</div>
                  }
                  if (para.startsWith('[')) {
                    return <p key={i} className={styles.draftNote}>📝 <em>{para}</em></p>
                  }
                  return <p key={i}>{para}</p>
                })}
              </div>

              <div className={styles.articleTags}>
                {article.tags.map(tag => (
                  <span key={tag} className={styles.articleTag}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className={styles.rightSidebar}>
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarCardHeader}>📋 Draft Status</div>
                <div className={styles.sidebarCardBody}>
                  <div className={styles.statusRow}><span>Status</span><span className={styles.statusDraft}>Draft</span></div>
                  <div className={styles.statusRow}><span>Last Edited</span><span className={styles.statusVal}>{article.dateLabel}</span></div>
                  <div className={styles.statusRow}><span>Visibility</span><span className={styles.statusVal}>Not Published</span></div>
                </div>
              </div>

              <div className={styles.sidebarCard}>
                <div className={styles.sidebarCardHeader}>✅ Before Publishing</div>
                <div className={styles.sidebarCardBody}>
                  <div className={styles.checkItem}><span className={styles.checkDone}>✓</span> Title & category set</div>
                  <div className={styles.checkItem}><span className={styles.checkDone}>✓</span> Introduction written</div>
                  <div className={styles.checkItem}><span className={styles.checkPending}>○</span> Full content complete</div>
                  <div className={styles.checkItem}><span className={styles.checkPending}>○</span> Final review done</div>
                </div>
              </div>

              <div className={styles.sidebarActionsCard}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  style={{ width: '100%', marginBottom: 10 }}
                  onClick={() => navigate(`/journals/edit/${article.id}`)}
                >
                  ✏️ Continue Editing
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  style={{ width: '100%' }}
                  onClick={() => showToast('🗑️ Draft deleted')}
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