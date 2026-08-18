// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { renderAsync } from "docx-preview"; // docx file එක browser එකේම render කරන්න
import Sidebar from "../components/Sidebar";
import { journalApi, type JournalRecord } from "../types/api";
import { PageLoadingSpinner, InlineAlert } from "../components/ui";

// journalApi uses VITE_API_URL (falls back to http://localhost:5000/api) —
// strip the trailing /api so we can build a direct link to /uploads/<file>.
const API_ORIGIN = (import.meta.env.VITE_API_URL ?? "http://localhost:5000/api").replace(
  /\/api\/?$/,
  ""
);

const getFileExtension = (fileName?: string, fileUrl?: string) => {
  const source = fileName || fileUrl || "";
  const match = source.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
};

const formatDate = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

const PatientJournalArticlePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const [article, setArticle] = useState<JournalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");

  const docContainerRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false); // StrictMode dev double-effect guard — avoids counting a view twice

  useEffect(() => {
    if (hasFetchedRef.current || !id) return;
    hasFetchedRef.current = true;

    setLoading(true);
    journalApi
      .getById(id)
      .then(async (data) => {
        setArticle(data);
        setError("");
        setFileError("");

        // .docx files render via docx-preview. .pdf files use the browser's
        // built-in PDF viewer (iframe) — docx-preview can't parse a PDF
        // (docx is a zip archive, a PDF is not).
        const ext = getFileExtension(data.fileName, data.fileUrl);
        if (data.fileUrl && ext === "docx") {
          try {
            const response = await fetch(`${API_ORIGIN}${data.fileUrl}`);
            if (!response.ok) throw new Error(`File not found (${response.status})`);
            const blob = await response.blob();
            if (docContainerRef.current) {
              await renderAsync(blob, docContainerRef.current);
            }
          } catch (fileErr) {
            console.error("Document preview error:", fileErr);
            setFileError("This document could not be loaded — the file may be missing from the server.");
          }
        }
      })
      .catch((err: any) => setError(err?.message || "Failed to load this article"))
      .finally(() => setLoading(false));
  }, [id]);

  const fileExt = getFileExtension(article?.fileName, article?.fileUrl);
  const fileHref = article?.fileUrl ? `${API_ORIGIN}${article.fileUrl}` : "";

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activePage="Journal Reading" collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"} p-8`}>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/journal")}
            className="text-sm text-[#0C5BD5] font-medium mb-6 hover:underline"
          >
            ← Back to Journal Reading
          </button>

          {loading ? (
            <PageLoadingSpinner message="Loading article…" fullHeight={false} />
          ) : error ? (
            <InlineAlert type="error" message={error} />
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-[#DCE8FF]">
              {article?.category && (
                <span
                  className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-4"
                  style={{ color: "#0C5BD5", backgroundColor: "rgba(12, 91, 213, 0.1)" }}
                >
                  {article.category}
                </span>
              )}

              <h1 className="text-2xl font-bold text-gray-800 mb-2">{article?.title}</h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-6">
                {article?.createdAt && <span>Published {formatDate(article.createdAt)}</span>}
                {typeof article?.views === "number" && <span>· {article.views} views</span>}
              </div>

              {article?.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <hr className="border-gray-100 mb-6" />

              {article?.fileUrl && fileExt === "docx" ? (
                fileError ? (
                  <div>
                    <p className="text-sm text-red-600 mb-3">⚠️ {fileError}</p>
                    <a
                      href={fileHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#0C5BD5] hover:underline"
                    >
                      Try opening the file directly
                    </a>
                  </div>
                ) : (
                  // docx ගොනුව මෙතැන දර්ශනය වේ
                  <div ref={docContainerRef} className="prose max-w-none" />
                )
              ) : article?.fileUrl && fileExt === "pdf" ? (
                // PDF එක browser eke built-in viewer එකෙන් render වෙනවා
                <iframe
                  src={fileHref}
                  title={article.title}
                  className="w-full border border-gray-100 rounded-lg"
                  style={{ height: "80vh" }}
                />
              ) : article?.fileUrl ? (
                // docx/pdf නොවන file type එකක් — preview support නෑ, download link එකක් දෙනවා
                <div>
                  <p className="text-sm text-gray-500 mb-3">
                    Preview isn't available for this file type{fileExt ? ` (.${fileExt})` : ""}.
                  </p>
                  <a
                    href={fileHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#0C5BD5] hover:underline"
                  >
                    Download / open the file
                  </a>
                </div>
              ) : article?.content ? (
                // AI Writer / rich-text ලෙස ලියූ ලිපියේ අන්තර්ගතය
                <div
                  className="prose max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              ) : (
                <p className="text-sm text-gray-400">No content is attached to this article.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PatientJournalArticlePage;