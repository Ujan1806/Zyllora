import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Sliders,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Menu,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';

export const SettingsPage = () => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Form states
  const [fullName, setFullName] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [explanationLevel, setExplanationLevel] = useState('intermediate');
  const [learningGoal, setLearningGoal] = useState('understanding');

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (profile || user) {
      setFullName(profile?.full_name || user?.user_metadata?.full_name || '');
      setFieldOfStudy(profile?.field_of_study || '');
      setExplanationLevel(profile?.explanation_level || 'intermediate');
      setLearningGoal(profile?.learning_goal || 'understanding');
    }
  }, [profile, user]);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await updateProfile({
        full_name: fullName,
        field_of_study: fieldOfStudy,
        explanation_level: explanationLevel,
        learning_goal: learningGoal,
      });
      setSuccessMessage('Settings updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Details', icon: User },
    { id: 'preferences', label: 'Learning Preferences', icon: Sliders },
    { id: 'account', label: 'Account & Security', icon: KeyRound },
    { id: 'privacy', label: 'Privacy & Data', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <Link to="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
              <span className="text-slate-700">/</span>
              <h1 className="text-base font-semibold text-white">Settings</h1>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Settings Tabs */}
          <div className="flex border-b border-slate-900 space-x-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback banners */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tab Content */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
            {activeTab === 'profile' && (
              <form onSubmit={handleSavePreferences} className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-white">Profile Information</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Update your student profile details and academic field.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || 'student@university.edu'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-slate-500 text-sm cursor-not-allowed"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Field of Study / Academic Discipline
                    </label>
                    <input
                      type="text"
                      value={fieldOfStudy}
                      onChange={(e) => setFieldOfStudy(e.target.value)}
                      placeholder="e.g. Computer Science, Mechanical Engineering..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'preferences' && (
              <form onSubmit={handleSavePreferences} className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-white">AI Tutor Preferences</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize the default difficulty and pedagogical approach for your explanations.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                      Explanation Complexity
                    </label>
                    <select
                      value={explanationLevel}
                      onChange={(e) => setExplanationLevel(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="beginner">Beginner — Intuitive analogies & definitions</option>
                      <option value="intermediate">Intermediate — Balanced academic rigor & clear examples</option>
                      <option value="advanced">Advanced — Deep technical derivations, proofs & formulas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                      Primary Learning Goal
                    </label>
                    <select
                      value={learningGoal}
                      onChange={(e) => setLearningGoal(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="understanding">Core Conceptual Understanding</option>
                      <option value="exam_prep">Exam Preparation & Practice Questions</option>
                      <option value="problem_solving">Step-by-Step Problem Solving</option>
                      <option value="revision">Rapid Revision & Key Takeaways</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Update Preferences'}</span>
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-white">Account & Authentication</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage your credentials and session state.
                  </p>
                </div>

                <div className="space-y-4 text-xs text-slate-300">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Authentication Provider</p>
                      <p className="text-slate-500 text-[11px]">Supabase Auth JWT</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-indigo-300">
                      Active
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Password Recovery</p>
                      <p className="text-slate-500 text-[11px]">Request a password change link sent to your email.</p>
                    </div>
                    <Link
                      to="/forgot-password"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 transition-colors"
                    >
                      Reset Password
                    </Link>
                  </div>

                  <div className="pt-4 border-t border-slate-900 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-rose-400">Sign Out</p>
                      <p className="text-slate-500 text-[11px]">Terminate current session on this device.</p>
                    </div>
                    <button
                      type="button"
                      onClick={signOut}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-white">Privacy & Course Material Security</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your academic files are encrypted and private to your account.
                  </p>
                </div>

                <div className="space-y-3 text-xs text-slate-400">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <p className="font-medium text-white">Document Isolation (Row Level Security)</p>
                    <p>All extracted chunks and PDFs are enforced with PostgreSQL RLS policies tied to your Supabase User ID.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <p className="font-medium text-white">AI Data Retention Policy</p>
                    <p>Your uploaded textbooks and query transcripts are not used to train external foundational AI models.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <p className="font-medium text-white">Data Deletion</p>
                    <p>Deleting a document permanently purges the raw PDF from Supabase Storage and all vector chunks from the database.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
