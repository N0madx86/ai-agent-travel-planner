import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// ── Replace this with your actual Google OAuth Client ID ──────────────────
// Get one at: https://console.cloud.google.com/apis/credentials
// Authorized origins: http://localhost:5173 (dev) + your production domain
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ── Inner provider (inside GoogleOAuthProvider) ───────────────────────────
function AuthContextInner({ children }) {
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
      // also migrate session_id → user uid for future trips
      localStorage.setItem('tabi_user_id', user.sub || user.id || '');
    } else {
      localStorage.removeItem('tabi_user');
      localStorage.removeItem('tabi_user_id');
    }
  }, [user]);

  // Exchange Google access token for user profile
  const fetchUserProfile = useCallback(async (accessToken) => {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  }, []);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setAuthLoading(true);
      try {
        const profile = await fetchUserProfile(tokenResponse.access_token);
        setUser(profile);
      } catch (err) {
        console.error('Google login error:', err);
        alert('Sign-in failed. Please try again.');
      } finally {
        setAuthLoading(false);
      }
    },
    onError: () => {
      setAuthLoading(false);
      alert('Google sign-in was cancelled or failed.');
    },
  });

  const signIn = useCallback(() => {
    setAuthLoading(true);
    login();
  }, [login]);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Public provider wrapper ───────────────────────────────────────────────
export function AuthProvider({ children }) {
  if (!GOOGLE_CLIENT_ID) {
    // No client ID configured yet — render a stub context so the rest of the
    // app works without breaking. Sign-in is disabled until VITE_GOOGLE_CLIENT_ID is set.
    return (
      <AuthContext.Provider value={{ user: null, signIn: () => alert('Google Client ID not configured yet.\nAdd VITE_GOOGLE_CLIENT_ID to your .env file.'), signOut: () => {}, authLoading: false }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContextInner>{children}</AuthContextInner>
    </GoogleOAuthProvider>
  );
}
