import React, { useState, useEffect } from 'react';
import { User, Edit3, Trash2, X, Check } from 'lucide-react';
import { apiRequest } from '../services/api';

export default function UserProfileModal({ isOpen, user, onClose, onProfileUpdated, onAccountDeleted }) {
  const [tab, setTab] = useState('view'); // 'view' | 'edit' | 'danger'
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || user.full_name || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || ''
      });
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const res = await apiRequest('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(formData)
    });

    setLoading(false);

    if (res && (res.success || res.user || res.data)) {
      const updated = res.user || res.data || { ...user, ...formData };
      onProfileUpdated(updated);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setTab('view'), 1200);
    } else if (res && res.message) {
      setError(res.message);
    } else {
      // Offline fallback
      onProfileUpdated({ ...user, ...formData });
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setTab('view'), 1200);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    await apiRequest('/auth/profile', {
      method: 'DELETE'
    });
    setLoading(false);
    onAccountDeleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">{user.name || user.email}</h2>
              <span className="text-xs text-emerald-400 font-mono">
                {user.role === 'OFFICER' ? `Officer (Dept #${user.department_id || 1})` : 'Citizen Verified Account'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab('view')}
            className={`py-2 rounded-lg transition-all ${tab === 'view' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            View Profile
          </button>
          <button
            type="button"
            onClick={() => setTab('edit')}
            className={`py-2 rounded-lg transition-all ${tab === 'edit' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => setTab('danger')}
            className={`py-2 rounded-lg transition-all ${tab === 'danger' ? 'bg-rose-600/30 text-rose-300 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Account Settings
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1.5">
            <Check className="w-4 h-4" /> {successMsg}
          </div>
        )}

        {/* TAB 1: View Profile */}
        {tab === 'view' && (
          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Full Name</span>
              <span className="font-semibold text-white">{user.name || user.full_name || 'N/A'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Email Address</span>
              <span className="font-mono text-emerald-400">{user.email}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Phone Number</span>
              <span className="font-mono text-slate-200">{user.phone || 'Not set'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">City / Location</span>
              <span className="text-slate-200">{user.city ? `${user.city}, ${user.state || ''}` : 'Not set'}</span>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setTab('edit')}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" /> Edit Profile Details
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Edit Profile Form */}
        {tab === 'edit' && (
          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full p-2.5 rounded-xl glass-input text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Residential Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="House No, Street Name"
                className="w-full p-2.5 rounded-xl glass-input text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  className="w-full p-2 rounded-xl glass-input text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                  className="w-full p-2 rounded-xl glass-input text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Pincode</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="Pincode"
                  className="w-full p-2 rounded-xl glass-input text-xs"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all"
              >
                {loading ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: Danger Zone (Delete Account) */}
        {tab === 'danger' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-2">
              <h4 className="font-bold text-sm text-rose-400">Deactivate / Delete Account</h4>
              <p className="text-slate-400 leading-relaxed">
                Deactivating your profile will remove your active session credentials and archived requests.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30"
            >
              <Trash2 className="w-4 h-4" />
              <span>{loading ? 'Deleting...' : 'Delete My Account'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
