import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Activity, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';

export const Navbar = () => {
  const { user, signOut, isSupabaseConfigured } = useAuth();
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    let isMounted = true;
    apiClient.checkHealth().then((res) => {
      if (isMounted) {
        setBackendStatus(res.status === 'ok' ? 'online' : 'offline');
      }
    });
    return () => { isMounted = false; };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-brand-600/10 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:border-brand-500/60 transition-colors">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Zyllora
            </span>
          </div>
        </Link>

        {/* Backend & Supabase Status Pill */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-900 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'}`}></span>
            <span className="text-slate-400">
              API: <strong className="text-slate-200 capitalize font-medium">{backendStatus}</strong>
            </span>
          </div>

          {!isSupabaseConfigured && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300" title="Supabase credentials not configured in frontend/.env">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Auth: Preview Mode</span>
            </div>
          )}
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <Link
                to="/dashboard"
                className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={signOut}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-slate-800 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link
                to="/login"
                className="px-3.5 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all duration-150"
              >
                Start learning for free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
