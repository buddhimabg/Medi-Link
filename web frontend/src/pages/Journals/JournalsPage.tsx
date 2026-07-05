import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import styles from './JournalsPage.module.css';

interface Article {
  _id: string;
  title: string;
  category: string;
  status: string;
  createdAt: string;
}

const JournalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/journals');
      const result = await response.json();
      if (result.success) setArticles(result.data);
    } catch (err) {
      console.error("Failed to fetch articles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this article?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/journals/${id}`, {
          method: 'DELETE',
        });
        const result = await response.json();
        if (result.success) {
          setArticles(articles.filter(a => a._id !== id));
        }
      } catch (err) {
        alert("Delete failed");
      }
    }
  };

  return (
    <div className={styles.page}>
      <TopBar onMenuClick={() => {}} />
      <div className={styles.layout}>
        {/* Sidebar wrapper ensures height stays at 100% */}
        <div className={styles.sidebarContainer}>
          <Sidebar activePath="/journals" isOpen={false} onClose={() => {}} />
        </div>
        
        <main className={styles.main}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Journal Articles</h1>
              <p className={styles.subtitle}>Manage your educational content</p>
            </div>
            <div className={styles.headerBtns}>
              <button className={styles.aiBtn}>🔥 AI Writer</button>
              <button className={styles.uploadBtn} onClick={() => navigate('/journals/upload')}>
                + Upload Article
              </button>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>{articles.filter(a => a.status === 'Published').length}</h3>
              <p>Published</p>
            </div>
            <div className={styles.statCard}>
              <h3>{articles.filter(a => a.status === 'Draft').length}</h3>
              <p>Draft</p>
            </div>
            <div className={styles.statCard}><h3>0</h3><p>Total Views</p></div>
            <div className={styles.statCard}>
              <h3>{new Set(articles.map(a => a.category)).size}</h3>
              <p>Categories</p>
            </div>
          </div>

          <div className={styles.articleSection}>
            <div className={styles.sectionHeader}>
              <span>📚 All Articles</span>
            </div>
            {loading ? (
              <div className={styles.loading}>Loading articles...</div>
            ) : (
              <div className={styles.articleList}>
                {articles.length === 0 ? (
                  <div className={styles.emptyState}>No articles found.</div>
                ) : (
                  articles.map((article) => (
                    <div key={article._id} className={styles.articleItem}>
                      <div className={styles.articleMain}>
                        <div className={styles.fileIcon}>📄</div>
                        <div>
                          <h4 className={styles.articleTitle}>{article.title}</h4>
                          <p className={styles.articleMeta}>{article.category} • {article.status}</p>
                        </div>
                      </div>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} onClick={() => navigate(`/journals/view/${article._id}`)} title="View">👁️</button>
                        <button className={styles.actionBtn} onClick={() => navigate(`/journals/edit/${article._id}`)} title="Edit">✏️</button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(article._id)} title="Delete">🗑️</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default JournalsPage;