// src/pages/Chatbot/ChatbotFAQLibrary.tsx
// Real API: GET / POST / PUT / DELETE / PATCH (toggle) FAQ CRUD

import { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import './ChatbotFAQLibrary.css';
import { faqApi } from '../../types/api';
import type { FAQRecord } from '../../types/api';

interface Props {
  onBack:            () => void;
  onOpenBroadcast?:  () => void;
  onOpenAISettings?: () => void;
  onOpenAnalytics?:  () => void;
}

const MENU_ITEMS = [
  { icon: '📣', label: 'Message History', key: 'broadcast'   },
  { icon: '🤖', label: 'AI Bot Settings', key: 'ai-settings' },
  { icon: '📊', label: 'Analytics',       key: 'analytics'   },
];

const CATEGORIES = ['GENERAL', 'MEDICATION', 'APPOINTMENT', 'MENTAL_HEALTH'];

// Category color map
const CAT_STYLE: Record<string, { color: string; bg: string }> = {
  'MEDICATION':    { color: '#2B52D4', bg: '#EEF2FF' },
  'MENTAL_HEALTH': { color: '#059669', bg: '#DCFCE7' },
  'APPOINTMENT':   { color: '#D97706', bg: '#FEF3C7' },
  'GENERAL':       { color: '#6B7280', bg: '#F3F4F6' },
};

const catStyle = (cat: string) =>
  CAT_STYLE[cat?.toUpperCase()] ?? CAT_STYLE['GENERAL'];

// Format date
const fmtDate = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    const d     = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
};

// Split keywords string → array
const splitKeywords = (raw: string): string[] =>
  raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);

type ModalMode = 'create' | 'edit' | null;

// Empty form state
const emptyForm = () => ({
  question: '',
  answer:   '',
  keywords: '',
  category: 'GENERAL',
});

export default function ChatbotFAQLibrary({ onBack, onOpenBroadcast, onOpenAISettings, onOpenAnalytics }: Props) {
  // List state
  const [faqs,       setFaqs]       = useState<FAQRecord[]>([]);
  const [loading,    setLoading]     = useState(true);
  const [error,      setError]       = useState<string | null>(null);
  const [search,     setSearch]      = useState('');
  const [filterCat,  setFilterCat]   = useState<string>('ALL');

  // Modal state
  const [modal,      setModal]       = useState<ModalMode>(null);
  const [editTarget, setEditTarget]  = useState<FAQRecord | null>(null);
  const [form,       setForm]        = useState(emptyForm());
  const [catOpen,    setCatOpen]     = useState(false);
  const [saving,     setSaving]      = useState(false);
  const [saveError,  setSaveError]   = useState<string | null>(null);
  const [deleting,   setDeleting]    = useState<string | null>(null); // faq _id being deleted
  const [toggling,   setToggling]    = useState<string | null>(null); // faq _id being toggled

  const menuRef  = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Load FAQs on mount
  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await faqApi.getAll();
      setFaqs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FAQs.');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuAction = (key: string) => {
    setMenuOpen(false);
    if (key === 'broadcast'   && onOpenBroadcast)  onOpenBroadcast();
    if (key === 'ai-settings' && onOpenAISettings) onOpenAISettings();
    if (key === 'analytics'   && onOpenAnalytics)  onOpenAnalytics();
  };

  // Open create modal
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setSaveError(null);
    setModal('create');
  };

  // Open edit modal
  const openEdit = (faq: FAQRecord) => {
    setEditTarget(faq);
    setForm({
      question: faq.question,
      answer:   faq.answer,
      keywords: faq.keywords.join(', '),
      category: faq.category ?? 'GENERAL',
    });
    setSaveError(null);
    setModal('edit');
  };

  // Save — create or update
  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      setSaveError('Question and Answer are required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        question: form.question.trim(),
        answer:   form.answer.trim(),
        keywords: splitKeywords(form.keywords),
        category: form.category.toUpperCase() as 'GENERAL' | 'MEDICATION' | 'APPOINTMENT' | 'MENTAL_HEALTH',
      };

      if (modal === 'create') {
        const created = await faqApi.create(payload);
        setFaqs(prev => [created, ...prev]);
      } else if (modal === 'edit' && editTarget) {
        const updated = await faqApi.update(editTarget._id, payload);
        setFaqs(prev => prev.map(f => f._id === updated._id ? updated : f));
      }
      setModal(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete FAQ
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    setDeleting(id);
    try {
      await faqApi.remove(id);
      setFaqs(prev => prev.filter(f => f._id !== id));
      if (modal === 'edit') setModal(null);
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };

  // Toggle active / inactive
  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      const updated = await faqApi.toggle(id);
      setFaqs(prev => prev.map(f => f._id === updated._id ? updated : f));
    } catch (err) {
      alert('Toggle failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setToggling(null);
    }
  };

  // Filtered FAQ list
  const filtered = faqs.filter(f => {
    const matchCat    = filterCat === 'ALL' || f.category?.toUpperCase() === filterCat;
    const matchSearch = f.question.toLowerCase().includes(search.toLowerCase()) ||
                        f.keywords.some(k => k.includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const featured = filtered[0] ?? null;
  const rest     = filtered.slice(1);

  return (
    <div className="cbfaq-layout">

      {/* Main panel */}
      <div className="cbfaq-main">

        {/* Header */}
        <div className="cb-page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="cb-btn-back" onClick={onBack}>Back</button>
            <div>
              <div className="cb-page-title">FAQ Library</div>
              <div className="cb-page-sub">
                {loading ? 'Loading...' : `${faqs.length} FAQs · ${faqs.filter(f => f.isActive).length} active`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="cb-menu-wrap" ref={menuRef}>
              <button className="cb-menu-btn" onClick={() => setMenuOpen(v => !v)}>⋯</button>
              {menuOpen && (
                <div className="cb-dropdown">
                  {MENU_ITEMS.map(item => (
                    <button key={item.key} className="cb-dropdown-item" onClick={() => handleMenuAction(item.key)}>
                      <span className="cb-dropdown-icon">{item.icon}</span>{item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="cb-btn cb-btn-primary" onClick={openCreate}>+ Add New FAQ</button>
          </div>
        </div>

        {/* Search + Category filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="cb-search-wrap" style={{ flex: 1, minWidth: 200 }}>
            <span className="cb-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search FAQs by question or keyword..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['ALL', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                style={{
                  padding: '6px 12px', borderRadius: 20, border: '1.5px solid',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  borderColor: filterCat === cat ? '#2B52D4' : '#E5E7EB',
                  background:  filterCat === cat ? '#EEF2FF' : '#fff',
                  color:       filterCat === cat ? '#2B52D4' : '#6B7280',
                }}
              >{cat}</button>
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div style={{
            background: '#FEE2E2', border: '1.5px solid #FECACA',
            borderRadius: 10, padding: '12px 16px',
            color: '#DC2626', fontSize: 13, marginBottom: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>⚠️ {error}</span>
            <button
              onClick={loadFAQs}
              style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
            >Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: 13 }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>⏳</div>
            Loading FAQ library...
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#F9FAFB', borderRadius: 12, border: '1.5px dashed #E5E7EB',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>❓</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              {search || filterCat !== 'ALL' ? 'No FAQs match your search' : 'No FAQs yet'}
            </div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              {search || filterCat !== 'ALL'
                ? 'Try a different keyword or category.'
                : 'Create your first FAQ so the AI bot can use it to answer patient questions.'}
            </div>
            {!search && filterCat === 'ALL' && (
              <button className="cb-btn cb-btn-primary" onClick={openCreate}>+ Create First FAQ</button>
            )}
          </div>
        )}

        {/* Featured FAQ (first item) */}
        {!loading && featured && (
          <div className="cbfaq-featured">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div
                className="cbfaq-featured-tag"
                style={{ background: catStyle(featured.category).bg, color: catStyle(featured.category).color }}
              >
                {featured.category}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {/* Active / Inactive badge */}
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                  background: featured.isActive ? '#DCFCE7' : '#FEE2E2',
                  color:      featured.isActive ? '#16A34A' : '#DC2626',
                }}>
                  {featured.isActive ? '● Active' : '● Inactive'}
                </span>
                {featured.usageCount > 0 && (
                  <span style={{ fontSize: 11, color: '#6B7280', padding: '3px 6px' }}>
                    Used {featured.usageCount}×
                  </span>
                )}
              </div>
            </div>
            <div className="cbfaq-featured-title">{featured.question}</div>
            <div className="cbfaq-featured-body">{featured.answer}</div>
            {featured.keywords.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                {featured.keywords.map(k => (
                  <span key={k} style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 10,
                    background: '#F3F4F6', color: '#6B7280', fontWeight: 600,
                  }}>#{k}</span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <div className="cbfaq-published">Published · {fmtDate(featured.createdAt)}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="cb-btn cb-btn-light cb-btn-sm"
                  onClick={() => handleToggle(featured._id)}
                  disabled={toggling === featured._id}
                >
                  {toggling === featured._id ? '...' : featured.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button className="cb-btn cb-btn-light cb-btn-sm" onClick={() => openEdit(featured)}>
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remaining FAQ list */}
        {!loading && rest.map(faq => {
          const cs = catStyle(faq.category);
          return (
            <div key={faq._id} className="cbfaq-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: cs.bg, color: cs.color,
                }}>{faq.category}</span>
                {!faq.isActive && (
                  <span style={{ fontSize: 10, color: '#DC2626', fontWeight: 600 }}>● Inactive</span>
                )}
                {faq.usageCount > 0 && (
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>Used {faq.usageCount}×</span>
                )}
              </div>
              <div className="cbfaq-item-title">{faq.question}</div>
              {faq.answer && (
                <div style={{
                  fontSize: 12, color: '#6B7280', marginTop: 3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {faq.answer}
                </div>
              )}
              <div className="cbfaq-item-actions">
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(faq.createdAt)}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="cb-btn cb-btn-light cb-btn-sm"
                    onClick={() => handleToggle(faq._id)}
                    disabled={toggling === faq._id}
                  >
                    {toggling === faq._id ? '...' : faq.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="cb-btn cb-btn-light cb-btn-sm" onClick={() => openEdit(faq)}>
                    Edit
                  </button>
                  <button
                    className="cb-btn cb-btn-sm"
                    style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
                    onClick={() => handleDelete(faq._id)}
                    disabled={deleting === faq._id}
                  >
                    {deleting === faq._id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && filtered.length > 0 && (
          <button className="cb-btn cb-btn-outline cb-btn-sm cb-btn-full" style={{ marginTop: 8 }} onClick={openCreate}>
            + Add New FAQ
          </button>
        )}
      </div>

      {/* Side panel */}
      <div className="cbfaq-side">
        <div className="cbfaq-side-title">📊 FAQ Stats</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total FAQs',   value: faqs.length,                               color: '#2B52D4' },
            { label: 'Active',       value: faqs.filter(f => f.isActive).length,        color: '#22C55E' },
            { label: 'Inactive',     value: faqs.filter(f => !f.isActive).length,       color: '#EF4444' },
            { label: 'Total Used',   value: faqs.reduce((s, f) => s + f.usageCount, 0), color: '#D97706' },
          ].map(s => (
            <div key={s.label} className="cb-kv">
              <span className="cb-kk">{s.label}</span>
              <span className="cb-kv-v" style={{ color: s.color, fontWeight: 700 }}>{s.value}</span>
            </div>
          ))}
        </div>

        <div className="cbfaq-side-title" style={{ marginTop: 8 }}>🔥 Most Used FAQs</div>
        {faqs
          .filter(f => f.usageCount > 0)
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, 5)
          .map(f => (
            <div key={f._id} className="cbfaq-side-item" onClick={() => openEdit(f)} style={{ cursor: 'pointer' }}>
              <div className="cbfaq-side-cat">{f.category}</div>
              <div className="cbfaq-side-q">{f.question}</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Used {f.usageCount}×</div>
            </div>
          ))}

        {faqs.filter(f => f.usageCount > 0).length === 0 && (
          <div style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 0' }}>
            No usage data yet.
          </div>
        )}

        <button className="cb-btn cb-btn-primary cb-btn-sm cb-btn-full" style={{ marginTop: 12 }} onClick={openCreate}>
          + Add FAQ
        </button>
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="cbfaq-modal-overlay" onClick={() => setModal(null)}>
          <div className="cbfaq-modal" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="cbfaq-modal-hdr">
              <div className="cbfaq-modal-hdr-title">
                {modal === 'create' ? '✏️ Create New FAQ' : '✏️ Edit FAQ'}
              </div>
              <button className="cbfaq-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>

            <div className="cbfaq-modal-body">
              {/* Edit warning */}
              {modal === 'edit' && editTarget && (
                <div className="cbfaq-warn">
                  ⚠️ Changes will immediately update the AI bot's response for this FAQ.
                  Published: <strong>{fmtDate(editTarget.createdAt)}</strong>
                  {editTarget.usageCount > 0 && <> · Used <strong>{editTarget.usageCount}×</strong></>}
                </div>
              )}

              {/* Save error */}
              {saveError && (
                <div style={{
                  background: '#FEE2E2', border: '1.5px solid #FECACA',
                  borderRadius: 8, padding: '10px 14px',
                  color: '#DC2626', fontSize: 12, marginBottom: 12,
                }}>
                  ⚠️ {saveError}
                </div>
              )}

              {/* Category */}
              <div className="cb-form-group" style={{ position: 'relative' }}>
                <label className="cb-label">Category *</label>
                <div
                  style={{
                    padding: '9px 13px', border: '1.5px solid #E5E7EB',
                    borderRadius: 9, cursor: 'pointer', fontSize: 13,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#fff',
                  }}
                  onClick={() => setCatOpen(v => !v)}
                >
                  {form.category || 'Select a category...'}
                  <span style={{ fontSize: 11, color: '#6B7280' }}>▼</span>
                </div>
                {catOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
                    background: '#fff', border: '1.5px solid #E5E7EB',
                    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 20,
                  }}>
                    {CATEGORIES.map(c => (
                      <div
                        key={c}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                          background: c === form.category ? '#EEF2FF' : undefined,
                          color:      c === form.category ? '#2B52D4' : '#374151',
                        }}
                        onMouseDown={() => { setForm(f => ({ ...f, category: c })); setCatOpen(false); }}
                      >{c}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Question */}
              <div className="cb-form-group">
                <label className="cb-label">Question *</label>
                <input
                  className="cb-input"
                  type="text"
                  placeholder="What is the common patient question?"
                  value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                />
              </div>

              {/* Answer */}
              <div className="cb-form-group">
                <label className="cb-label">Answer *</label>
                <textarea
                  className="cbfaq-editor"
                  rows={5}
                  placeholder="Provide a clear and helpful answer for the AI bot to use..."
                  value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                />
              </div>

              {/* Keywords */}
              <div className="cb-form-group">
                <label className="cb-label">Keywords (comma separated)</label>
                <input
                  className="cb-input"
                  type="text"
                  placeholder="e.g. sertraline, side effects, nausea"
                  value={form.keywords}
                  onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                />
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  The AI bot uses these keywords to match patient messages to this FAQ.
                </div>
              </div>

              {/* Performance (edit only) */}
              {modal === 'edit' && editTarget && (
                <div className="cb-form-group">
                  <label className="cb-label">📊 FAQ Performance</label>
                  <div className="cbfaq-perf">
                    <div className="cbfaq-perf-item">
                      Used <strong>{editTarget.usageCount}×</strong> <span>total</span>
                    </div>
                    <div className="cbfaq-perf-item">
                      Status <strong style={{ color: editTarget.isActive ? '#16A34A' : '#DC2626' }}>
                        {editTarget.isActive ? 'Active' : 'Inactive'}
                      </strong>
                    </div>
                    <div className="cbfaq-perf-item">
                      Created <strong>{fmtDate(editTarget.createdAt)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="cbfaq-modal-footer">
              {modal === 'edit' ? (
                <>
                  <button
                    className="cb-btn cb-btn-danger cb-btn-sm"
                    onClick={() => editTarget && handleDelete(editTarget._id)}
                    disabled={deleting === editTarget?._id}
                  >
                    {deleting === editTarget?._id ? 'Deleting...' : '🗑 Delete FAQ'}
                  </button>
                  <div className="cbfaq-modal-footer-right">
                    <button className="cb-btn cb-btn-light cb-btn-sm" onClick={() => setModal(null)}>
                      Cancel
                    </button>
                    <button
                      className="cb-btn cb-btn-primary cb-btn-sm"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button className="cb-btn cb-btn-light cb-btn-sm" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                  <div className="cbfaq-modal-footer-right">
                    <button
                      className="cb-btn cb-btn-primary cb-btn-sm"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Creating...' : 'Create & Publish'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}