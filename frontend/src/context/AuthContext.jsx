import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ── GitHub OAuth Configuration ─────────────────────────────────────────────
// VITE_GITHUB_CLIENT_ID is your GitHub OAuth App's Client ID (safe to expose)
// The client SECRET lives only on the backend — never here.
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';

// Where GitHub sends the user after they authorise — must match your OAuth App
const GITHUB_CALLBACK_URL = 'https://tabi-ito.vercel.app/auth/github/callback';

// Backend endpoint that handles the code→token exchange
const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://tabi-uul5.onrender.com';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tabi_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(false);

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('tabi_user', JSON.stringify(user));
      localStorage.setItem('tabi_user_id', user.sub || user.id || '');
    } else {
      localStorage.removeItem('tabi_user');
      localStorage.removeItem('tabi_user_id');
    }
  }, [user]);

  // Redirect the browser to GitHub's OAuth authorisation page
  const signIn = useCallback(() => {
    if (!GITHUB_CLIENT_ID) {
      alert('GitHub Client ID not configured.\nAdd VITE_GITHUB_CLIENT_ID to your .env file.');
      return;
    }
    setAuthLoading(true);
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_CALLBACK_URL,
      scope: 'read:user user:email',
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  // Called by GitHubCallbackPage once it has parsed the user from the URL
  const setUserFromCallback = useCallback((userPayload) => {
    setUser(userPayload);
    setAuthLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, authLoading, setAuthLoading, setUserFromCallback }}>
      {children}
    </AuthContext.Provider>
  );
}
