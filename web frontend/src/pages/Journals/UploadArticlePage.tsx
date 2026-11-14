import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/DoctorPortalSidebar';
import TopBar from '../../components/layout/TopBar';
import TagInput from './TagInput';
import { journalApi } from '../../types/api';
import { JOURNAL_CATEGORIES } from './journalCategories';
import styles from './UploadArticlePage.module.css';

const UploadArticlePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(JOURNAL_CATEGORIES[0]);
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePublish = async (status: 'Published' | 'Draft') => {
    if (!title.trim()) {
      setError('Article title is required');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('summary', summary);
      formData.append('status', status);
      formData.append('tags', JSON.stringify(tags));
      
      if (file) {
        formData.append('file', file); // Matches upload.single('file')
      }

      await journalApi.create(formData);
      navigate('/journals');
    } catch (err: any) {
      console.error("Upload Error Details:", err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <TopBar onMenuClick={() => {}} />
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.main}>
          <button className={styles.backLink} onClick={() => navigate('/journals')}>
            ← Back to Journals
          </button>

          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Upload Article</h1>
          </div>

          <div className={styles.uploadGrid}>
            <div className={styles.formCard}>
              {error && <div className={styles.errorText}>⚠️ {error}</div>}
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>📎 Upload File</label>
                {!file ? (
                  <div className={styles.dropzone} onClick={() => fileInputRef.current?.click()}>
                    <div className={styles.dropzoneTitle}>Click to upload article</div>
                    <div className={styles.dropzoneSub}>PDF, DOCX, or MD</div>
                  </div>
                ) : (
                  <div className={styles.filePreview}>
                    <span className={styles.fileName}>📄 {file.name}</span>
                    <button className={styles.fileRemove} onClick={() => setFile(null)}>✕</button>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={(e) => setFile(e.target.files?.[0] || null)} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Article Title *</label>
                <input 
                  className={styles.formInput} 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Enter title"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category *</label>
                <select 
                  className={styles.formSelect} 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {JOURNAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Summary</label>
                <textarea
                  className={styles.formInput}
                  style={{ minHeight: 80, resize: 'vertical' }}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Short summary of the article (optional)"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>🏷️ Tags</label>
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formActions}>
                <button 
                  className={styles.btnGhost} 
                  onClick={() => handlePublish('Draft')} 
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Draft'}
                </button>
                <button 
                  className={styles.btnPrimary} 
                  onClick={() => handlePublish('Published')} 
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Publish Article'}
                </button>
              </div>
            </div>

            <div className={styles.sidebarCards}>
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarCardHeader}>📋 Guidelines</div>
                <div className={styles.sidebarCardBody}>
                  Keep content professional and cite your medical sources.
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UploadArticlePage;
