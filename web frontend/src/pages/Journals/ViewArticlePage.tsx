import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { renderAsync } from 'docx-preview'; // docx පෙන්වීමට අවශ්‍ය කොටස
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import styles from './ViewArticlePage.module.css';

const ViewArticlePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<any>(null);
  const docContainerRef = useRef<HTMLDivElement>(null); // docx එක පෙන්වන තැනට Reference එකක්

  useEffect(() => {
    // 1. ලිපියේ විස්තර ලබා ගැනීම
    fetch(`http://localhost:5000/api/journals/${id}`)
      .then(res => res.json())
      .then(async (result) => {
        if (result.success) {
          setArticle(result.data);
          
          // 2. ලිපිය docx file එකක් නම් එය download කර preview කිරීම
          if (result.data.fileUrl) {
            const response = await fetch(`http://localhost:5000${result.data.fileUrl}`);
            const blob = await response.blob();
            if (docContainerRef.current) {
              renderAsync(blob, docContainerRef.current); // මෙතනදී docx එක පෙන්වයි
            }
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
          <Sidebar activePath="/journals" isOpen={false} onClose={() => {}} />
        </div>
        <main className={styles.main}>
          <button className={styles.backLink} onClick={() => navigate('/journals')}>
            ← Back to Journals
          </button>
          
          <div className={styles.viewLayout}>
            <div className={styles.articleViewCard}>
              <h1 className={styles.articleViewTitle}>{article?.title || "Loading..."}</h1>
              <hr />
              
              {/* docx ගොනුව මෙතැන දර්ශනය වේ */}
              <div 
                ref={docContainerRef} 
                className={styles.docViewer}
              >
                {!article?.fileUrl && <p>No document attached to view.</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewArticlePage;