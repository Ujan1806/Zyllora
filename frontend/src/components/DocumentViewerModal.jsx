import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Layers,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../services/api';

export const DocumentViewerModal = ({ document: doc, token, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const totalPages = doc?.page_count || 1;

  useEffect(() => {
    if (!doc || !token) return;
    loadPage(currentPage);
  }, [doc, currentPage, token]);

  const loadPage = async (pageNum) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getDocumentPage(doc.id, pageNum, token);
      setPageData(data);
    } catch (err) {
      setError(err.message || 'Failed to load page content.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-base font-semibold text-white truncate">{doc.title}</h3>
              <p className="text-xs text-slate-400">
                {totalPages} {totalPages === 1 ? 'page' : 'pages'} • Extracted & Chunked
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Page Navigation Toolbar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              disabled={currentPage <= 1 || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="px-3 py-1 rounded bg-slate-950 border border-slate-800 font-medium text-slate-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNext}
              disabled={currentPage >= totalPages || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors flex items-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {pageData?.chunks && (
            <span className="text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>{pageData.chunks.length} Searchable Chunks on this page</span>
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading extracted page text...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {pageData?.warning && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>{pageData.warning}</span>
                </div>
              )}

              {/* Page Raw Extracted Text */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Extracted Page Content</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {pageData?.content?.length || 0} characters
                  </span>
                </div>

                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-72 overflow-y-auto">
                  {pageData?.content ? (
                    pageData.content
                  ) : (
                    <span className="text-slate-500 italic">
                      No extractable text found on this page. (May be an image, chart, or scanned page)
                    </span>
                  )}
                </div>
              </div>

              {/* Searchable Chunks Partition */}
              {pageData?.chunks && pageData.chunks.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>RAG Document Chunks (Ready for AI Tutor in Week 3)</span>
                  </h4>

                  <div className="space-y-3">
                    {pageData.chunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-indigo-300">
                            Chunk #{chunk.chunk_index + 1}
                          </span>
                          <span className="text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            Pages {chunk.page_start} - {chunk.page_end}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-mono line-clamp-3">
                          {chunk.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            PyMuPDF Text & Page Boundary Extractor
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
