import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import * as mammoth from 'mammoth'; // Browser එකේ වැඩ කිරීමට මෙය වැදගත් වේ
import Sidebar from '../../components/DoctorPortalSidebar';
import TopBar from '../../components/layout/TopBar';
import TagInput from './TagInput';
import { journalApi } from '../../types/api';
import { JOURNAL_CATEGORIES } from './journalCategories';
import styles from './EditArticlePage.module.css';

const EditArticlePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<string>(JOURNAL_CATEGORIES[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await journalApi.getById(id!);
        setTitle(data.title);
        setCategory(data.category);
        setTags(data.tags || []);

        if (data.fileUrl) {
          // docx file එකක් ඇත්නම් එය HTML බවට පත් කරයි
          const fileRes = await fetch(`http://localhost:5000${data.fileUrl}`);
          const arrayBuffer = await fileRes.arrayBuffer();
          const { value } = await mammoth.convertToHtml({ arrayBuffer });
          setContent(value);
        } else {
          setContent(data.content || "");
        }
      } catch (error) {
        console.error("Failed to load article:", error);
        setError('Failed to load article');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleUpdate = async () => {
    setSaving(true);
    setError('');
    try {
      await journalApi.update(id!, { title, content, category, tags });
      navigate('/journals');
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.main}>Loading article...</div>;

  return (
    <div className={styles.page}>
      <TopBar onMenuClick={() => {}} />
      <div className={styles.layout}>
        <div className={styles.sidebarContainer}>
          <Sidebar />
        </div>
        <main className={styles.main}>
          <div className={styles.header}>
            <h2>Edit Article</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {error && <span style={{ color: '#e53e3e', fontSize: 13 }}>⚠️ {error}</span>}
              <button className={styles.saveBtn} onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className={styles.editorContainer}>
            <input 
              className={styles.titleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article Title"
            />

            <div style={{ display: 'flex', gap: 16, margin: '12px 0', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}
                >
                  {JOURNAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: '2 1 300px' }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>🏷️ Tags</label>
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  className={styles.titleInput}
                />
              </div>
            </div>

            <ReactQuill 
              theme="snow" 
              value={content || ""} 
              onChange={setContent} 
              className={styles.quillEditor}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default EditArticlePage;
