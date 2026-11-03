import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Target,
  Check,
  Compass,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const OnboardingPage = () => {
  const { updateProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [explanationLevel, setExplanationLevel] = useState('intermediate');
  const [learningGoal, setLearningGoal] = useState('understanding');
  const [saving, setSaving] = useState(false);

  const popularFields = [
    'Computer Science',
    'Medicine & Health Sciences',
    'Mechanical Engineering',
    'Economics & Finance',
    'Law & Legal Studies',
    'Biology & Genetics',
    'Physics & Mathematics',
    'Business Administration',
  ];

  const explanationLevels = [
    {
      id: 'beginner',
      title: 'Beginner',
      description: 'Clear analogies, intuitive examples, and definitions for unfamiliar terminology.',
    },
    {
      id: 'intermediate',
      title: 'Intermediate',
      description: 'Balanced academic depth, formal terminology with practical intuitions.',
    },
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'Rigorous explanations, technical precision, formulas, and proofs.',
    },
  ];

  const learningGoals = [
    {
      id: 'understanding',
      title: 'Core Conceptual Understanding',
      desc: 'Build strong intuitions for difficult topics and foundational theory.',
    },
    {
      id: 'exam_prep',
      title: 'Exam Preparation & Practice',
      desc: 'Focus on high-yield exam material, practice questions, and answer structuring.',
    },
    {
      id: 'problem_solving',
      title: 'Step-by-step Problem Solving',
      desc: 'Deconstruct numericals, proofs, and assignments into clear logical steps.',
    },
    {
      id: 'revision',
      title: 'Rapid Revision & Summaries',
      desc: 'Extract key points, cheat sheets, and active recall cues for fast review.',
    },
  ];

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateProfile({
        field_of_study: fieldOfStudy || 'General Studies',
        explanation_level: explanationLevel,
        learning_goal: learningGoal,
        onboarding_completed: true,
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      // Fallback navigate to dashboard so user is not stuck
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Progress Indicator */}
      <div className="max-w-xl mx-auto w-full mb-8 relative z-10">
        <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-3">
          <span>Step {step} of 3</span>
          <button
            type="button"
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            Skip for now &rarr;
          </button>
        </div>
        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-xl mx-auto w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 backdrop-blur-xl relative z-10 shadow-2xl">
        {/* Step 1: Field of Study */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                What are you studying?
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Your AI tutor will calibrate its explanations and vocabulary to your major.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Field of Study / Major
              </label>
              <input
                type="text"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                placeholder="e.g. Molecular Biology, Artificial Intelligence, Economics..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
            </div>

            <div>
              <span className="block text-xs text-slate-500 mb-2">Or select a popular field:</span>
              <div className="flex flex-wrap gap-2">
                {popularFields.map((field) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => setFieldOfStudy(field)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      fieldOfStudy === field
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {field}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Skip question
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/20"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Explanation Level */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <Compass className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Preferred Explanation Level
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose how dense or simplified you want default explanations to be. You can change this per query.
              </p>
            </div>

            <div className="space-y-3">
              {explanationLevels.map((lvl) => {
                const isSelected = explanationLevel === lvl.id;
                return (
                  <div
                    key={lvl.id}
                    onClick={() => setExplanationLevel(lvl.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{lvl.title}</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {lvl.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-white"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/20"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Learning Goal */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                What is your primary learning goal?
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                This helps Zyllora prioritize quizzes, step breakdowns, or conceptual analogies.
              </p>
            </div>

            <div className="space-y-3">
              {learningGoals.map((g) => {
                const isSelected = learningGoal === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => setLearningGoal(g.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{g.title}</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{g.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-slate-400 hover:text-white"
              >
                &larr; Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-md shadow-indigo-600/20"
              >
                <span>{saving ? 'Setting up...' : 'Go to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
