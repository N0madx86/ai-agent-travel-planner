import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar, Users, IndianRupee, MapPin, Loader2,
  Hotel, Star, RefreshCw, Waves, Camera, ChevronLeft,
  ChevronRight, X as XIcon, Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import api, { tripsAPI, hotelsAPI, itinerariesAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useRipple } from '../hooks/useAnimations';

// ─── Markdown parser ──────────────────────────────────────────
function parseItinerarySections(content) {
  if (!content) return [];
  const lines = content.split('\n');
  const sections = [];
  let current = null;
  for (const line of lines) {
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    if (h3) {
      if (current) sections.push(current);
      const isDayCard = /day\s*\d+/i.test(h3[1]);
      current = { title: h3[1], body: '', type: isDayCard ? 'day' : 'sub' };
    } else if (h2) {
      if (current) sections.push(current);
      const title = h2[1];
      let emoji = '📌';
      if (title.includes('Overview')) emoji = '✈️';
      if (title.includes('Highlight')) emoji = '🗺️';
      if (title.includes('Budget')) emoji = '💡';
      if (title.includes('Know')) emoji = '📝';
      current = { title, body: '', type: 'section', emoji };
    } else if (current) {
      current.body += line + '\n';
    }
  }
  if (current) sections.push(current);
  return sections;
}

// ─── Inline markdown renderer ─────────────────────────────────
function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent-blue);font-weight:800">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function MarkdownBody({ body }) {
  const lines = (body || '').split('\n');
  const elems = [];
  let listBuf = [];
  const flush = (key) => {
    if (listBuf.length) {
      elems.push(
        <ul key={`ul${key}`} style={{ listStyleType: 'disc', paddingLeft: '1.2em', marginBottom: '0.6rem' }}>
          {listBuf.map((li, i) => (
            <li key={i} style={{ color: 'var(--text-main)', opacity: 0.8, lineHeight: 1.75, marginBottom: '0.2rem' }}
              dangerouslySetInnerHTML={{ __html: renderInline(li) }} />
          ))}
        </ul>
      );
      listBuf = [];
    }
  };
  lines.forEach((line, i) => {
    if (!line.trim()) { flush(i); return; }
    if (line.match(/^[-*]\s/)) { listBuf.push(line.replace(/^[-*]\s/, '')); }
    else if (line.match(/^\d+\.\s/)) { listBuf.push(line.replace(/^\d+\.\s/, '')); }
    else {
      flush(i);
      elems.push(
        <p key={i} style={{ color: 'var(--text-main)', opacity: 0.8, lineHeight: 1.8, marginBottom: '0.4rem' }}
          dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
      );
    }
  });
  flush('end');
  return <div>{elems}</div>;
}

// ─── RippleBtn ────────────────────────────────────────────────
function RippleBtn({ onClick, disabled, className, children }) {
  const { rippleRef, createRipple } = useRipple();
  return (
    <button ref={rippleRef} onClick={(e) => { createRipple(e); onClick?.(); }}
      disabled={disabled} className={className}>
      {children}
    </button>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = useCallback(() => setIdx(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: '-2.5rem', right: 0, background: 'rgba(56,168,245,0.12)', border: '1px solid rgba(56,168,245,0.25)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7ec8f6' }}>
          <XIcon size={16} />
        </button>
        {/* Image */}
        <img
          key={idx}
          src={images[idx]}
          alt={`Photo ${idx + 1}`}
          style={{ maxWidth: '85vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: '1rem', boxShadow: '0 20px 80px rgba(0,0,0,0.8)', animation: 'fadeIn 0.3s ease' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        {/* Counter */}
        <div style={{ marginTop: '1rem', color: 'rgba(126,200,246,0.6)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          {idx + 1} / {images.length}
        </div>
        {/* Nav arrows */}
        {images.length > 1 && <>
          <button onClick={prev} style={{ position: 'absolute', left: '-3.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(13,141,232,0.18)', border: '1px solid rgba(56,168,245,0.25)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7ec8f6', transition: 'all 0.2s' }}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={next} style={{ position: 'absolute', right: '-3.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(13,141,232,0.18)', border: '1px solid rgba(56,168,245,0.25)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7ec8f6', transition: 'all 0.2s' }}>
            <ChevronRight size={20} />
          </button>
        </>}
      </div>
    </div>
  );
}

// ─── Snapshot Card ────────────────────────────────────────────
function SnapshotCard({ destination }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(() => {
    if (!destination) return;
    api.get('/api/images/destination', { params: { q: destination, count: 6 } })
      .then(r => setImages(r.data.images || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [destination]);

  if (loading) {
    return (
      <div className="card p-5 animate-fade-in">
        <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--text-main)', opacity: 0.6 }}>
          📸 Snapshots
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="shimmer-bg" style={{ height: '110px', borderRadius: '0.75rem' }} />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <>
      <div className="snapshot-card animate-fade-in mb-6" onClick={() => setLightboxIdx(0)}>
        <div className="p-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-ocean-500)' }}>
              📸 Snapshots · {destination}
            </p>
            <span style={{ fontSize: '0.7rem', color: 'rgba(56,168,245,0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Camera size={12} /> View Gallery
            </span>
          </div>
          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 110px)', gap: '6px' }}>
            {images.map((url, i) => (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                style={{
                  background: `url(${url}) center/cover no-repeat`,
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease, opacity 0.3s ease',
                  position: 'relative',
                  gridColumn: i === 0 ? 'span 2' : undefined, // First image wider
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            ))}
          </div>
        </div>
        {/* Hover overlay */}
        <div className="snapshot-overlay">
          <div style={{ textAlign: 'center', color: '#e8f4ff' }}>
            <ImageIcon size={28} style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Open Gallery</p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(126,200,246,0.6)', marginTop: '2px' }}>{images.length} photos</p>
          </div>
        </div>
      </div>

      {lightboxIdx !== null && (
        <Lightbox images={images} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}

// ─── Timeline Day Card ────────────────────────────────────────
function TimelineDayCard({ section, idx }) {
  const cardRef = useRef(null);
  const dotRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.3, rootMargin: '-80px 0px -80px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className="day-card animate-fade-in"
      style={{ position: 'relative', transitionDelay: `${idx * 60}ms` }}
    >
      {/* Timeline dot */}
      <div
        ref={dotRef}
        className={`timeline-dot ${active ? 'active' : ''}`}
      />
      <div className="p-6">
        <div className="inline-flex items-center gap-2 mb-3">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: 'rgba(13,141,232,0.15)', border: '1px solid rgba(56,168,245,0.25)', color: '#7ec8f6' }}
          >
            {section.title}
          </span>
        </div>
        <MarkdownBody body={section.body.trim()} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function TripDetailPage() {
  const { id } = useParams();
  const { isDarkMode } = useTheme();
  const [trip, setTrip] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchingHotels, setSearchingHotels] = useState(false);
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const tripRes = await tripsAPI.getOne(id);
      setTrip(tripRes.data);
      try {
        const itinRes = await itinerariesAPI.get(id);
        setItinerary(itinRes.data);
      } catch { /* not generated yet */ }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const searchHotels = async () => {
    if (!trip) return;
    setSearchingHotels(true);
    try {
      const res = await hotelsAPI.search({
        destination: trip.destination, checkin: trip.start_date,
        checkout: trip.end_date, max_results: 10,
      });
      setHotels(res.data);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail || 'Hotel search is temporarily unavailable. Booking.com may be blocking our request. Please try again in a few minutes.';
      alert(msg);
    }
    finally { setSearchingHotels(false); }
  };

  const generateItinerary = async () => {
    setGeneratingItinerary(true);
    try {
      const res = await itinerariesAPI.generate(id);
      setItinerary(res.data);
    } catch (e) { console.error(e); alert('Failed to generate itinerary.'); }
    finally { setGeneratingItinerary(false); }
  };

  const regenerateItinerary = async () => {
    setRegenerating(true);
    try {
      await itinerariesAPI.delete(id);
      const res = await itinerariesAPI.generate(id);
      setItinerary(res.data);
    } catch (e) { console.error(e); alert('Failed to regenerate.'); }
    finally { setRegenerating(false); }
  };

  const sections = useMemo(() => parseItinerarySections(itinerary?.content), [itinerary]);
  const daySections = sections.filter(s => s.type === 'day');
  const highlightSection = sections.find(s => s.title.toLowerCase().includes('highlight'));
  const budgetSection = sections.find(s => s.title.toLowerCase().includes('budget'));
  const knowSection = sections.find(s => s.title.toLowerCase().includes('know'));
  const destination = trip?.destination || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-3" style={{ color: 'var(--accent-blue)' }} />
          <p className="text-sm uppercase tracking-widest font-bold" style={{ color: 'var(--text-sub)' }}>Loading your trip…</p>
        </div>
      </div>
    );
  }
  if (!trip) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="card p-12 text-center"><p className="text-ocean-300">Trip not found.</p></div>
      </div>
    );
  }

  const nights = Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Trip Header ──────────────────────────────── */}
        <div className="card mb-10 overflow-hidden animate-fade-in">
          <div className="px-8 py-10 relative overflow-hidden"
            style={{
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(0,36,114,0.95) 0%, rgba(0,96,199,0.9) 50%, rgba(13,141,232,0.8) 100%)'
                : 'linear-gradient(135deg, rgba(13,141,232,0.85) 0%, rgba(20,184,166,0.7) 100%)'
            }}>
            <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full" style={{ background: 'rgba(56,168,245,0.06)' }} />
            <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full" style={{ background: 'rgba(0,0,0,0.2)' }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Waves className="w-4 h-4 animate-float" style={{ color: 'rgba(126,200,246,0.7)' }} />
                <span className="text-xs font-medium tracking-widest uppercase" style={{ color: 'rgba(126,200,246,0.55)' }}>Trip to</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">{trip.destination}</h1>
              <div className="flex flex-wrap gap-6">
                {[
                  { icon: Calendar, v: `${format(new Date(trip.start_date), 'MMM d')} – ${format(new Date(trip.end_date), 'MMM d, yyyy')}`, l: 'Dates' },
                  { icon: Calendar, v: `${nights} night${nights !== 1 ? 's' : ''}`, l: 'Duration' },
                  { icon: Users, v: trip.travelers, l: 'Travelers' },
                  { icon: IndianRupee, v: trip.budget, l: 'Budget' },
                  trip.interests ? { icon: MapPin, v: trip.interests, l: 'Interests' } : null,
                ].filter(Boolean).map(({ icon: Icon, v, l }) => (
                  <div key={l} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: 'rgba(126,200,246,0.5)' }} />
                    <div>
                      <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(126,200,246,0.4)' }}>{l}</p>
                      <p className="text-white font-semibold text-sm">{v}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Snapshots ─────────────────────────────────── */}
        <SnapshotCard destination={destination} />

        {/* ── Hotels ───────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-main flex items-center gap-2">
              <span className="text-lg">🏨</span> Where to Stay
            </h2>
            <RippleBtn onClick={searchHotels} disabled={searchingHotels} className="btn-secondary text-sm py-2 px-4">
              {searchingHotels ? <><Loader2 className="animate-spin w-4 h-4 mr-1.5 inline" />Searching…</> : 'Search Hotels'}
            </RippleBtn>
          </div>

          {hotels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hotels.map((hotel, hi) => (
                <div key={hotel.id} className="card card-hover overflow-hidden animate-fade-in" style={{ animationDelay: `${hi * 80}ms`, animationFillMode: 'both' }}>
                  {hotel.image_url ? (
                    <img src={hotel.image_url} alt={hotel.name} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(13,141,232,0.18), rgba(0,96,199,0.12))' }}>
                      <Hotel className="w-10 h-10" style={{ color: '#004caa' }} />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-ocean-100 mb-1">{hotel.name}</h3>
                    <p className="text-xs flex items-center gap-1 mb-3" style={{ color: 'rgba(56,168,245,0.5)' }}>
                      <MapPin className="w-3 h-3" />{hotel.location}
                    </p>
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-xl font-black text-ocean-300">
                        ₹{hotel.price_per_night.toLocaleString()}
                        <span className="text-xs font-normal" style={{ color: 'rgba(56,168,245,0.4)' }}>/night</span>
                      </div>
                      {hotel.rating && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.3)' }}>
                          <Star className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 fill-current" />
                          <span className="text-yellow-700 dark:text-yellow-300 text-sm font-bold">{hotel.rating}</span>
                        </div>
                      )}
                    </div>
                    {hotel.booking_url && (
                      <a href={hotel.booking_url} target="_blank" rel="noopener noreferrer"
                        className="btn-secondary w-full text-center text-xs py-2">
                        View Details →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center" style={{ border: '1px dashed rgba(56,168,245,0.18)' }}>
              <Hotel className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(13,141,232,0.5)' }} />
              <p className="text-sm" style={{ color: 'rgba(56,168,245,0.4)' }}>Click "Search Hotels" to find accommodations</p>
            </div>
          )}
        </section>

        {/* ── Itinerary ─────────────────────────────────── */}
        <section>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-main flex items-center gap-2">
              <span className="text-lg">🗓️</span> Your Itinerary
            </h2>
            <div className="flex gap-2">
              {itinerary && (
                <RippleBtn onClick={regenerateItinerary} disabled={regenerating} className="btn-secondary text-xs py-2 px-3">
                  {regenerating ? <><Loader2 className="animate-spin w-3 h-3 mr-1 inline" />Regenerating…</> : <><RefreshCw className="w-3 h-3 mr-1 inline" />Regenerate</>}
                </RippleBtn>
              )}
              {!itinerary && (
                <RippleBtn onClick={generateItinerary} disabled={generatingItinerary} className="btn-primary text-sm py-2 px-4">
                  {generatingItinerary ? <><Loader2 className="animate-spin w-4 h-4 mr-1.5 inline" />Generating…</> : 'Generate Itinerary'}
                </RippleBtn>
              )}
            </div>
          </div>

          {/* Generating state */}
          {generatingItinerary && !itinerary && (
            <div className="card p-14 text-center" style={{ border: '1px solid rgba(56,168,245,0.15)' }}>
              <Waves className="w-10 h-10 animate-float mx-auto mb-4" style={{ color: '#0d8de8' }} />
              <p className="text-ocean-100 font-bold text-lg mb-1">Crafting your itinerary…</p>
              <p className="text-sm" style={{ color: 'rgba(56,168,245,0.45)' }}>Usually takes 15–30 seconds.</p>
            </div>
          )}

          {/* Rendered itinerary */}
          {itinerary && sections.length > 0 && (
            <div className="space-y-6">
              {/* 1. Destination Highlights */}
              {highlightSection && (
                <div key="highlights" className="card p-6 animate-fade-in" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
                  <h2 className="text-lg font-bold mb-4 pb-3 flex items-center gap-2"
                    style={{ color: '#7ec8f6', borderBottom: '1px solid rgba(56,168,245,0.15)' }}>
                    <span>{highlightSection.emoji}</span>
                    {highlightSection.title.replace(/^[^\w]+/, '')}
                  </h2>
                  <MarkdownBody body={highlightSection.body.trim()} />
                </div>
              )}

              {/* 2. Day cards with vertical timeline */}
              {daySections.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold mb-4 pb-3 flex items-center gap-2"
                    style={{ color: '#7ec8f6', borderBottom: '1px solid rgba(56,168,245,0.15)' }}>
                    <span>🗓️</span>
                    Day-by-Day Itinerary
                  </h2>
                  <div className="timeline-container space-y-4 itinerary-prose">
                    {daySections.map((section, idx) => (
                      <TimelineDayCard key={`day-${idx}`} section={section} idx={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Budget Tips */}
              {budgetSection && (
                <div key="budget" className="card p-6 animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                  <h2 className="text-lg font-bold mb-4 pb-3 flex items-center gap-2"
                    style={{ color: '#7ec8f6', borderBottom: '1px solid rgba(56,168,245,0.15)' }}>
                    <span>{budgetSection.emoji}</span>
                    {budgetSection.title.replace(/^[^\w]+/, '')}
                  </h2>
                  <MarkdownBody body={budgetSection.body.trim()} />
                </div>
              )}

              {/* 4. Good to Know */}
              {knowSection && (
                <div key="know" className="card p-6 animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                  <h2 className="text-lg font-bold mb-4 pb-3 flex items-center gap-2"
                    style={{ color: '#7ec8f6', borderBottom: '1px solid rgba(56,168,245,0.15)' }}>
                    <span>{knowSection.emoji}</span>
                    {knowSection.title.replace(/^[^\w]+/, '')}
                  </h2>
                  <MarkdownBody body={knowSection.body.trim()} />
                </div>
              )}
            </div>
          )}

          {/* Fallback raw text */}
          {itinerary && sections.length === 0 && (
            <div className="card p-8">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed" style={{ color: 'rgba(189,227,255,0.75)' }}>
                {itinerary.content}
              </pre>
            </div>
          )}

          {/* Empty state */}
          {!itinerary && !generatingItinerary && (
            <div className="card p-14 text-center" style={{ border: '1px dashed rgba(56,168,245,0.18)' }}>
              <MapPin className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(13,141,232,0.5)' }} />
              <p className="text-ocean-100 font-bold mb-1">No itinerary yet</p>
              <p className="text-sm" style={{ color: 'rgba(56,168,245,0.45)' }}>Click "Generate Itinerary" and we'll map out your whole trip.</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
