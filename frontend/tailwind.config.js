/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: '#0a1f4e',
        // ── Ocean blue scale (bright → deep) ──────────────
        ocean: {
          50: '#e8f4ff',
          100: '#bde3ff',
          200: '#7ec8f6',
          300: '#38a8f5',
          400: '#0d8de8',
          500: '#0060c7',   // primary action
          600: '#004caa',
          700: '#003a8a',
          800: '#002870',
          900: '#001755',
          950: '#000b33',
        },
        // ── Deep midnight base ─────────────────────────────
        deep: {
          950: '#010812',
          900: '#020d1e',
          800: '#041529',
          700: '#071e38',
          600: '#0a2847',
          500: '#0e3358',
        },
        // ── Emerald/teal accent (kept subtle) ─────────────
        emerald: {
          950: '#022c22',
          900: '#064e3b',
          800: '#065f46',
          700: '#047857',
          600: '#059669',
          500: '#10b981',
          400: '#34d399',
          300: '#6ee7b7',
          200: '#a7f3d0',
          100: '#d1fae5',
        },
        // ── Electric cyan glow ────────────────────────────
        glow: {
          blue: 'rgba(56,168,245,0.4)',
          emerald: 'rgba(16,185,129,0.25)',
          white: 'rgba(255,255,255,0.07)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'ocean': '0 8px 40px rgba(13,141,232,0.25), 0 2px 8px rgba(0,0,0,0.5)',
        'glow-sm': '0 0 18px rgba(56,168,245,0.45)',
        'glow-lg': '0 0 50px rgba(13,141,232,0.35), 0 0 100px rgba(16,185,129,0.12)',
        'card': '0 4px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
        'inner': 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.7s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up': 'slideUp 0.65s cubic-bezier(0.16,1,0.3,1) both',
        'wave1': 'waveMove1 14s ease-in-out infinite',
        'wave2': 'waveMove2 18s ease-in-out infinite',
        'wave3': 'waveMove3 22s ease-in-out infinite',
        'wave-rush': 'waveRush 4s cubic-bezier(0.4,0,0.2,1) infinite',
        'whitewash': 'whitewash 4s ease-in-out infinite',
        'float': 'float 7s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'ripple': 'ripple 0.65s linear',
        'spin-slow': 'spin 8s linear infinite',
        'drift': 'drift 20s ease-in-out infinite',
        'bg-shift': 'bgShift 18s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(32px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        waveMove1: {
          '0%': { transform: 'translateX(0) scaleY(1)' },
          '50%': { transform: 'translateX(-4%) scaleY(1.1)' },
          '100%': { transform: 'translateX(0) scaleY(1)' },
        },
        waveMove2: {
          '0%': { transform: 'translateX(0) scaleY(1)' },
          '33%': { transform: 'translateX(3%) scaleY(0.93)' },
          '66%': { transform: 'translateX(-2%) scaleY(1.07)' },
          '100%': { transform: 'translateX(0) scaleY(1)' },
        },
        waveMove3: {
          '0%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-6%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.5', filter: 'blur(45px)' },
          '50%': { opacity: '0.9', filter: 'blur(65px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        drift: {
          '0%, 100%': { transform: 'translateX(0) translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateX(30px) translateY(-20px) rotate(5deg)' },
          '75%': { transform: 'translateX(-20px) translateY(15px) rotate(-3deg)' },
        },
        // Wave rushing in from right — surge + pull back
        waveRush: {
          '0%': { transform: 'translateX(0%) scaleX(1) scaleY(1)', opacity: '0.12' },
          '30%': { transform: 'translateX(-12%) scaleX(1.12) scaleY(1.18)', opacity: '0.22' },
          '55%': { transform: 'translateX(-20%) scaleX(1.22) scaleY(1.08)', opacity: '0.28' },
          '75%': { transform: 'translateX(-22%) scaleX(1.18) scaleY(0.92)', opacity: '0.18' },
          '100%': { transform: 'translateX(0%) scaleX(1) scaleY(1)', opacity: '0.12' },
        },
        // Foam whitewash flash on wave crest
        whitewash: {
          '0%': { opacity: '0', transform: 'scaleX(0.5)' },
          '28%': { opacity: '0' },
          '42%': { opacity: '0.55', transform: 'scaleX(1)' },
          '65%': { opacity: '0.2', transform: 'scaleX(1.1)' },
          '100%': { opacity: '0', transform: 'scaleX(0.5)' },
        },
        // Background gradient slow drift
        bgShift: {
          '0%': { backgroundPosition: '0% 0%' },
          '33%': { backgroundPosition: '40% 20%' },
          '66%': { backgroundPosition: '60% 80%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
      },
    },
  },
  plugins: [],
}
