import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';

export default function App() {
  // Session check on initial boot
  const [user, setUser] = useState<{ name: string; email: string; plan: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('trademind_token');
    if (token) {
      // Validate session and retrieve fresh plan status from our SaaS API
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error('Session invalid or expired');
        }
      })
      .then(data => {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('trademind_user', JSON.stringify(data.user));
        }
      })
      .catch(err => {
        console.warn('Persistent login invalid:', err.message);
        localStorage.removeItem('trademind_user');
        localStorage.removeItem('trademind_token');
        setUser(null);
      });
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: { name: string; email: string; plan: string }) => {
    setUser(loggedInUser);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('trademind_user');
    localStorage.removeItem('trademind_token');
    setUser(null);
  };

  const handleUpdatePlan = (newPlan: string) => {
    if (user) {
      const updatedUser = { ...user, plan: newPlan };
      localStorage.setItem('trademind_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const handleLaunchTerminal = () => {
    if (user) {
      // User already logged in, enter terminal
      return;
    }
    // Direct guest to authentication panel
    setShowAuthModal(true);
  };

  return (
    <div className="h-full w-full bg-[#050505] text-[#ededed] font-sans">
      {user ? (
        <Dashboard 
          user={user} 
          onLogout={handleLogout} 
          onUpdatePlan={handleUpdatePlan} 
        />
      ) : (
        <LandingPage 
          onLaunchTerminal={handleLaunchTerminal} 
          onOpenAuth={() => setShowAuthModal(true)} 
        />
      )}

      {showAuthModal && (
        <Auth 
          onLoginSuccess={handleLoginSuccess} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
    </div>
  );
}
