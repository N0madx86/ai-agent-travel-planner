import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * GitHubCallbackPage
 *
 * This page is the frontend leg of the OAuth redirect flow.
 * The backend at /auth/github/callback does the code→token exchange and then
 * redirects here with ?user=<encoded-JSON> or ?error=<message>.
 *
 * It reads the payload, hydrates AuthContext, and sends the user home.
 */
export default function GitHubCallbackPage() {
  const navigate = useNavigate();
  const { setUserFromCallback, setAuthLoading } = useAuth();
  const processed = useRef(false); // guard against React strict-mode double-fire

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const userEncoded = params.get('user');

    if (error) {
      console.error('GitHub OAuth error:', error);
      alert(`Sign-in failed: ${decodeURIComponent(error)}`);
      setAuthLoading(false);
      navigate('/', { replace: true });
      return;
    }

    if (userEncoded) {
      try {
        const user = JSON.parse(decodeURIComponent(userEncoded));
        setUserFromCallback(user);
        navigate('/', { replace: true });
      } catch (e) {
        console.error('Failed to parse user payload:', e);
        alert('Sign-in failed: invalid response from server.');
        setAuthLoading(false);
        navigate('/', { replace: true });
      }
      return;
    }

    // No params at all — probably a direct visit
    navigate('/', { replace: true });
  }, [navigate, setUserFromCallback, setAuthLoading]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}
    >
      {/* Animated GitHub-flavoured spinner */}
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '3px solid rgba(56,168,245,0.15)',
          borderTopColor: '#0d8de8',
          animation: 'spin 0.9s linear infinite',
        }}
      />
      <p style={{ color: 'var(--text-sub)', fontSize: '0.95rem', letterSpacing: '0.04em' }}>
        Completing sign-in…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
