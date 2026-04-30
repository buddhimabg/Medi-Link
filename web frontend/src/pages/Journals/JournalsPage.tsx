import React, { useState } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import TopBar from '../../components/layout/TopBar'
import styles from './JournalsPage.module.css'

const STATS = [
  { value: '3', label: 'Published', color: '#2B52D4' },
  { value: '1', label: 'Draft', color: '#D97706' },
  { value: '213', label: 'Total Views', color: '#22C55E' },
  { value: '3', label: 'Categories', color: '#7C3AED' },
]

const ARTICLES = [
  {
    emoji: '🧠',
    title: 'Understanding Cortisol & Stress',
    meta: 'Anxiety Management · Published 15 Nov 2025',
    views: '124 views',
    status: 'Published',
    statusClass: styles.badgeGreen,
    thumbClass: '',
    dimmed: false,
  },
  {
    emoji: '😴',
    title: 'Sleep & Mental Health Connection',
    meta: 'Sleep Health · Published 12 Nov 2025',
    views: '89 views',
    status: 'Published',
    statusClass: styles.badgeGreen,
    thumbClass: styles.thumbSleep,
    dimmed: false,
  },
  {
    emoji: '🧘',
    title: 'Mindfulness for Anxiety Relief',
    meta: 'Mindfulness · Published 10 Nov 2025',
    views: '71 views',
    status: 'Published',
    statusClass: styles.badgeGreen,
    thumbClass: styles.thumbMind,
    dimmed: false,
  },
  {
    emoji: '💼',
    title: 'Managing Work-Related Stress',
    meta: 'Draft · Last edited today',
    views: '',
    status: 'Draft',
    statusClass: styles.badgeAmber,
    thumbClass: styles.thumbWork,
    dimmed: true,
  },
]

const JournalsPage: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={styles.page}>
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className={styles.layout}>
        <Sidebar activePath="/journals" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <div>
              <h2 className={styles.pageTitle}>Journal Articles</h2>
              <p className={styles.pageSub}>Upload and manage educational content for your patients</p>
            </div>
            <div className={styles.headerActions}>
              <button type="button" className={`${styles.btn} ${styles.btnOutline}`}>✍️ AI Writer</button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>+ Upload Article</button>
            </div>
          </div>

          <div className={styles.statsGrid}>
            {STATS.map((stat) => (
              <div key={stat.label} className={styles.statCard}>
                <div className={styles.statValue} style={{ color: stat.color }}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>📚 All Articles</h3>
            <div className={styles.articleList}>
              {ARTICLES.map((article) => (
                <div key={article.title} className={`${styles.articleCard} ${article.dimmed ? styles.articleDim : ''}`}>
                  <div className={`${styles.thumb} ${article.thumbClass}`}>{article.emoji}</div>
                  <div className={styles.articleInfo}>
                    <div className={styles.articleTitle}>{article.title}</div>
                    <div className={styles.articleMeta}>
                      {article.meta}
                      {article.views ? <span className={styles.views}> · {article.views}</span> : null}
                    </div>
                  </div>
                  <span className={`${styles.badge} ${article.statusClass}`}>{article.status}</span>
                  <div className={styles.iconActions}>
                    <button type="button" className={styles.iconBtn}>✏️</button>
                    {!article.dimmed ? <button type="button" className={styles.iconBtn}>👁</button> : null}
                    <button type="button" className={`${styles.iconBtn} ${styles.iconDanger}`}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default JournalsPage
