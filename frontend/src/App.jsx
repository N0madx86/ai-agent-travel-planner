import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import WaveBackground from './components/WaveBackground';
import HomePage from './pages/HomePage';
import PlanTripPage from './pages/PlanTripPage';
import MyTripsPage from './pages/MyTripsPage';
import TripDetailPage from './pages/TripDetailPage';
import AdminPage from './pages/AdminPage';
import { useScrollReveal } from './hooks/useAnimations';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Run scroll reveal on every route change
function ScrollRevealRunner() {
  const location = useLocation();
  useScrollReveal([location.pathname]);
  return null;
}

// Inner app that can use the theme context
function AppInner() {
  const { isDarkMode } = useTheme();
  const location = useLocation();

  // Apply .light-mode class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', !isDarkMode);
  }, [isDarkMode]);

  // Moving gradient overlay behind canvas
  const darkGrad = [
    'radial-gradient(ellipse 110% 80% at 50% -10%, rgba(13,141,232,0.28) 0%, transparent 65%)',
    'radial-gradient(ellipse 70% 60% at 5% 100%, rgba(16,185,129,0.18) 0%, transparent 60%)',
    'radial-gradient(circle at 95% 15%, rgba(0,96,199,0.22) 0%, transparent 50%)',
    'radial-gradient(ellipse 50% 40% at 80% 80%, rgba(99,102,241,0.12) 0%, transparent 55%)',
    'radial-gradient(ellipse 60% 50% at 20% 40%, rgba(6,182,212,0.08) 0%, transparent 60%)',
  ].join(',');

  const lightGrad = [
    'radial-gradient(ellipse 120% 70% at 50% -5%, rgba(14,165,233,0.35) 0%, transparent 60%)',
    'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(6,182,212,0.22) 0%, transparent 60%)',
    'radial-gradient(circle at 100% 10%, rgba(251,191,36,0.15) 0%, transparent 45%)',
    'radial-gradient(circle at 50% 50%, rgba(186,230,253,0.12) 0%, transparent 70%)',
  ].join(',');

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100svh',
        background: isDarkMode ? '#020d1e' : '#e0f2fe',
        backgroundImage: isDarkMode ? darkGrad : lightGrad,
        backgroundSize: '200% 200%',
        animation: 'bgShift 20s ease-in-out infinite',
        transition: 'background-color 0.6s ease',
      }}
    >
      {/* Fixed wave canvas (z-0) */}
      <WaveBackground />

      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <Navbar />
        <main>
          <ScrollRevealRunner />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/plan" element={<PlanTripPage />} />
            <Route path="/trips" element={<MyTripsPage />} />
            <Route path="/trips/:id" element={<TripDetailPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppInner />
      </Router>
    </ThemeProvider>
  );
}

export default App;
