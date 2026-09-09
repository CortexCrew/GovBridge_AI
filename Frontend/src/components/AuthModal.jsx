import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Lock, X, ArrowRight, Timer, RefreshCw, Smartphone } from 'lucide-react';
import { apiRequest } from '../services/api';

export default function AuthModal({ isOpen, initialTab = 'citizen_login', onClose, onAuthSuccess }) {
  const [tab, setTab] = useState(initialTab); // 'citizen_login' | 'citizen_register' | 'officer_login'
  const [regStep, setRegStep] = useState(1); // 1 = Registration Form, 2 = OTP Verification
  
  const [formData, setFormData] = useState({
    name: '',
    identifier: '', // Email or Phone
    password: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    department_id: '1',
    otpCode: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resetStep, setResetStep] = useState('idle');
  const [resetData, setResetData] = useState({ otpCode: '', newPassword: '', confirmPassword: '' });
  const [resetExpiresSeconds, setResetExpiresSeconds] = useState(0);
  const [resetResendSeconds, setResetResendSeconds] = useState(0);

  // OTP Timer State
  const [timerMetadata, setTimerMetadata] = useState(null); // { sentVia, maskedTarget, expiresInSeconds, resendAvailableInSeconds }
  const [expiresSecondsLeft, setExpiresSecondsLeft] = useState(0);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const otpInputs = useRef([]);
  const [verifiedUser, setVerifiedUser] = useState(null);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
      setRegStep(1);
      setVerifiedUser(null);
      setError('');
      setSuccessMsg('');
    }
  }, [initialTab, isOpen]);

  // Live Timer Countdown Effect
  useEffect(() => {
    if (regStep !== 2) return;

    const interval = setInterval(() => {
      setExpiresSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setResendSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [regStep]);

  useEffect(() => {
    if (resetStep !== 'verify') return;
    const interval = setInterval(() => {
      setResetExpiresSeconds(previous => Math.max(previous - 1, 0));
      setResetResendSeconds(previous => Math.max(previous - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resetStep]);

  if (!isOpen) return null;

  const resetState = () => {
    setError('');
    setSuccessMsg('');
    setLoading(false);
    setRegStep(1);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const payload = {
      name: formData.name,
      password: formData.password,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
    };

    // Parse if user entered email or phone in identifier
    const rawId = formData.identifier.trim();
    if (rawId.includes('@')) {
      payload.email = rawId;
      if (formData.phone) payload.phone = formData.phone;
    } else {
      payload.phone = rawId;
    }

    const res = await apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setLoading(false);

    if (res && res.success) {
      setSuccessMsg(res.message || 'OTP verification code sent');
      const timerInfo = res.timer || {};
      setTimerMetadata({
        sentVia: res.sentVia || 'WHATSAPP',
        maskedTarget: res.maskedTarget || rawId,
        expiresInSeconds: timerInfo.expiresInSeconds || 300,
        resendAvailableInSeconds: timerInfo.resendAvailableInSeconds || 60,
      });

      setExpiresSecondsLeft(timerInfo.expiresInSeconds || 300);
      setResendSecondsLeft(timerInfo.resendAvailableInSeconds || 60);

      // Clear OTP field every time step 2 is shown
      setFormData(prev => ({ ...prev, otpCode: '' }));
      setRegStep(2);
    } else if (res && res.message) {
      setError(res.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        identifier: formData.identifier,
        otpCode: formData.otpCode
      })
    });

    setLoading(false);

    if (res && res.success) {
      // Auto login user after verification
      const loginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: formData.identifier,
          password: formData.password
        })
      });

      if (loginRes && loginRes.token) {
        localStorage.setItem('token', loginRes.token);
        setVerifiedUser(loginRes.user || res.user);
        setRegStep(3);
      } else {
        setSuccessMsg('Account created successfully! Please sign in.');
        setTab('citizen_login');
        setRegStep(1);
      }
    } else if (res && res.message) {
      setError(res.message);
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await apiRequest('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      })
    });
    setLoading(false);
    if (res?.success) {
      onAuthSuccess(res.user || verifiedUser);
      onClose();
    } else {
      setError(res?.message || 'Unable to save your profile. Please try again.');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let endpoint = '/auth/login';
    let body = { identifier: formData.identifier, password: formData.password };

    if (tab === 'officer_login') {
      endpoint = '/officer/login';
      body = { email: formData.identifier, password: formData.password };
    }

    const res = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    setLoading(false);

    if (res && res.token) {
      localStorage.setItem('token', res.token);
      const userPayload = res.user || res.officer || {
        email: formData.identifier,
        name: formData.name || formData.identifier.split('@')[0],
        role: tab === 'officer_login' ? 'OFFICER' : 'CITIZEN',
        department_id: formData.department_id
      };
      onAuthSuccess(userPayload, res.token);
      onClose();
    } else if (res && res.message) {
      setError(res.message);
    }
  };

  const requestPasswordReset = async () => {
    setLoading(true); setError(''); setSuccessMsg('');
    const res = await apiRequest('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ identifier: formData.identifier, role: tab === 'officer_login' ? 'OFFICER' : 'CITIZEN' }) });
    setLoading(false);
    if (res?.success) {
      setResetStep('verify');
      setResetExpiresSeconds(300);
      setResetResendSeconds(60);
      setSuccessMsg(res.message);
    }
    else setError(res?.message || 'Unable to send verification code.');
  };

  const confirmPasswordReset = async (event) => {
    event.preventDefault();
    if (resetData.newPassword !== resetData.confirmPassword) { setError('New passwords do not match.'); return; }
    setLoading(true); setError(''); setSuccessMsg('');
    const res = await apiRequest('/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ identifier: formData.identifier, role: tab === 'officer_login' ? 'OFFICER' : 'CITIZEN', otpCode: resetData.otpCode, newPassword: resetData.newPassword }) });
    setLoading(false);
    if (res?.success) { setResetStep('idle'); setResetData({ otpCode: '', newPassword: '', confirmPassword: '' }); setSuccessMsg(res.message); }
    else setError(res?.message || 'Unable to change password.');
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const updateOtp = (value, index) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 1) {
      const next = digits.slice(0, 6);
      setFormData(prev => ({ ...prev, otpCode: next }));
      otpInputs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    const characters = formData.otpCode.padEnd(6, ' ').split('');
    characters[index] = digits || ' ';
    setFormData(prev => ({ ...prev, otpCode: characters.join('').trimEnd() }));
    if (digits && index < 5) otpInputs.current[index + 1]?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="auth-card glass-panel max-w-md w-full rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div><p className="auth-kicker">GovBridge secure access</p><h2 className="text-xl font-extrabold text-white tracking-tight">{tab === 'citizen_register' ? 'Create your GovBridge account' : tab === 'officer_login' ? 'GovBridge Officer Portal' : 'Welcome back'}</h2></div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {tab === 'citizen_register' && <div className="auth-progress">{['Details', 'Verify OTP', 'Complete'].map((label, index) => <div className={index + 1 <= regStep ? 'active' : ''} key={label}><span>0{index + 1}</span><small>{label}</small></div>)}</div>}

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setTab('citizen_login'); resetState(); }}
            className={`py-2 rounded-lg transition-all ${tab === 'citizen_login' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Citizen Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('citizen_register'); resetState(); }}
            className={`py-2 rounded-lg transition-all ${tab === 'citizen_register' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            OTP Register
          </button>
          <button
            type="button"
            onClick={() => { setTab('officer_login'); resetState(); }}
            className={`py-2 rounded-lg transition-all ${tab === 'officer_login' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Officer Portal
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            {successMsg}
          </div>
        )}

        {/* --- CITIZEN REGISTER STEP 1 --- */}
        {tab === 'citizen_register' && regStep === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <p className="auth-intro">Choose how you want to verify your account. Use an Indian mobile number or an email address.</p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Full name <b>*</b></label>
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Email address or Indian mobile number <b>*</b></label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  placeholder="9876543210 or user@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Password <b>*</b></label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-xs font-bold text-white transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Sending OTP Verification...' : 'Send OTP Verification Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* --- CITIZEN REGISTER STEP 2 (OTP & LIVE TIMER) --- */}
        {tab === 'citizen_register' && regStep === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400">
                {timerMetadata?.sentVia === 'SMS' ? <Smartphone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                <span>Sent via {timerMetadata?.sentVia === 'SMS' ? 'Mobile SMS' : 'Email'} to {timerMetadata?.maskedTarget}</span>
              </div>

              {/* Realistic Timer Bar */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Expires in:</span>
                  <span className="font-mono text-amber-400 font-bold">{formatTimer(expiresSecondsLeft)}</span>
                </div>

                <button
                  type="button"
                  disabled={resendSecondsLeft > 0 || loading}
                  onClick={handleSendOtp}
                  className="text-xs text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {resendSecondsLeft > 0 ? `Resend (${resendSecondsLeft}s)` : 'Resend OTP'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-center"><h3 className="auth-otp-title">Verify your OTP</h3><p className="text-xs text-slate-400">Enter the 6-digit verification code sent to your registered contact.</p></div>
              <div className="otp-boxes">{Array.from({ length: 6 }, (_, index) => <input key={index} ref={element => { otpInputs.current[index] = element; }} value={formData.otpCode[index] || ''} onChange={e => updateOtp(e.target.value, index)} onKeyDown={e => { if (e.key === 'Backspace' && !formData.otpCode[index] && index > 0) otpInputs.current[index - 1]?.focus(); }} onPaste={e => { e.preventDefault(); updateOtp(e.clipboardData.getData('text'), index); }} inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1} aria-label={`OTP digit ${index + 1}`} />)}</div>
            </div>

            <button
              type="submit"
              disabled={loading || expiresSecondsLeft === 0 || formData.otpCode.length !== 6}
              className="w-full py-3 rounded-xl text-xs font-bold text-white transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Verifying OTP...' : 'Verify & create account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setRegStep(1)}
              className="w-full text-xs text-slate-400 hover:text-slate-200 text-center"
            >
              ← Change contact details
            </button>
          </form>
        )}

        {tab === 'citizen_register' && regStep === 3 && (
          <form onSubmit={handleCompleteProfile} className="space-y-3">
            <div className="auth-success"><span>✓</span><div><h3>Welcome to GovBridge!</h3><p>Your account has been created successfully. Complete the supported details below to finish your profile.</p></div></div>
            <div className="space-y-1"><label className="text-xs font-semibold text-slate-300">Address</label><input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="House no., street, locality" className="w-full p-2.5 rounded-xl glass-input text-xs" /></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-xs font-semibold text-slate-300">City</label><input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="City" className="w-full p-2.5 rounded-xl glass-input text-xs" /></div><div className="space-y-1"><label className="text-xs font-semibold text-slate-300">State</label><input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} placeholder="State" className="w-full p-2.5 rounded-xl glass-input text-xs" /></div></div>
            <div className="space-y-1"><label className="text-xs font-semibold text-slate-300">Pincode</label><input value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })} inputMode="numeric" placeholder="6-digit pincode" className="w-full p-2.5 rounded-xl glass-input text-xs" /></div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-xs font-bold text-white transition-all bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"><span>{loading ? 'Saving your details...' : 'Complete profile & go to dashboard'}</span><ArrowRight className="w-4 h-4" /></button>
          </form>
        )}

        {/* --- CITIZEN & OFFICER LOGIN --- */}
        {tab !== 'citizen_register' && (
          resetStep === 'idle' ? <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {tab === 'officer_login' ? 'Officer Email' : 'Email Address or Phone Number'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  placeholder={tab === 'officer_login' ? 'arun@govbridge.com' : '9876543210 or user@example.com'}
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

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 ${
                tab === 'officer_login'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-900/30'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/30'
              }`}
            >
              <span>{loading ? 'Authenticating...' : tab === 'officer_login' ? 'Sign In to Officer Portal' : 'Citizen Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={requestPasswordReset} disabled={loading || !formData.identifier.includes('@')} className="w-full text-xs text-slate-500 hover:text-emerald-600 disabled:opacity-50">Forgot password? Verify by email</button>
          </form>
          : <form onSubmit={confirmPasswordReset} className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-center">
              <p className="auth-intro">Enter the verification code sent to your email, then choose a new password.</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Code expires in <b className="text-amber-400 font-mono">{formatTimer(resetExpiresSeconds)}</b></span>
                <button type="button" disabled={loading || resetResendSeconds > 0} onClick={requestPasswordReset} className="text-emerald-400 disabled:text-slate-600">{resetResendSeconds > 0 ? `Resend (${resetResendSeconds}s)` : 'Resend OTP'}</button>
              </div>
            </div>
            <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={resetData.otpCode} onChange={e => setResetData({ ...resetData, otpCode: e.target.value.replace(/\D/g, '') })} placeholder="6-digit OTP" className="w-full p-2.5 rounded-xl glass-input text-xs" />
            <input required minLength={6} type="password" value={resetData.newPassword} onChange={e => setResetData({ ...resetData, newPassword: e.target.value })} placeholder="New password" className="w-full p-2.5 rounded-xl glass-input text-xs" />
            <input required minLength={6} type="password" value={resetData.confirmPassword} onChange={e => setResetData({ ...resetData, confirmPassword: e.target.value })} placeholder="Confirm new password" className="w-full p-2.5 rounded-xl glass-input text-xs" />
            <button type="submit" disabled={loading || resetExpiresSeconds === 0 || resetData.otpCode.length !== 6} className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-50">{loading ? 'Changing password...' : 'Verify OTP & change password'}</button>
            <button type="button" onClick={() => setResetStep('idle')} className="w-full text-xs text-slate-500">Back to sign in</button>
          </form>
        )}

      </div>
    </div>
  );
}
