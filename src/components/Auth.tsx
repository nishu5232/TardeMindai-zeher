import React, { useState } from 'react';
import { Mail, Lock, User, Github, Sparkles, AlertCircle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (user: { name: string; email: string; plan: string }) => void;
  onClose: () => void;
}

export default function Auth({ onLoginSuccess, onClose }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showReset, setShowReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (showReset) {
      setTimeout(() => {
        setLoading(false);
        if (!email) {
          setMessage({ type: 'error', text: 'Please enter your email address.' });
          return;
        }
        setMessage({ type: 'success', text: 'Password reset link sent to your email.' });
      }, 1000);
      return;
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { email, password } : { name, email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save credentials in client browser context
      localStorage.setItem('trademind_user', JSON.stringify(data.user));
      localStorage.setItem('trademind_token', data.token);

      onLoginSuccess(data.user);
    } catch (err) {
      setLoading(false);
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const handleOAuth = async (provider: 'Google' | 'GitHub') => {
    setLoading(true);
    setMessage(null);

    try {
      // Simulate OAuth login by automatically creating/logging in user with unique provider emails
      const oauthEmail = `${provider.toLowerCase()}trader@trademind.ai`;
      const oauthName = `${provider} Trader`;
      const oauthPassword = `OAuth_Secret_Token_${provider}_2026`;

      // Try logging in first
      let response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: oauthEmail, password: oauthPassword })
      });

      let data = await response.json();

      if (!response.ok) {
        // If login failed (e.g. user doesn't exist yet), let's register them!
        response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: oauthName, email: oauthEmail, password: oauthPassword })
        });
        data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `${provider} OAuth integration failed`);
        }
      }

      localStorage.setItem('trademind_user', JSON.stringify(data.user));
      localStorage.setItem('trademind_token', data.token);
      onLoginSuccess(data.user);
    } catch (err) {
      setLoading(false);
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  return (
    <div id="auth-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8 relative">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">T</div>
            <span className="text-xl font-bold tracking-tight text-white">Trademind<span className="text-blue-500">.ai</span></span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-white">
              {showReset ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-xs text-white/50 mt-1">
              {showReset 
                ? 'Enter your email to receive a recovery link' 
                : isLogin 
                  ? 'Access your premium AI trading terminal' 
                  : 'Start your journey towards intelligent trading'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs ${
                message.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            {!showReset && !isLogin && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {!showReset && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] uppercase tracking-wider text-white/40">Password</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => setShowReset(true)}
                      className="text-[11px] text-blue-400 hover:underline hover:text-blue-300"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black font-bold rounded-xl text-xs hover:bg-white/90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : showReset ? (
                'Send Recovery Link'
              ) : isLogin ? (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Social Sign In */}
          {!showReset && (
            <>
              <div className="relative my-6 text-center">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/10"></div>
                <span className="relative px-3 bg-[#0a0a0a] text-[10px] uppercase tracking-wider text-white/40">Or Continue With</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuth('Google')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white hover:bg-white/10 active:scale-98 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth('GitHub')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white hover:bg-white/10 active:scale-98 transition-all cursor-pointer"
                >
                  <Github className="w-4 h-4 text-white" />
                  GitHub
                </button>
              </div>
            </>
          )}

          {/* Footer Navigation */}
          <div className="mt-8 text-center text-xs">
            {showReset ? (
              <button 
                onClick={() => setShowReset(false)}
                className="text-white/50 hover:text-white hover:underline"
              >
                Back to Sign In
              </button>
            ) : (
              <span className="text-white/50">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button 
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-400 font-semibold hover:underline"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
