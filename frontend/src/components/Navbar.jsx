import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Waves, Map, Calendar, Menu, X, Sun, Moon, LogIn, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

/**
 * Bulletproof nav link — the box model NEVER changes between active/inactive.
 */
function NavLink({ to, icon: Icon, label }) {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link
      to={to}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: active ? 'var(--color-ocean-400)' : 'var(--text-sub)',
        textDecoration: 'none',
        transition: 'color 0.2s ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        background: 'transparent',
      }}
    >
      <span style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '8px',
        background: 'rgba(13,141,232,0.10)',
        opacity: active ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
      }} />
      <span style={{
        position: 'absolute',
        bottom: 0,
        left: '14px',
        right: '14px',
        height: '2px',
        borderRadius: '2px 2px 0 0',
        background: 'var(--color-ocean-400)',
        opacity: active ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
      }} />
      <Icon style={{ width: '1rem', height: '1rem', flexShrink: 0, position: 'relative' }} />
      <span style={{ position: 'relative' }}>{label}</span>
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, signIn, signOut, authLoading } = useAuth();

  const navLinks = [
    { path: '/', label: 'Home', icon: Waves },
    { path: '/plan', label: 'Plan Trip', icon: Map },
    { path: '/trips', label: 'My Trips', icon: Calendar },
  ];

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: 'var(--glass-card)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
        transition: 'background 0.5s ease',
      }}
    >
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>

          {/* ── Logo ── */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--color-ocean-600), var(--color-ocean-500))',
              boxShadow: '0 0 20px rgba(13,141,232,0.45)',
              transition: 'transform 0.3s ease',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Waves style={{ width: '18px', height: '18px', color: '#fff' }} />
            </div>
            <div className="hidden sm:block text-main">
              <div style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.1, letterSpacing: '0.02em' }}>Tabi</div>
              <div style={{ fontSize: '0.58rem', opacity: 0.6, letterSpacing: '0.17em', textTransform: 'uppercase', fontWeight: 500 }}>your journey awaits</div>
            </div>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {navLinks.map(({ path, label, icon }) => (
                <NavLink key={path} to={path} icon={icon} label={label} />
              ))}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              style={{
                marginLeft: '4px',
                padding: '8px',
                borderRadius: '50%',
                background: 'rgba(13,141,232,0.1)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
              className="hover:scale-110 active:scale-95"
              title={isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* ── Google Sign-in / User Avatar ── */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '4px' }}>
                {/* Avatar */}
                <div style={{ position: 'relative', cursor: 'pointer' }}>
                  <img
                    src={user.picture}
                    alt={user.name}
                    title={user.name}
                    style={{
                      width: '34px', height: '34px', borderRadius: '50%',
                      border: '2px solid rgba(56,168,245,0.5)',
                      boxShadow: '0 0 12px rgba(13,141,232,0.3)',
                      transition: 'transform 0.2s',
                      objectFit: 'cover',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                </div>
                {/* Sign Out */}
                <button
                  onClick={signOut}
                  title="Sign out"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: 'rgba(248,113,113,0.9)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={signIn}
                disabled={authLoading}
                style={{
                  marginLeft: '4px',
                  padding: '7px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0060c7, #0d8de8)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 16px rgba(13,141,232,0.35)',
                  transition: 'all 0.25s',
                  opacity: authLoading ? 0.65 : 1,
                }}
                onMouseEnter={e => !authLoading && (e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = '0 6px 22px rgba(13,141,232,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,141,232,0.35)')}
              >
                <LogIn size={14} />
                {authLoading ? 'Signing in…' : 'Sign in with Google'}
              </button>
            )}
          </div>

          {/* ── Mobile toggle ── */}
          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden"
            style={{
              padding: '8px', borderRadius: '8px',
              background: 'rgba(13,141,232,0.08)',
              color: 'rgba(56,168,245,0.7)', border: 'none', cursor: 'pointer',
            }}
          >
            {open ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          </button>
        </div>

        {/* ── Mobile menu ── */}
        {open && (
          <div className="md:hidden" style={{ paddingBottom: '12px', borderTop: '1px solid rgba(56,168,245,0.1)' }}>
            {navLinks.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <Link key={path} to={path} onClick={() => setOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '12px', marginBottom: '4px',
                  fontSize: '0.875rem', fontWeight: 500,
                  color: active ? '#7ec8f6' : 'rgba(126,200,246,0.5)',
                  background: active ? 'rgba(13,141,232,0.1)' : 'transparent',
                  textDecoration: 'none',
                }}>
                  <Icon style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  <span>{label}</span>
                </Link>
              );
            })}
            {/* Mobile sign in/out */}
            <div style={{ padding: '8px 16px' }}>
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={user.picture} alt={user.name} style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid rgba(56,168,245,0.4)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'rgba(126,200,246,0.7)', flex: 1 }}>{user.name}</span>
                  <button onClick={signOut} style={{ fontSize: '0.75rem', color: 'rgba(248,113,113,0.8)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Sign out
                  </button>
                </div>
              ) : (
                <button onClick={signIn} disabled={authLoading} style={{
                  width: '100%', padding: '10px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0060c7, #0d8de8)',
                  border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  <LogIn size={15} />
                  {authLoading ? 'Signing in…' : 'Sign in with Google'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
