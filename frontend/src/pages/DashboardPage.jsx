import React, { useState } from 'react';
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
  Plus,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';

export const DashboardPage = () => {
  const { user, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Student name fallback
  const studentName =
    profile?.full_name || user?.user_metadata?.full_name || 'Student';
  const major = profile?.field_of_study || 'University Studies';

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
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setSelectedFile(file);
      } else {
        alert('Please drop an academic PDF file.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
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
                Ready to deconstruct difficult concepts? Upload your course material or resume your recent study sessions.
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

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/30 transition-all flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Upload PDF</p>
                <p className="text-[11px] text-slate-500">Textbooks & slides</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/30 transition-all flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">AI Explanations</p>
                <p className="text-[11px] text-slate-500">Step-by-step reasoning</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/30 transition-all flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Generate Quiz</p>
                <p className="text-[11px] text-slate-500">Active recall MCQs</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/30 transition-all flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Socratic Mode</p>
                <p className="text-[11px] text-slate-500">Guided inquiry</p>
              </div>
            </div>
          </div>

          {/* Upload PDF Panel (Week 1 UI Skeleton, ready for Week 2 integration) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Upload Study Material</h3>
                <p className="text-xs text-slate-400">
                  Drop lecture slides, syllabus, or textbook chapters in PDF format.
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                Max 50MB • PDF only
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-950/20'
                  : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <UploadCloud className="w-7 h-7" />
              </div>

              {selectedFile ? (
                <div className="space-y-3 max-w-sm">
                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center space-x-3 text-left">
                    <FileText className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-medium text-white truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for processing
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-indigo-300">
                    PDF selected! Full text extraction and chunking pipeline will activate in Week 2.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-slate-400 hover:text-rose-400"
                  >
                    Select a different file
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-white mb-1">
                    Drag and drop your academic PDF here, or
                  </p>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors my-2">
                    <span>Browse files</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-2">
                    PDF text extraction (PyMuPDF) and token chunking will process in Week 2.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Recent Documents & Study Sessions Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Documents */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Recent Documents</h3>
                <span className="text-xs text-slate-500">0 documents</span>
              </div>

              <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800/80 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-medium text-slate-300">No documents indexed yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Upload your first syllabus or textbook PDF above to activate your personal AI tutor.
                </p>
              </div>
            </section>

            {/* Recent Study Sessions */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Recent Study Sessions</h3>
                <span className="text-xs text-slate-500">0 sessions</span>
              </div>

              <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800/80 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-medium text-slate-300">No active study sessions</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Your interactive chat sessions with page citations will appear here once you begin querying your PDFs.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};
