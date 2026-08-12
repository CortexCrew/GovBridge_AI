import React from 'react';
import { Landmark, User, ShieldCheck, LogOut, Sparkles, Building2 } from 'lucide-react';

export default function Navbar({ activePortal, setActivePortal, user, onOpenAuth, onLogout }) {
  return (
    <nav className="sticky top-0 z-40 glass-panel border-b border-slate-800 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActivePortal('citizen')}>
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Landmark className="w-5 h-5 text-slate-950" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-75" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white font-heading">GovBridge</span>
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Smart Citizen Service Portal</p>
          </div>
        </div>

        {/* Navigation Portal Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActivePortal('citizen')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activePortal === 'citizen'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Citizen Portal</span>
          </button>
          
          <button
            onClick={() => setActivePortal('officer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activePortal === 'officer'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Officer Workbench</span>
          </button>
        </div>

        {/* User Auth Action Bar */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-200">{user.name || user.email}</span>
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {user.role === 'OFFICER' ? `Officer (Dept #${user.department_id || 1})` : 'Citizen Verified'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-700/50 hover:border-rose-500/30 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium border border-slate-700 transition-all hover:shadow-lg hover:shadow-slate-900/50"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>Login / Register</span>
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}
