import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Menu,
  BookOpen,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RotateCw,
  Eye,
  Loader2,
  X,
  Layers,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';

export const DashboardPage = () => {
  const { user, token, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Document states
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [activeViewerDoc, setActiveViewerDoc] = useState(null);

  // Upload states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Delete modal state
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef(null);

  const studentName = profile?.full_name || user?.user_metadata?.full_name || 'Student';
  const major = profile?.field_of_study || 'University Studies';

  // Load documents
  const loadDocuments = async () => {
    if (!token) return;
    try {
      const data = await apiClient.listDocuments(token);
      setDocuments(data);
    } catch (err) {
      console.warn('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [token]);

  // Polling for documents that are in 'processing' status
  useEffect(() => {
    const processingDocs = documents.filter((d) => d.status === 'processing');
    if (processingDocs.length === 0 || !token) return;

    const interval = setInterval(async () => {
      let hasUpdates = false;
      const updatedDocs = await Promise.all(
        documents.map(async (doc) => {
          if (doc.status === 'processing') {
            try {
              const statusData = await apiClient.getDocumentStatus(doc.id, token);
              if (statusData && statusData.status !== 'processing') {
                hasUpdates = true;
                return { ...doc, ...statusData };
              }
            } catch (e) {
              console.error('Error polling status for doc:', doc.id, e);
            }
          }
          return doc;
        })
      );

      if (hasUpdates) {
        setDocuments(updatedDocs);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [documents, token]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    setUploadError('');
    setUploadSuccess('');

    // Client-side validation
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported. Please upload an academic document in PDF format.');
      return;
    }

    const maxSizeMB = 50;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setUploadError(`File size exceeds the ${maxSizeMB}MB limit. Found ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      return;
    }

    if (!token) {
      setUploadError('You must be signed in to upload study documents.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const response = await apiClient.uploadDocument(file, token, (percent) => {
        setUploadProgress(Math.max(15, percent));
      });

      setUploadProgress(100);
      setUploadSuccess(`"${file.name}" uploaded successfully. Text extraction and chunking is underway.`);

      // Prepend to local documents state
      setDocuments((prev) => [
        {
          id: response.id,
          user_id: user?.id,
          title: response.title,
          file_size: response.file_size,
          page_count: 0,
          status: 'processing',
          created_at: response.created_at,
          updated_at: response.created_at,
          chunk_count: 0,
        },
        ...prev,
      ]);

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err.message || 'Failed to upload document to backend.');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1200);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete || !token) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteDocument(docToDelete.id, token);
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setDocToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetry = async (docId) => {
    if (!token) return;
    try {
      const updated = await apiClient.retryDocument(docId, token);
      setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)));
    } catch (err) {
      alert(err.message || 'Failed to retry document processing.');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-white">Study Workspace</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {major}
            </span>
            <Link
              to="/settings"
              className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300 hover:border-slate-700"
            >
              {studentName.charAt(0).toUpperCase()}
            </Link>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Welcome Message */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/20 to-slate-900/90 border border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Personal AI Academic Tutor</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome back, {studentName}!
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Upload your course syllabus, lecture slides, or textbooks. Zyllora extracts page references and divides text into searchable chunks.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/settings"
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Tutor Preferences
              </Link>
            </div>
          </div>

          {/* Upload Notifications */}
          {uploadError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button onClick={() => setUploadError('')} className="text-rose-400 hover:text-rose-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
              <button onClick={() => setUploadSuccess('')} className="text-emerald-400 hover:text-emerald-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload PDF Panel */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Upload Study Material</h3>
                <p className="text-xs text-slate-400">
                  Drop lecture slides, syllabus, or textbook chapters in PDF format.
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                Max 50MB • Max 200 Pages • PDF only
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center relative ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-950/20 scale-[1.005]'
                  : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <UploadCloud className="w-7 h-7" />
              </div>

              {isUploading ? (
                <div className="w-full max-w-sm space-y-3">
                  <p className="text-sm font-semibold text-white">Uploading & Validating Document...</p>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Transmitting PDF stream</span>
                    <span>{uploadProgress}%</span>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-white mb-1">
                    Drag and drop your academic PDF here, or
                  </p>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors my-2">
                    <span>Browse files</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-2">
                    Text extracted with page boundaries preserved (PyMuPDF). Chunks prepared for Week 3 AI tutor.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Document Library Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Your Document Library</h3>
                <p className="text-xs text-slate-400">
                  Manage uploaded textbooks, lecture slides, and notes.
                </p>
              </div>
              <button
                onClick={loadDocuments}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingDocs ? (
              <div className="p-12 rounded-2xl bg-slate-900/30 border border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                <p className="text-xs text-slate-400">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="p-12 rounded-2xl bg-slate-900/30 border border-slate-800/80 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-300">No documents uploaded yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Upload an academic PDF using the panel above. Once processed, it will appear here with page count, status, and searchable text chunks.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => {
                  const isReady = doc.status === 'ready';
                  const isProcessing = doc.status === 'processing';
                  const isFailed = doc.status === 'failed';

                  return (
                    <div
                      key={doc.id}
                      className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>

                          {/* Status Badge */}
                          {isReady && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Ready
                            </span>
                          )}

                          {isProcessing && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                              <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                              Extracting...
                            </span>
                          )}

                          {isFailed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 border border-rose-500/30 text-rose-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Failed
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-white truncate" title={doc.title}>
                            {doc.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Uploaded {formatDate(doc.created_at)}
                          </p>
                        </div>

                        {/* Metadata Pills */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                            {formatFileSize(doc.file_size)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                            {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                          </span>
                          {doc.chunk_count > 0 && (
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 flex items-center gap-1">
                              <Layers className="w-3 h-3 text-indigo-400" />
                              {doc.chunk_count} chunks
                            </span>
                          )}
                        </div>

                        {/* Error message callout if failed */}
                        {isFailed && doc.error_message && (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                            {doc.error_message}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isReady && (
                            <>
                              <Link
                                to={`/workspace/${doc.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>AI Tutor</span>
                              </Link>
                              <button
                                onClick={() => setActiveViewerDoc(doc)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
                                title="Inspect extracted pages and text chunks"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Pages</span>
                              </button>
                            </>
                          )}

                          {isFailed && (
                            <button
                              onClick={() => handleRetry(doc.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => setDocToDelete(doc)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Document Text & Chunk Inspector Modal */}
      {activeViewerDoc && (
        <DocumentViewerModal
          document={activeViewerDoc}
          token={token}
          onClose={() => setActiveViewerDoc(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Delete Document</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white font-medium">"{docToDelete.title}"</strong>? This will permanently delete the private PDF file and all extracted text chunks.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-white rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
