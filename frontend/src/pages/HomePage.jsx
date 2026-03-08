import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Layers, Shield, Clock } from 'lucide-react';
import { heroEntranceAnimation, createParticleField, animateCards, countUp, useRipple } from '../hooks/useAnimations';

function RippleBtn({ to, children, className }) {
  const { rippleRef, createRipple } = useRipple();
  return (
    <Link to={to} ref={rippleRef} onClick={createRipple} className={className}>
      {children}
    </Link>
  );
}

const features = [
  { icon: Compass, title: 'Built Around You', desc: 'Day-by-day plans based on your dates, vibe, and budget — never generic.' },
  { icon: Layers, title: 'Real-Time Hotel Prices', desc: 'Live availability pulled from booking sites so you always see current rates.' },
  { icon: Shield, title: 'Budget First', desc: 'Tell us your budget and every recommendation fits inside it.' },
  { icon: Clock, title: 'Done in Seconds', desc: 'A full trip plan — hotels, activities, restaurants, tips — ready in moments.' },
];

const stats = [
  { id: 'stat-trips', value: 10000, suffix: '+', label: 'Trips Planned' },
  { id: 'stat-dest', value: 500, suffix: '+', label: 'Destinations' },
  { id: 'stat-happy', value: 98, suffix: '%', label: 'Happy Travellers' },
];

export default function HomePage() {
  const heroRef = useRef(null);
  const particleRef = useRef(null);
  const featuresRef = useRef(null);

  // Anime.js hero entrance
  useEffect(() => {
    heroEntranceAnimation(heroRef);
  }, []);

  // Particle field
  useEffect(() => {
    const cleanup = createParticleField(particleRef.current, 40);
    return cleanup;
  }, []);

  // Feature cards — IntersectionObserver triggers anime.js
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animateCards('.feature-card', 0);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (featuresRef.current) observer.observe(featuresRef.current);
    return () => observer.disconnect();
  }, []);

  // Stats count-up
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          stats.forEach(({ id, value, suffix }) => {
            countUp(document.getElementById(id), value, suffix);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    const statsEl = document.getElementById('stats-section');
    if (statsEl) observer.observe(statsEl);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen">

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center min-h-[90vh] px-4 overflow-hidden">
        {/* Particle field container */}
        <div ref={particleRef} className="absolute inset-0 pointer-events-none" />

        {/* Central glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: '550px', height: '550px',
            background: 'radial-gradient(circle, rgba(13,141,232,0.14) 0%, transparent 70%)',
            filter: 'blur(32px)'
          }} />

        <div ref={heroRef} className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="hero-chip inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-8 opacity-0"
            style={{
              background: 'var(--badge-bg)',
              border: '1px solid var(--badge-border)',
              color: 'var(--badge-color)'
            }}>
            <span className="w-1.5 h-1.5 rounded-full bg-ocean-400 animate-pulse" />
            Your personal travel companion
          </div>

          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none mb-6">
            <span className="hero-line block text-main opacity-0">Pack Light,</span>
            <span className="hero-line block gradient-text mt-2 opacity-0">Travel Further.</span>
          </h1>

          <p className="hero-sub text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-light opacity-0 transition-colors"
            style={{ color: 'var(--text-sub)' }}>
            Tell us where you're headed. We'll handle the planning — hotels,
            hidden beaches, local bites, and neighbourhood walks.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <RippleBtn to="/plan" className="hero-cta btn-primary text-base px-8 py-3.5 opacity-0">
              Start Planning →
            </RippleBtn>
            <RippleBtn to="/trips" className="hero-cta btn-secondary text-base px-8 py-3.5 opacity-0">
              My Trips
            </RippleBtn>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(2,13,30,0.8))' }} />
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section className="py-28 px-4" ref={featuresRef}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-ocean-100 mb-3">Why Tabi?</h2>
            <p className="text-ocean-400/60 text-lg">Smart, simple, and actually useful</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <div key={i} className="feature-card card card-hover p-8 flex gap-5 opacity-0">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(13,141,232,0.25), rgba(0,96,199,0.15))',
                    border: '1px solid rgba(56,168,245,0.2)'
                  }}>
                  <f.icon className="w-6 h-6 text-ocean-300" />
                </div>
                <div>
                  <h3 className="text-main font-bold text-lg mb-1.5">{f.title}</h3>
                  <p className="text-sub text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────── */}
      <section id="stats-section" className="py-16 px-4 border-t"
        style={{ borderColor: 'rgba(56,168,245,0.08)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {stats.map(({ id, value, suffix, label }) => (
            <div key={id} className="reveal">
              <div id={id} className="text-4xl font-black mb-1" style={{ color: 'var(--accent-blue)' }}>0{suffix}</div>
              <div className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--text-sub)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center reveal">
          <div className="card p-12"
            style={{
              background: 'linear-gradient(135deg, rgba(13,141,232,0.18) 0%, rgba(0,96,199,0.12) 100%)',
              border: '1px solid rgba(56,168,245,0.22)'
            }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-float"
              style={{
                background: 'linear-gradient(135deg, #0060c7, #0d8de8)',
                boxShadow: '0 0 32px rgba(13,141,232,0.5)'
              }}>
              <Compass className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-main mb-3">Ready to explore?</h2>
            <p className="text-sub mb-8 leading-relaxed">
              Join travellers who plan smarter and stress less.
            </p>
            <RippleBtn to="/plan" className="btn-primary px-10 py-3.5 text-base">
              Build My Itinerary →
            </RippleBtn>
          </div>
        </div>
      </section>
    </div>
  );
}
