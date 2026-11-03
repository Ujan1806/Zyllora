import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Sparkles,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Layers,
  GraduationCap,
  Search,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-20 md:pt-28 md:pb-32 overflow-hidden border-b border-slate-900">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            {/* Tagline pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Your study material. Your personal AI tutor.</span>
            </div>

            {/* Main Hero Heading */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Your PDFs just got a <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-200 to-indigo-400">
                personal tutor.
              </span>
            </h1>

            {/* Supporting description */}
            <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Upload dense lecture slides, textbooks, and research papers. Interact with an AI tutor that explains complex concepts, solves problems step-by-step, and generates quizzes based on your course syllabus.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-150 group"
              >
                <span>Start learning for free</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-base font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl transition-colors"
              >
                See how it works
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Grounded in your uploaded PDFs
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Precise page references
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Zero fluff or fabricated citations
              </span>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-2">
              Core Capabilities
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Engineered for demanding university coursework
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/40 transition-colors flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Personal Tutoring</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Interact with an AI assistant that adapts to your requested explanation level: Beginner, Detailed, Step-by-Step, or Socratic. Never get stuck on dense jargon again.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/40 transition-colors flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Verifiable Page Citations</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every explanation and answer is linked directly to exact page numbers in your uploaded document. Click citations to inspect the source material immediately.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/40 transition-colors flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Targeted Practice Quizzes</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Generate tailored multiple-choice assessments from any chapter or entire syllabus. Review comprehensive breakdowns for right and wrong answers.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-slate-900/30 border-y border-slate-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-2">
                Simple Workflow
              </h2>
              <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                How Zyllora transforms your study habits
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="relative p-6 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col">
                <div className="text-3xl font-mono font-bold text-indigo-500/40 mb-4">01</div>
                <h4 className="text-lg font-semibold text-white mb-2">Upload Your PDF</h4>
                <p className="text-sm text-slate-400">
                  Drop your course syllabus, lecture slides, or textbook chapters. Zyllora extracts and indexes every page.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative p-6 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col">
                <div className="text-3xl font-mono font-bold text-indigo-500/40 mb-4">02</div>
                <h4 className="text-lg font-semibold text-white mb-2">Engage With Your Tutor</h4>
                <p className="text-sm text-slate-400">
                  Ask questions, request intuitive analogies, or ask for step-by-step problem derivations backed by your material.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative p-6 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col">
                <div className="text-3xl font-mono font-bold text-indigo-500/40 mb-4">03</div>
                <h4 className="text-lg font-semibold text-white mb-2">Test Your Mastery</h4>
                <p className="text-sm text-slate-400">
                  Generate instant revision quizzes to test exam readiness and identify weak topics before exam day.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-10 md:p-14 rounded-3xl bg-gradient-to-b from-indigo-950/40 to-slate-900/60 border border-indigo-500/30">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to elevate your academic performance?
            </h3>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
              Join university students who use Zyllora to understand complex material faster and prepare for exams with confidence.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-150"
            >
              Start learning for free
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
