import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  Trash2,
  ChevronRight,
  Layers,
  HelpCircle,
  Compass,
  MessageSquare,
  Bookmark,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';

export const TutorWorkspacePage = () => {
  const { documentId, sessionId: routeSessionId } = useParams();
  const navigate = useNavigate();
  const { user, token, profile } = useAuth();

  // Document state
  const [document, setDocument] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(true);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(routeSessionId || null);

  // Chat conversation state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Mode state: default to profile's explanation_level or "detailed"
  const [selectedMode, setSelectedMode] = useState(profile?.explanation_level || 'detailed');

  // Right-side source panel state
  const [inspectedCitation, setInspectedCitation] = useState(null);
  const [sourcePageContent, setSourcePageContent] = useState(null);
  const [loadingSourcePage, setLoadingSourcePage] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // Mobile drawer states
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);

  const messagesEndRef = useRef(null);

  // 1. Load Document details
  useEffect(() => {
    if (!documentId || !token) return;
    setLoadingDoc(true);
    apiClient
      .getDocument(documentId, token)
      .then((doc) => {
        setDocument(doc);
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Failed to load document');
      })
      .finally(() => setLoadingDoc(false));
  }, [documentId, token]);

  // 2. Load or create Study Sessions for this document
  useEffect(() => {
    if (!documentId || !token) return;

    apiClient
      .listTutorSessions(documentId, token)
      .then(async (sessList) => {
        setSessions(sessList);
        if (sessList.length > 0) {
          // If a specific session was passed in URL and exists, select it; else pick latest
          const matched = routeSessionId ? sessList.find((s) => s.id === routeSessionId) : null;
          const targetId = matched ? matched.id : sessList[0].id;
          setActiveSessionId(targetId);
        } else {
          // Auto-create initial session
          const newSess = await apiClient.createTutorSession(
            documentId,
            'Initial Study Session',
            selectedMode,
            token
          );
          setSessions([newSess]);
          setActiveSessionId(newSess.id);
        }
      })
      .catch((err) => {
        console.error('Session loading error:', err);
      });
  }, [documentId, token]);

  // 3. Load message history when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId || !token) return;
    setLoadingMessages(true);
    apiClient
      .getTutorSession(activeSessionId, token)
      .then((detail) => {
        setMessages(detail.messages || []);
        if (detail.session?.mode) {
          setSelectedMode(detail.session.mode);
        }
      })
      .catch((err) => {
        console.error('Failed to load session messages:', err);
      })
      .finally(() => setLoadingMessages(false));
  }, [activeSessionId, token]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Handler: Create new session
  const handleCreateNewSession = async () => {
    if (!token || !documentId) return;
    try {
      const newSess = await apiClient.createTutorSession(
        documentId,
        `Session ${sessions.length + 1}`,
        selectedMode,
        token
      );
      setSessions([newSess, ...sessions]);
      setActiveSessionId(newSess.id);
      setMessages([]);
      setLeftDrawerOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to create session');
    }
  };

  // Handler: Delete session
  const handleDeleteSession = async (e, sessId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this study session and message history?')) return;
    try {
      await apiClient.deleteTutorSession(sessId, token);
      const remaining = sessions.filter((s) => s.id !== sessId);
      setSessions(remaining);
      if (activeSessionId === sessId) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          handleCreateNewSession();
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to delete session');
    }
  };

  // Handler: Inspect Citation
  const handleInspectCitation = async (citation) => {
    setInspectedCitation(citation);
    setRightPanelOpen(true);
    setLoadingSourcePage(true);
    try {
      const pageInfo = await apiClient.getDocumentPage(documentId, citation.page_number, token);
      setSourcePageContent(pageInfo);
    } catch (err) {
      console.warn('Could not load source page context:', err);
    } finally {
      setLoadingSourcePage(false);
    }
  };

  // Handler: Send Message
  const handleSendMessage = async (customPrompt = null) => {
    const question = (customPrompt || inputText).trim();
    if (!question || isSending || !activeSessionId || !token) return;

    setInputText('');
    setErrorMsg('');

    // Append optimistic user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      session_id: activeSessionId,
      role: 'user',
      content: question,
      metadata: { mode: selectedMode },
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsSending(true);

    try {
      const tutorResp = await apiClient.sendTutorChat(
        documentId,
        activeSessionId,
        question,
        selectedMode,
        token
      );

      const assistantMsg = {
        id: `assist-${Date.now()}`,
        session_id: activeSessionId,
        role: 'assistant',
        content: tutorResp.answer,
        metadata: {
          key_points: tutorResp.key_points,
          example: tutorResp.example,
          citations: tutorResp.citations,
          grounded: tutorResp.grounded,
          mode: selectedMode,
        },
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to receive tutor response. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const modes = [
    { id: 'beginner', label: 'Beginner', desc: 'Simple analogies & definitions' },
    { id: 'detailed', label: 'Detailed', desc: 'Thorough academic depth' },
    { id: 'step_by_step', label: 'Step-by-Step', desc: 'Numbered logical derivation' },
    { id: 'example_based', label: 'Example-Based', desc: 'Practical worked examples' },
  ];

  const quickPrompts = [
    'Explain the core concept simply',
    'Give a real-world concrete example',
    'Break this problem down step-by-step',
    'Summarize the key formulas and rules',
  ];

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-slate-900 bg-slate-950/90 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-slate-800">/</span>
          <div className="flex items-center space-x-2 truncate">
            <div className="w-6 h-6 rounded bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
              {document?.title || 'Loading document...'}
            </h2>
            {document?.page_count && (
              <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                {document.page_count} pages
              </span>
            )}
          </div>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex items-center space-x-2">
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  selectedMode === m.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={m.desc}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs flex items-center gap-1"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Sessions</span>
          </button>
        </div>
      </header>

      {/* Main Workspace 3-Column Split */}
      <div className="flex-1 flex min-h-0 relative">
        {/* ================================================================= */}
        {/* LEFT COLUMN: Study Sessions & Document Outline */}
        {/* ================================================================= */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-950 border-r border-slate-900 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            leftDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-slate-900 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Study Sessions</span>
            </span>
            <button
              onClick={handleCreateNewSession}
              className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1 transition-colors"
              title="New Session"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              return (
                <div
                  key={sess.id}
                  onClick={() => {
                    setActiveSessionId(sess.id);
                    setLeftDrawerOpen(false);
                  }}
                  className={`group p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
                      : 'bg-slate-900/30 border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-medium truncate">{sess.title}</p>
                    <p className="text-[10px] text-slate-500 capitalize mt-0.5">
                      {sess.mode} mode • {sess.message_count || 0} messages
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, sess.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-opacity"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Left panel footer */}
          <div className="p-3 border-t border-slate-900 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              RAG Vector Engine
            </span>
            <span className="text-emerald-400 font-medium">Ready</span>
          </div>
        </aside>

        {/* Mobile Backdrop for left drawer */}
        {leftDrawerOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setLeftDrawerOpen(false)}
          />
        )}

        {/* ================================================================= */}
        {/* CENTER COLUMN: Chat Conversation Stream & Question Input */}
        {/* ================================================================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {loadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                <p>Loading session conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Ask your personal AI Tutor</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Ask questions about your uploaded PDF. Zyllora searches the text, provides step-by-step reasoning, and cites genuine page numbers.
                  </p>
                </div>

                {/* Quick Prompts */}
                <div className="w-full space-y-2 pt-2">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                    Suggested Questions
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {quickPrompts.map((qp) => (
                      <button
                        key={qp}
                        onClick={() => handleSendMessage(qp)}
                        className="p-2.5 text-xs text-left text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-indigo-500/40 hover:bg-slate-900 transition-colors flex items-center justify-between"
                      >
                        <span>{qp}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                const meta = msg.metadata || {};

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
                  >
                    <div
                      className={`max-w-2xl w-full rounded-2xl p-5 text-sm ${
                        isUser
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ml-8'
                          : 'bg-slate-900/80 border border-slate-800 text-slate-100 shadow-sm mr-8'
                      }`}
                    >
                      {/* Message Header */}
                      <div className="flex items-center justify-between mb-2 text-xs">
                        <span className="font-semibold flex items-center gap-1.5">
                          {isUser ? (
                            'You'
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="text-indigo-300 font-medium">Zyllora Tutor</span>
                            </>
                          )}
                        </span>

                        {!isUser && meta.grounded !== undefined && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              meta.grounded
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                            }`}
                          >
                            {meta.grounded ? '✓ Grounded in Document' : 'General Context'}
                          </span>
                        )}
                      </div>

                      {/* Main Answer Text */}
                      <div className="leading-relaxed whitespace-pre-wrap font-sans text-sm">
                        {msg.content}
                      </div>

                      {/* Key Points Callout */}
                      {meta.key_points && meta.key_points.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-indigo-400">
                            Key Takeaways
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                            {meta.key_points.map((pt, idx) => (
                              <li key={idx} className="leading-relaxed">
                                {pt}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Worked Example Callout */}
                      {meta.example && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Example / Application
                          </span>
                          <p className="text-slate-300 leading-relaxed">{meta.example}</p>
                        </div>
                      )}

                      {/* Verified Page Citations */}
                      {meta.citations && meta.citations.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-medium">Source Citations:</span>
                          {meta.citations.map((cite, i) => (
                            <button
                              key={i}
                              onClick={() => handleInspectCitation(cite)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30 hover:border-indigo-500/70 text-indigo-300 text-xs font-semibold transition-colors"
                              title={`Click to view Page ${cite.page_number} source text`}
                            >
                              <Bookmark className="w-3 h-3 text-indigo-400" />
                              <span>Page {cite.page_number}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Live Typing / Generation Indicator */}
            {isSending && (
              <div className="flex justify-start w-full">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3 text-xs text-indigo-300">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Searching document chunks & formulating explanation...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-4 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md">
            {errorMsg && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2 max-w-4xl mx-auto"
            >
              <div className="flex-1 relative">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Ask a question about ${document?.title || 'this PDF'}... (Enter to send, Shift+Enter for new line)`}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 resize-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </main>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: Citation & Source Text Inspector Panel */}
        {/* ================================================================= */}
        {rightPanelOpen && inspectedCitation && (
          <aside className="w-80 lg:w-96 border-l border-slate-900 bg-slate-950 flex flex-col z-30 shadow-2xl">
            <div className="p-4 border-b border-slate-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                  Source Citation (Page {inspectedCitation.page_number})
                </h3>
              </div>
              <button
                onClick={() => setRightPanelOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1.5">
                <span className="text-[11px] font-semibold text-indigo-300">Supporting Excerpt:</span>
                <p className="text-xs text-slate-200 italic leading-relaxed">
                  "{inspectedCitation.excerpt}"
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Full Extracted Text (Page {inspectedCitation.page_number})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {sourcePageContent?.content?.length || 0} chars
                  </span>
                </div>

                {loadingSourcePage ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading page text...
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
                    {sourcePageContent?.content || 'No text extracted for this page.'}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
