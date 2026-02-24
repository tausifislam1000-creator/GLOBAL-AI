import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';

export default function App() {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = localStorage.getItem('global_ai_current_user');
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleLogin = (email: string) => {
    setUser(email);
  };

  const handleLogout = () => {
    localStorage.removeItem('global_ai_current_user');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
      {user ? (
        <Chat userEmail={user} onLogout={handleLogout} />
      ) : (
        <Auth onLogin={handleLogin} />
      )}
    </div>
  );
}
