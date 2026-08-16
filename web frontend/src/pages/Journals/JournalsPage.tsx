import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import { journalApi, type JournalRecord } from '../../types/api';
import { JOURNAL_CATEGORIES } from './journalCategories';
import styles from './JournalsPage.module.css';

const PAGE_SIZE = 10;

const JournalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<JournalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search / filter / pagination state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // All-time stats (unfiltered, unpaginated) shown in the top cards
  const [allArticles, setAllArticles] = useState<JournalRecord[]>([]);

  // Debounce search text so we don't fire a request on every keystroke
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  // Reset to page 1 whenever the filters change, then fetch
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category]);

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, debouncedSearch]);

  // Fetch a large unfiltered batch once for the summary stat cards
  useEffect(() => {
    journalApi.getAll({ limit: 50 })
      .then(res => setAllArticles(res.data))
      .catch(() => {});
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await journalApi.getAll({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        category: category || undefined,
      });
      setArticles(res.data);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await journalApi.delete(id);
      setArticles(prev => prev.filter(a => a._id !== id));
      setAllArticles(prev => prev.filter(a => a._id !== id));
      setTotalCount(prev => Math.max(prev - 1, 0));
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div className={styles.page}>
      <TopBar onMenuClick={() => {}} />
      <div className={styles.layout}>
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
              <button className={styles.aiBtn} onClick={() => navigate('/journals/ai-writer')}>🔥 AI Writer</button>
              <button className={styles.uploadBtn} onClick={() => navigate('/journals/upload')}>
                + Upload Article
              </button>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>{allArticles.filter(a => a.status === 'Published').length}</h3>
              <p>Published</p>
            </div>
            <div className={styles.statCard}>
              <h3>{allArticles.filter(a => a.status === 'Draft').length}</h3>
              <p>Draft</p>
            </div>
            <div className={styles.statCard}><h3>{allArticles.reduce((sum, a) => sum + (a.views || 0), 0)}</h3><p>Total Views</p></div>
            <div className={styles.statCard}>
              <h3>{new Set(allArticles.map(a => a.category)).size}</h3>
              <p>Categories</p>
            </div>
          </div>

          <div className={styles.articleSection}>
            <div className={styles.sectionHeader}>
              <span>📚 All Articles {totalCount ? `(${totalCount})` : ''}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, padding: '0 20px 14px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Search by title, summary, or tag..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: '1 1 240px', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
              />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                <option value="">All categories</option>
                {JOURNAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {error && <div style={{ color: '#e53e3e', padding: '0 20px 14px', fontSize: 14 }}>⚠️ {error}</div>}

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
                        <button
                          className={styles.actionBtn}
                          onClick={() => navigate(
                            article.status === 'Draft'
                              ? `/journals/draft/${article._id}`
                              : `/journals/view/${article._id}`
                          )}
                          title="View"
                        >👁️</button>
                        <button className={styles.actionBtn} onClick={() => navigate(`/journals/edit/${article._id}`)} title="Edit">✏️</button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(article._id)} title="Delete">🗑️</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
                <button
                  className={styles.actionBtn}
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                >← Prev</button>
                <span style={{ fontSize: 14, color: '#555' }}>Page {page} of {totalPages}</span>
                <button
                  className={styles.actionBtn}
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                >Next →</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default JournalsPage;
