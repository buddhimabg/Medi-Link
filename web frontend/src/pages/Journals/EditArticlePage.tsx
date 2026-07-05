import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import * as mammoth from 'mammoth'; // Browser එකේ වැඩ කිරීමට මෙය වැදගත් වේ
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import styles from './EditArticlePage.module.css';

const EditArticlePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/journals/${id}`);
        const result = await response.json();

        if (result.success) {
          setTitle(result.data.title);
          setCategory(result.data.category);

          if (result.data.fileUrl) {
            // docx file එකක් ඇත්නම් එය HTML බවට පත් කරයි
            const fileRes = await fetch(`http://localhost:5000${result.data.fileUrl}`);
            const arrayBuffer = await fileRes.arrayBuffer();
            const { value } = await mammoth.convertToHtml({ arrayBuffer });
            setContent(value);
          } else {
            setContent(result.data.content || "");
          }
        }
      } catch (error) {
        console.error("SRS Error Trace:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleUpdate = async () => {
    const response = await fetch(`http://localhost:5000/api/journals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, category }),
    });

    if (response.ok) {
      alert("Article updated successfully according to SRS standards.");
      navigate('/journals');
    }
  };

  if (loading) return <div className={styles.main}>Loading System...</div>;

  return (
    <div className={styles.page}>
      <TopBar onMenuClick={() => {}} />
      <div className={styles.layout}>
        <div className={styles.sidebarContainer}>
          <Sidebar activePath="/journals" isOpen={false} onClose={() => {}} />
        </div>
        <main className={styles.main}>
          <div className={styles.header}>
            <h2>SRS: Edit Article Details</h2>
            <button className={styles.saveBtn} onClick={handleUpdate}>Save Changes</button>
          </div>

          <div className={styles.editorContainer}>
            <input 
              className={styles.titleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article Title"
            />
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