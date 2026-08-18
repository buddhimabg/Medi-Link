// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { journalApi, type JournalRecord } from "../types/api";
import { JOURNAL_CATEGORIES } from "./Journals/journalCategories";
import { PageLoadingSpinner, InlineAlert, EmptyState } from "../components/ui";

// Patients only ever see Published articles — the backend (getJournals in
// journalController.js) already filters to status: 'Published' whenever
// req.user.role !== 'doctor', so no extra filtering is needed here.
const PAGE_SIZE = 9;

const CATEGORY_COLORS: Record<string, string> = {
  "Anxiety & Stress Management": "#0C5BD5",
  "Sleep Health": "#7C3AED",
  Mindfulness: "#0D9488",
  Depression: "#DB2777",
  Relationships: "#EA580C",
  "Self-care": "#16A34A",
};

const getCategoryColor = (category?: string) => CATEGORY_COLORS[category ?? ""] ?? "#0C5BD5";

const formatDate = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

const PatientJournalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const [articles, setArticles] = useState<JournalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search / filter / pagination state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search text so we don't fire a request on every keystroke
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  // Reset to page 1 whenever the filters change
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category]);

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, debouncedSearch]);

  const fetchArticles = async () => {
    setLoading(true);
    setError("");
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
      setError(err?.message || "Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Journal Reading" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Journal Reading</h1>
              <p className="text-gray-500 mt-1">
                Articles and notes your doctor has shared with you
              </p>
            </div>
          </div>

          {/* Search + Category filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Search by title, summary, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#DCE8FF] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0C5BD5]/30 focus:border-[#0C5BD5]"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-[#DCE8FF] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0C5BD5]/30 focus:border-[#0C5BD5]"
            >
              <option value="">All categories</option>
              {JOURNAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-6">
              <InlineAlert type="error" message={error} onClose={() => setError("")} />
            </div>
          )}

          {loading ? (
            <div className="py-12">
              <PageLoadingSpinner message="Loading articles…" fullHeight={false} />
            </div>
          ) : articles.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#DCE8FF] shadow-sm">
              <EmptyState
                title="No articles found"
                description={
                  search || category
                    ? "Try a different search term or category."
                    : "Your doctor hasn't published any articles yet. Check back later."
                }
              />
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                {articles.map((article) => (
                  <button
                    key={article._id}
                    onClick={() => navigate(`/journal/${article._id}`)}
                    className="text-left bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border border-[#DCE8FF] hover:border-[#0C5BD5] flex flex-col"
                  >
                    <span
                      className="self-start text-xs font-semibold px-2.5 py-1 rounded-full mb-3"
                      style={{
                        color: getCategoryColor(article.category),
                        backgroundColor: `${getCategoryColor(article.category)}1A`,
                      }}
                    >
                      {article.category}
                    </span>

                    <h3 className="text-base font-semibold text-gray-800 line-clamp-2 mb-2">
                      {article.title}
                    </h3>

                    {article.summary && (
                      <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">
                        {article.summary}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100">
                      <span>{formatDate(article.createdAt)}</span>
                      {typeof article.views === "number" && (
                        <span>{article.views} views</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    className="px-4 py-2 rounded-lg border border-[#DCE8FF] bg-white text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#0C5BD5] transition-colors"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {page} of {totalPages} · {totalCount} article{totalCount === 1 ? "" : "s"}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    className="px-4 py-2 rounded-lg border border-[#DCE8FF] bg-white text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#0C5BD5] transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PatientJournalsPage;