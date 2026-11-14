import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { renderAsync } from 'docx-preview'; // docx පෙන්වීමට අවශ්‍ය කොටස
import Sidebar from '../../components/DoctorPortalSidebar';
import TopBar from '../../components/layout/TopBar';
import { journalApi } from '../../types/api';
import styles from './ViewArticlePage.module.css';

// journalApi/fileUrl calls hit http://localhost:5000 directly (matches the
// rest of this file) — file preview needs the same origin, not the /api one.
const FILE_ORIGIN = 'http://localhost:5000';

type FileKind = 'docx' | 'pdf' | 'unsupported' | null;

const getFileKind = (fileUrl?: string, fileName?: string): FileKind => {
  const name = (fileName || fileUrl || '').toLowerCase();
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.pdf')) return 'pdf';
  if (!name) return null;
  return 'unsupported';
};

const ViewArticlePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<any>(null);
  const [fileError, setFileError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const docContainerRef = useRef<HTMLDivElement>(null); // docx එක පෙන්වන තැනට Reference එකක්
  const hasFetchedRef = useRef(false); // React StrictMode dev-mode double-effect එකෙන් views 2 වතාවක් count වීම වළක්වයි

  useEffect(() => {
    if (hasFetchedRef.current || !id) return;
    hasFetchedRef.current = true;

    // 1. ලිපියේ විස්තර ලබා ගැනීම
    journalApi.getById(id)
      .then(async (data) => {
        setArticle(data);
        if (!data.fileUrl) return;

        const kind = getFileKind(data.fileUrl, data.fileName);

        try {
          const response = await fetch(`${FILE_ORIGIN}${data.fileUrl}`);
          if (!response.ok) {
            throw new Error(
              response.status === 404
                ? "This file couldn't be found on the server (it may have been removed)."
                : `Failed to load the file (status ${response.status}).`
            );
          }
          const blob = await response.blob();

          if (kind === 'docx') {
            if (docContainerRef.current) {
              await renderAsync(blob, docContainerRef.current); // මෙතනදී docx එක පෙන්වයි
            }
          } else if (kind === 'pdf') {
            setPdfUrl(URL.createObjectURL(blob)); // <iframe> එකෙන් PDF එක native browser viewer එකෙන් පෙන්වයි
          } else {
            setFileError(`This file type isn't supported for in-browser preview yet.`);
          }
        } catch (err: any) {
          console.error('File preview error:', err);
          setFileError(err?.message || 'Could not load this file for preview.');
        }
      })
      .catch(err => console.error("Error:", err));
  }, [id]);

  // Clean up the blob URL created for the PDF preview when we leave the page
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const fileKind = getFileKind(article?.fileUrl, article?.fileName);

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
                fileError ? (
                  <div className={styles.docViewer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', textAlign: 'center', padding: 24 }}>
                    ⚠️ {fileError}
                  </div>
                ) : fileKind === 'pdf' ? (
                  pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      title={article.title || 'Document preview'}
                      className={styles.docViewer}
                      style={{ width: '100%', height: '80vh', border: 'none' }}
                    />
                  ) : (
                    <div className={styles.docViewer}>Loading preview…</div>
                  )
                ) : (
                  // docx ගොනුව මෙතැන දර්ශනය වේ
                  <div ref={docContainerRef} className={styles.docViewer} />
                )
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