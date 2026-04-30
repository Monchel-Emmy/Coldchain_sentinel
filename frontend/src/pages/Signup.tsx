import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Thermometer, Eye, EyeOff, AlertCircle, CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

// Google icon SVG
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains uppercase',    ok: /[A-Z]/.test(password) },
    { label: 'Contains number',       ok: /\d/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="mt-1.5 space-y-1">
      {checks.map(c => (
        <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-green-600' : 'text-slate-400'}`}>
          <CheckCircle2 size={11} className={c.ok ? 'text-green-500' : 'text-slate-300'} />
          {c.label}
        </div>
      ))}
    </div>
  );
}

// ─── OTP Input — 6 individual boxes ──────────────────────────────────────────
function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Always render exactly 6 boxes
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const el = document.getElementById(`otp-${i - 1}`) as HTMLInputElement;
      el?.focus();
    }
  };

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const next = digits.map((d, idx) => idx === i ? digit : d).join('');
    onChange(next);
    if (digit && i < 5) {
      const el = document.getElementById(`otp-${i + 1}`) as HTMLInputElement;
      el?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) { onChange(pasted); e.preventDefault(); }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-11 h-12 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors border-slate-200"
        />
      ))}
    </div>
  );
}

// ─── Main Signup component ────────────────────────────────────────────────────
export default function Signup() {
  const navigate = useNavigate();

  // Step 1: signup form
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  const handleGoogleSignup = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`;
  };

  // Step 2: OTP verification
  const [step, setStep]         = useState<'form' | 'otp'>('form');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp]           = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  // ── Step 1: Submit signup form ──────────────────────────────────────────────
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Full name is required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res: any = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email, password }),
      }).then(r => r.json().then(d => ({ ok: r.ok, ...d })));

      if (!res.ok) throw new Error(res.error || 'Signup failed');

      setPendingEmail(res.email || email.toLowerCase());
      setStep('otp');
      startResendCooldown();
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setError('Please enter the complete 6-digit code'); return; }
    setError('');
    setLoading(true);
    try {
      const res: any = await api.verifyOTP(pendingEmail, otp);
      setSuccess(res.message || 'Email verified!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP with 60s cooldown ────────────────────────────────────────────
  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      await api.resendOTP(pendingEmail);
      setOtp('');
      startResendCooldown();
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Thermometer size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ColdChain Sentinel</h1>
          <p className="text-slate-400 text-sm mt-1">Vaccine Cold Chain Monitoring</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">

          {/* ── STEP 1: Signup form ── */}
          {step === 'form' && (
            <>
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Create your account</h2>
              <p className="text-xs text-slate-400 mb-6">You'll receive a verification code by email.</p>

              {/* Google button */}
              <button
                onClick={handleGoogleSignup}
                type="button"
                className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors mb-4"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">or sign up with email</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Dr. John Smith" required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email address *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10" />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="flex-shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: OTP verification ── */}
          {step === 'otp' && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail size={26} className="text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Check your email</h2>
                <p className="text-sm text-slate-500 mt-1">
                  We sent a 6-digit code to<br />
                  <span className="font-medium text-slate-700">{pendingEmail}</span>
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-5">
                <OTPInput value={otp} onChange={v => { setOtp(v); setError(''); }} />

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="flex-shrink-0" /> {error}
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle2 size={14} className="flex-shrink-0" /> {success}
                  </div>
                )}

                <button type="submit" disabled={loading || otp.length < 6}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>

                {/* Resend */}
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">Didn't receive the code?</p>
                  <button type="button" onClick={handleResend} disabled={resendCooldown > 0}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline mx-auto">
                    <RefreshCw size={13} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </div>

                <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                  className="w-full text-xs text-slate-400 hover:text-slate-600 text-center">
                  ← Back to signup
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
