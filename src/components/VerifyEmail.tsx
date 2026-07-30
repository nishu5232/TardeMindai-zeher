import React, { useState, useEffect, useRef } from 'react';
import { Mail, KeyRound, RefreshCw, CheckCircle, AlertCircle, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';

interface VerifyEmailProps {
  email: string;
  userId?: string;
  onVerificationSuccess: (user: { name: string; email: string; plan: string }) => void;
  onBackToLogin?: () => void;
}

export default function VerifyEmail({
  email,
  userId,
  onVerificationSuccess,
  onBackToLogin
}: VerifyEmailProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first input box on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleChange = (index: number, value: string) => {
    // Only accept numeric inputs
    const numericVal = value.replace(/[^0-9]/g, '');
    if (!numericVal && value !== '') return;

    const newCode = [...code];
    // If user typed a single digit
    if (numericVal.length === 1) {
      newCode[index] = numericVal;
      setCode(newCode);
      setMessage(null);

      // Auto-advance to next box
      if (index < 5 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }

      // If all digits are filled, auto submit
      if (newCode.every(digit => digit !== '')) {
        submitVerification(newCode.join(''));
      }
    } else if (numericVal.length > 1) {
      // User pasted multiple digits into single input
      handlePasteDigits(numericVal);
    } else {
      // Empty string (cleared)
      newCode[index] = '';
      setCode(newCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // Move to previous box and clear it
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePasteDigits = (pastedText: string) => {
    const digits = pastedText.replace(/[^0-9]/g, '').slice(0, 6).split('');
    if (digits.length === 0) return;

    const newCode = [...code];
    digits.forEach((digit, idx) => {
      if (idx < 6) newCode[idx] = digit;
    });
    setCode(newCode);
    setMessage(null);

    // Focus last filled box or next empty box
    const nextIdx = Math.min(digits.length, 5);
    if (inputRefs.current[nextIdx]) {
      inputRefs.current[nextIdx]?.focus();
    }

    if (newCode.every(digit => digit !== '')) {
      submitVerification(newCode.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    handlePasteDigits(pastedData);
  };

  const submitVerification = async (fullCode: string) => {
    if (fullCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter all 6 digits of the verification code.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email,
          code: fullCode
        })
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        throw new Error(data.error || 'Email verification failed. Please check the code and try again.');
      }

      // Store auth credentials upon successful verification
      if (data.token && data.user) {
        localStorage.setItem('trademind_user', JSON.stringify(data.user));
        localStorage.setItem('trademind_token', data.token);
        setMessage({ type: 'success', text: 'Email verified successfully! Entering terminal...' });
        
        setTimeout(() => {
          onVerificationSuccess(data.user);
        }, 800);
      }
    } catch (err) {
      setLoading(false);
      setMessage({ type: 'error', text: (err as Error).message });
      // Reset input code on error so user can re-enter code cleanly
      setCode(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0 || resending) return;

    setResending(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId })
      });

      const data = await response.json();
      setResending(false);

      if (!response.ok) {
        if (response.status === 429 && data.retryAfter) {
          setResendCountdown(data.retryAfter);
        }
        throw new Error(data.error || 'Failed to resend verification code');
      }

      setMessage({
        type: 'success',
        text: 'A new 6-digit verification code has been dispatched to your email.'
      });
      // Start 60-second cooldown
      setResendCountdown(60);
    } catch (err) {
      setResending(false);
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const isComplete = code.every(digit => digit !== '');

  return (
    <div className="relative p-8">
      {/* Brand & Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">T</div>
          <span className="text-xl font-bold tracking-tight text-white">TradeMind<span className="text-blue-500">.ai</span></span>
        </div>
        {onBackToLogin && (
          <button
            onClick={onBackToLogin}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}
      </div>

      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Verify Your Email</h2>
        <p className="text-xs text-white/60 mt-1.5 leading-relaxed max-w-xs mx-auto">
          We sent a 6-digit security code to <br />
          <span className="font-semibold text-blue-400 font-mono text-xs">{email}</span>
        </p>
      </div>

      {/* Error / Success Feedback */}
      {message && (
        <div className={`p-3 mb-6 rounded-xl border flex items-center gap-2.5 text-xs ${
          message.type === 'success' 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="leading-tight">{message.text}</span>
        </div>
      )}

      {/* 6-Digit OTP Box Grid */}
      <form onSubmit={(e) => { e.preventDefault(); submitVerification(code.join('')); }} className="space-y-6">
        <div className="flex justify-between gap-2 my-2" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              disabled={loading}
              className={`w-11 h-13 text-center text-xl font-mono font-bold rounded-xl border transition-all duration-150 focus:outline-none ${
                digit 
                  ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]' 
                  : 'bg-white/5 border-white/10 text-white hover:border-white/20 focus:border-blue-500 focus:bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !isComplete}
          className="w-full py-3 bg-white text-black font-bold rounded-xl text-xs hover:bg-white/90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>Verify Security Code <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      {/* Resend Code Option */}
      <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs">
        <span className="text-white/50">Didn't receive the code? </span>
        <button
          type="button"
          onClick={handleResendCode}
          disabled={resendCountdown > 0 || resending}
          className="text-blue-400 font-semibold hover:underline disabled:text-white/30 disabled:no-underline cursor-pointer transition-colors inline-flex items-center gap-1 ml-1"
        >
          {resending ? (
            <RefreshCw className="w-3 h-3 animate-spin inline" />
          ) : resendCountdown > 0 ? (
            `Resend in ${resendCountdown}s`
          ) : (
            'Resend code'
          )}
        </button>
      </div>
    </div>
  );
}
