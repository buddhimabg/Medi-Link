import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { renderAsync } from 'docx-preview'; // docx පෙන්වීමට අවශ්‍ය කොටස
import Sidebar from '../../components/DoctorPortalSidebar';
import TopBar from '../../components/layout/TopBar';
import { journalApi } from '../../types/api';
import styles from './ViewArticlePage.module.css';

const ViewArticlePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<any>(null);
  const docContainerRef = useRef<HTMLDivElement>(null); // docx එක පෙන්වන තැනට Reference එකක්
  const hasFetchedRef = useRef(false); // React StrictMode dev-mode double-effect එකෙන් views 2 වතාවක් count වීම වළක්වයි

  useEffect(() => {
    if (hasFetchedRef.current || !id) return;
    hasFetchedRef.current = true;

    // 1. ලිපියේ විස්තර ලබා ගැනීම
    journalApi.getById(id)
      .then(async (data) => {
        setArticle(data);

        // 2. ලිපිය docx file එකක් නම් එය download කර preview කිරීම
        if (data.fileUrl) {
          const response = await fetch(`http://localhost:5000${data.fileUrl}`);
          const blob = await response.blob();
          if (docContainerRef.current) {
            renderAsync(blob, docContainerRef.current); // මෙතනදී docx එක පෙන්වයි
          }
        }
      })
      .catch(err => console.error("Error:", err));
  }, [id]);

  return (
    <div className={styles.page}>
      <TopBar onMenuClick={() => {}} />
      <div className={styles.layout}>
        <div className={styles.sidebarContainer}>
          <Sidebar />
        </div>
        <main className={styles.main}>
          <button className={styles.backLink} onClick={() => navigate('/journals')}>
            ← Back to Journals
          </button>
          
          <div className={styles.viewLayout}>
            <div className={styles.articleViewCard}>
              <h1 className={styles.articleViewTitle}>{article?.title || "Loading..."}</h1>
              {article?.category && (
                <p className={styles.articleMeta}>{article.category}{article.status ? ` • ${article.status}` : ''}</p>
              )}
              <hr />

              {article?.fileUrl ? (
                // docx ගොනුව මෙතැන දර්ශනය වේ
                <div ref={docContainerRef} className={styles.docViewer} />
              ) : article?.content ? (
                // AI Writer / rich-text ලෙස ලියූ ලිපියේ අන්තර්ගතය මෙතැන දර්ශනය වේ
                <div
                  className={styles.docViewer}
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              ) : (
                article && <p>No document attached to view.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewArticlePage;