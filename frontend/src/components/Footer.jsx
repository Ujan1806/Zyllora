import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="w-full border-t border-slate-900 bg-slate-950 mt-auto py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Tagline */}
          <div className="flex flex-col items-center md:items-start space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Zyllora</span>
            </div>
            <p className="text-xs text-slate-500">
              Your study material. Your personal AI tutor.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center space-x-6 text-sm text-slate-400">
            <a href="#privacy" className="hover:text-slate-200 transition-colors">
              Privacy Policy
            </a>
            <span className="text-slate-800">•</span>
            <a href="#terms" className="hover:text-slate-200 transition-colors">
              Terms of Service
            </a>
            <span className="text-slate-800">•</span>
            <a href="mailto:support@zyllora.ai" className="hover:text-slate-200 transition-colors">
              Contact
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-slate-600 text-center md:text-right">
            &copy; {new Date().getFullYear()} Zyllora Inc. All rights reserved. Built for university learners.
          </p>
        </div>
      </div>
    </footer>
  );
};
