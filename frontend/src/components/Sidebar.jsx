import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Settings,
  LogOut,
  Sparkles,
  BarChart3,
  User,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Study Sessions', path: '/dashboard#sessions', icon: BookOpen },
    { label: 'Quizzes & Practice', path: '/dashboard#quizzes', icon: HelpCircle, badge: 'Week 5' },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-900 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-900">
          <NavLink to="/dashboard" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Zyllora</span>
          </NavLink>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Usage Indicator Widget */}
        <div className="mx-4 mb-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              Monthly Quota
            </span>
            <span className="text-indigo-400 font-semibold">Tier: Free</span>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                <span>PDF Documents</span>
                <span>0 / 5</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                <span>Tutor Queries</span>
                <span>0 / 50</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-700/50 flex items-center justify-center flex-shrink-0 text-indigo-300">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.full_name || user?.user_metadata?.full_name || 'Student'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {user?.email || 'alex.mercer@university.edu'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
