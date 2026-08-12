import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, Mail, Lock, Phone, MapPin, X, ArrowRight } from 'lucide-react';
import { apiRequest } from '../services/api';

export default function AuthModal({ isOpen, initialTab = 'citizen_login', onClose, onAuthSuccess }) {
  const [tab, setTab] = useState(initialTab); // 'citizen_login' | 'citizen_register' | 'officer_login'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department_id: '1'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let endpoint = '/auth/login';
    let body = { email: formData.email, password: formData.password };

    if (tab === 'citizen_register') {
      endpoint = '/auth/register';
      body = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone
      };
    } else if (tab === 'officer_login') {
      endpoint = '/officer/login';
      body = { email: formData.email, password: formData.password };
    }

    const res = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    setLoading(false);

    if (res && res.token) {
      localStorage.setItem('token', res.token);
      const userPayload = res.user || res.officer || {
        email: formData.email,
        name: formData.name || formData.email.split('@')[0],
        role: tab === 'officer_login' ? 'OFFICER' : 'CITIZEN',
        department_id: formData.department_id
      };
      onAuthSuccess(userPayload, res.token);
      onClose();
    } else if (res && res.message) {
      setError(res.message);
    } else {
      // Offline fallback simulation mode
      const simulatedUser = {
        email: formData.email,
        name: formData.name || (tab === 'officer_login' ? 'Senior Revenue Officer' : 'Sukanthan Suresh'),
        role: tab === 'officer_login' ? 'OFFICER' : 'CITIZEN',
        department_id: Number(formData.department_id) || 1
      };
      onAuthSuccess(simulatedUser, 'mock_jwt_token_12345');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-xl font-extrabold text-white tracking-tight">Portal Authentication</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setTab('citizen_login'); setError(''); }}
            className={`py-2 rounded-lg transition-all ${tab === 'citizen_login' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Citizen Login
          </button>
          <button
            type="button"
            onClick={() => { setTab('citizen_register'); setError(''); }}
            className={`py-2 rounded-lg transition-all ${tab === 'citizen_register' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => { setTab('officer_login'); setError(''); }}
            className={`py-2 rounded-lg transition-all ${tab === 'officer_login' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Officer Sign In
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {tab === 'citizen_register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sukanthan Suresh"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={tab === 'officer_login' ? 'officer.rajesh@gov.in' : 'citizen@example.com'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>
          </div>

          {tab === 'citizen_register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 ${
              tab === 'officer_login'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/30'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/30'
            }`}
          >
            <span>{loading ? 'Authenticating...' : tab === 'citizen_register' ? 'Create Citizen Account' : tab === 'officer_login' ? 'Sign In to Officer Portal' : 'Citizen Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
