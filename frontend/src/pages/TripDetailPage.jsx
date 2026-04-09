import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar, Users, IndianRupee, MapPin, Loader2,
  Hotel, Star, RefreshCw, Waves, Camera, ChevronLeft,
  ChevronRight, X as XIcon, Image as ImageIcon,
  PanelRightClose, PanelRightOpen, ExternalLink,
  Sparkles, Navigation,
} from 'lucide-react';
import { format } from 'date-fns';
import api, { tripsAPI, hotelsAPI, itinerariesAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useRipple } from '../hooks/useAnimations';

// Leaflet
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom hotel location pin
const makeHotelIcon = (color = '#0d8de8') => new L.DivIcon({
  html: `<div style="
    position:relative;width:36px;height:36px;
    display:flex;align-items:center;justify-content:center;
  ">
    <div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:linear-gradient(135deg,${color},#56a8f5);
      transform:rotate(-45deg);
      border:2px solid #fff;
      box-shadow:0 4px 16px rgba(0,0,0,0.35);
    "></div>
    <span style="
      position:absolute;font-size:14px;
      transform:rotate(0deg);line-height:1;
    ">🏨</span>
  </div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -40],
});
const hotelIcon = makeHotelIcon();

// Destination pin
const destIcon = new L.DivIcon({
  html: `<div style="
    background:linear-gradient(135deg,#10b981,#34d399);
    width:28px;height:28px;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);border:2px solid #fff;
    box-shadow:0 4px 16px rgba(16,185,129,0.5);
    display:flex;align-items:center;justify-content:center;
  "><span style="transform:rotate(45deg);font-size:12px">📍</span></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -32],
});

// ─── Geocode a hotel name+location string ────────────────────
async function geocodeHotel(name, location, destination) {
  const queries = [
    `${name}, ${location}, ${destination}`,
    `${name}, ${destination}`,
    `${location}, ${destination}`,
  ];
  for (const q of queries) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await r.json();
      if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { /* try next */ }
  }
  return null;
}

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

function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent-blue);font-weight:700">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function MarkdownBody({ body }) {
  const lines = (body || '').split('\n');
  const elems = [];
  let listBuf = [];
  const flush = (key) => {
    if (listBuf.length) {
      elems.push(
        <ul key={`ul${key}`} style={{ paddingLeft: '1.25em', marginBottom: '0.75rem', listStyle: 'disc' }}>
          {listBuf.map((li, i) => (
            <li key={i} style={{ color: 'var(--text-main)', opacity: 0.82, lineHeight: 1.75, marginBottom: '0.2rem' }}
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
        <p key={i} style={{ color: 'var(--text-main)', opacity: 0.82, lineHeight: 1.8, marginBottom: '0.4rem' }}
          dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
      );
    }
  });
  flush('end');
  return <div>{elems}</div>;
}

// ─── RippleBtn ────────────────────────────────────────────────
function RippleBtn({ onClick, disabled, className, style, children }) {
  const { rippleRef, createRipple } = useRipple();
  return (
    <button ref={rippleRef} onClick={(e) => { createRipple(e); onClick?.(); }}
      disabled={disabled} className={className} style={style}>
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
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, prev, next]);
  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '-2.5rem', right: 0, background: 'rgba(56,168,245,0.12)', border: '1px solid rgba(56,168,245,0.25)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7ec8f6' }}>
          <XIcon size={16} />
        </button>
        <img key={idx} src={images[idx]} alt={`Photo ${idx + 1}`}
          style={{ maxWidth: '85vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: '1rem', boxShadow: '0 20px 80px rgba(0,0,0,0.8)', animation: 'fadeIn 0.3s ease' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <div style={{ marginTop: '1rem', color: 'rgba(126,200,246,0.6)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          {idx + 1} / {images.length}
        </div>
        {images.length > 1 && <>
          <button onClick={prev} style={{ position: 'absolute', left: '-3.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(13,141,232,0.18)', border: '1px solid rgba(56,168,245,0.25)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7ec8f6' }}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={next} style={{ position: 'absolute', right: '-3.5rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(13,141,232,0.18)', border: '1px solid rgba(56,168,245,0.25)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7ec8f6' }}>
            <ChevronRight size={20} />
          </button>
        </>}
      </div>
    </div>
  );
}

// ─── Map flyTo helper ─────────────────────────────────────────
function MapFlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

// ─── Hotel Map with live geocoding ───────────────────────────
function HotelMap({ hotels, destination }) {
  const [destCenter, setDestCenter] = useState([20, 78]);
  const [zoom, setZoom] = useState(5);
  const [flyTarget, setFlyTarget] = useState(null);
  const [coords, setCoords] = useState([]); // [{hotel, lat, lng}]

  // Geocode destination
  useEffect(() => {
    if (!destination) return;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (data[0]) {
          const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
          setDestCenter([lat, lng]);
          setFlyTarget([lat, lng]);
          setZoom(13);
        }
      }).catch(() => {});
  }, [destination]);

  // Geocode hotels (with rate-limiting delay)
  useEffect(() => {
    if (!hotels.length || !destination) return;
    setCoords([]);
    let cancelled = false;
    (async () => {
      const results = [];
      for (const h of hotels) {
        if (cancelled) break;
        // If hotel already has coords stored, use them directly
        if (h.lat && h.lng) {
          results.push({ hotel: h, lat: h.lat, lng: h.lng });
        } else {
          const loc = await geocodeHotel(h.name, h.location || '', destination);
          if (loc) results.push({ hotel: h, lat: loc.lat, lng: loc.lng });
          // Nominatim rate limit: 1 req/sec
          await new Promise(r => setTimeout(r, 1100));
        }
        if (!cancelled) setCoords([...results]);
      }
    })();
    return () => { cancelled = true; };
  }, [hotels, destination]);

  // Trigger resize on mount
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <MapContainer center={destCenter} zoom={zoom}
      style={{ width: '100%', height: '100%', borderRadius: '1rem' }}
      zoomControl={true} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {flyTarget && <MapFlyTo center={flyTarget} zoom={13} />}

      {/* Destination marker */}
      <Marker position={destCenter} icon={destIcon}>
        <Popup>
          <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 130 }}>
            <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>{destination}</strong>
          </div>
        </Popup>
      </Marker>

      {/* Hotel markers (geocoded) */}
      {coords.map(({ hotel, lat, lng }, i) => (
        <Marker key={i} position={[lat, lng]} icon={hotelIcon}>
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 170, padding: '2px 0' }}>
              <strong style={{ color: '#0060c7', fontSize: '0.9rem', display: 'block', marginBottom: 4 }}>{hotel.name}</strong>
              {hotel.location && <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#666' }}>📍 {hotel.location}</p>}
              {hotel.price_per_night && <p style={{ margin: '0 0 2px', fontSize: '0.8rem', color: '#0d8de8', fontWeight: 700 }}>₹{hotel.price_per_night.toLocaleString()}<span style={{ color: '#888', fontWeight: 400 }}>/night</span></p>}
              {hotel.rating && <p style={{ margin: 0, fontSize: '0.78rem', color: '#888' }}>⭐ {hotel.rating}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

// ─── Itinerary Map ────────────────────────────────────────────
function ItineraryMap({ destination }) {
  const [center, setCenter] = useState([20, 78]);
  const [zoom, setZoom] = useState(5);
  const [flyTarget, setFlyTarget] = useState(null);

  useEffect(() => {
    if (!destination) return;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (data[0]) {
          const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon);
          setCenter([lat, lon]);
          setZoom(12);
          setFlyTarget([lat, lon]);
        }
      }).catch(() => {});
  }, [destination]);

  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <MapContainer center={center} zoom={zoom}
      style={{ width: '100%', height: '100%', borderRadius: '1rem' }}
      scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {flyTarget && <MapFlyTo center={flyTarget} zoom={12} />}
      <Marker position={center} icon={destIcon}>
        <Popup>
          <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <strong style={{ color: '#10b981' }}>{destination}</strong>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}

// ─── Place Images Panel ───────────────────────────────────────
function PlaceImagesPanel({ destination }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(() => {
    if (!destination) return;
    api.get('/api/images/destination', { params: { q: destination, count: 6 } })
      .then(r => setImages(r.data.images || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [destination]);

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="shimmer-bg" style={{ height: '80px', borderRadius: '0.5rem' }} />
      ))}
    </div>
  );

  if (images.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', color: 'rgba(56,168,245,0.35)', gap: '8px' }}>
      <ImageIcon size={24} />
      <span style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>No images found</span>
    </div>
  );

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {images.map((url, i) => (
          <div key={i}
            onClick={() => setLightboxIdx(i)}
            style={{
              background: `url(${url}) center/cover no-repeat`,
              height: '80px',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'transform 0.22s ease, opacity 0.22s ease',
              gridColumn: i === 0 ? 'span 2' : undefined,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
          />
        ))}
      </div>
      {lightboxIdx !== null && (
        <Lightbox images={images} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}

// ─── Timeline Day Card (no heavy blur for perf) ───────────────
function TimelineDayCard({ section, idx }) {
  return (
    <div className="day-card animate-fade-in" style={{ position: 'relative', transitionDelay: `${idx * 40}ms` }}>
      <div className="timeline-dot" />
      <div style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '4px 12px', borderRadius: '999px',
            background: 'rgba(13,141,232,0.15)', border: '1px solid rgba(56,168,245,0.25)', color: '#7ec8f6'
          }}>
            {section.title}
          </span>
        </div>
        <MarkdownBody body={section.body.trim()} />
      </div>
    </div>
  );
}

// ─── Hotel Card ───────────────────────────────────────────────
const CATEGORY_BADGES = {
  'Budget Pick':    { bg: 'rgba(16,185,129,0.15)', border: 'rgba(52,211,153,0.35)', color: '#10b981', emoji: '💰' },
  'Best Overall':   { bg: 'rgba(99,102,241,0.15)', border: 'rgba(129,140,248,0.35)', color: '#818cf8', emoji: '🏆' },
  'Best Location':  { bg: 'rgba(249,115,22,0.15)', border: 'rgba(251,146,60,0.35)', color: '#f97316', emoji: '📍' },
  'Highest Rated':  { bg: 'rgba(234,179,8,0.15)',  border: 'rgba(250,204,21,0.35)',  color: '#eab308', emoji: '⭐' },
  'Best Value':     { bg: 'rgba(14,165,233,0.15)',  border: 'rgba(56,189,248,0.35)',  color: '#0ea5e9', emoji: '✨' },
};

function HotelCard({ hotel, index, isGridMode }) {
  const badge = CATEGORY_BADGES[hotel.category] || null;

  // In grid mode show a compact tall card; in list mode show horizontal
  return (
    <div
      className="hotel-card-pro"
      style={{
        borderRadius: '1rem',
        border: '1px solid var(--glass-border)',
        background: 'var(--glass-card)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
        animation: 'fadeIn 0.45s ease both',
        animationDelay: `${index * 70}ms`,
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(13,141,232,0.2)';
        e.currentTarget.style.borderColor = 'rgba(56,168,245,0.38)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--glass-border)';
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {hotel.image_url ? (
          <img src={hotel.image_url} alt={hotel.name}
            style={{ width: '100%', height: isGridMode ? '140px' : '130px', objectFit: 'cover', display: 'block' }}
            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div style={{
          width: '100%', height: isGridMode ? '140px' : '130px',
          display: hotel.image_url ? 'none' : 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg,rgba(13,141,232,0.15),rgba(0,96,199,0.1))',
        }}>
          <Hotel style={{ width: 36, height: 36, color: 'rgba(13,141,232,0.45)' }} />
        </div>
        {/* Category badge overlay */}
        {badge && (
          <div style={{
            position: 'absolute', top: '0.6rem', left: '0.6rem',
            padding: '3px 10px', borderRadius: '999px',
            background: badge.bg, border: `1px solid ${badge.border}`,
            color: badge.color, fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.04em', backdropFilter: 'blur(8px)',
          }}>
            {badge.emoji} {hotel.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.3 }}>
          {hotel.name}
        </h3>
        {hotel.location && (
          <p style={{ margin: 0, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-sub)', opacity: 0.8 }}>
            <MapPin size={11} />{hotel.location}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
          <div>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-ocean-300)' }}>
              ₹{hotel.price_per_night?.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', opacity: 0.6, marginLeft: 3 }}>/night</span>
          </div>
          {hotel.rating && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px', borderRadius: '8px',
              background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.3)',
            }}>
              <Star size={12} style={{ color: '#eab308', fill: '#eab308' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ca8a04' }}>{hotel.rating}</span>
            </div>
          )}
        </div>

        {hotel.booking_url && (
          <a href={hotel.booking_url} target="_blank" rel="noopener noreferrer"
            style={{
              marginTop: 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '0.5rem',
              borderRadius: '0.6rem',
              background: 'rgba(13,141,232,0.12)',
              border: '1px solid rgba(56,168,245,0.25)',
              color: '#56a8f5',
              fontSize: '0.78rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(13,141,232,0.25)'; e.currentTarget.style.color = '#7ec8f6'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(13,141,232,0.12)'; e.currentTarget.style.color = '#56a8f5'; }}
          >
            View on Booking.com <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Resizable Split Panel ────────────────────────────────────
function SplitPanel({ left, right, mapCollapsed, onToggleCollapse }) {
  const containerRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(56);
  const isDragging = useRef(false);
  const MIN_LEFT = 32, MAX_LEFT = 78;

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(MAX_LEFT, Math.max(MIN_LEFT, pct)));
    };
    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: 0, height: '100%', position: 'relative', minHeight: 0 }}>
      {/* Left panel */}
      <div style={{
        width: mapCollapsed ? '100%' : `${leftWidth}%`,
        overflow: 'auto',
        paddingRight: mapCollapsed ? 0 : '0.75rem',
        transition: 'width 0.35s cubic-bezier(0.16,1,0.3,1)',
        minWidth: 0,
      }}>
        {left}
      </div>

      {/* Divider */}
      {!mapCollapsed && (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none', flexShrink: 0 }}>
          <div
            onMouseDown={onMouseDown}
            style={{
              width: '5px', height: '100%', cursor: 'col-resize',
              background: 'rgba(56,168,245,0.08)', borderRadius: '4px', transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,168,245,0.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(56,168,245,0.08)'}
          >
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(56,168,245,0.45)' }} />)}
            </div>
          </div>
          {/* Collapse button */}
          <button onClick={onToggleCollapse} title="Collapse map" style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, calc(-50% + 44px))',
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--glass-card)', border: '1px solid rgba(56,168,245,0.25)',
            color: '#7ec8f6', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10, transition: 'all 0.18s', boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(13,141,232,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-card)'}
          >
            <PanelRightClose size={12} />
          </button>
        </div>
      )}

      {/* Right panel */}
      {!mapCollapsed && (
        <div style={{
          width: `${100 - leftWidth}%`, minWidth: 0, paddingLeft: '0.75rem',
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
          position: 'sticky', top: '80px',
          height: 'calc(100vh - 100px)', overflow: 'auto',
        }}>
          {right}
        </div>
      )}

      {/* Expand button (when collapsed) */}
      {mapCollapsed && (
        <button onClick={onToggleCollapse} title="Show map" style={{
          position: 'fixed', right: '1.5rem', bottom: '2rem',
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg,#0060c7,#0d8de8)',
          border: 'none', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, boxShadow: '0 4px 20px rgba(13,141,232,0.5)',
          transition: 'all 0.22s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(13,141,232,0.65)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(13,141,232,0.5)'; }}
        >
          <PanelRightOpen size={18} />
        </button>
      )}
    </div>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────
function StatChip({ icon: Icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.55rem 1rem', borderRadius: '999px',
      background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.12)',
    }}>
      <Icon size={13} style={{ color: 'rgba(200,230,255,0.6)', flexShrink: 0 }} />
      <div>
        <p style={{ margin: 0, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,230,255,0.45)' }}>{label}</p>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>{value}</p>
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
  const [activeTab, setActiveTab] = useState('hotels');
  const [mapCollapsed, setMapCollapsed] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const tripRes = await tripsAPI.getOne(id);
      setTrip(tripRes.data);
      try {
        const hotelRes = await hotelsAPI.getForTrip?.(id);
        if (hotelRes?.data?.length) setHotels(hotelRes.data);
      } catch { /* no cached hotels */ }
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
    let keepAliveInterval = null;
    try {
      keepAliveInterval = setInterval(async () => {
        try { await hotelsAPI.searchStatus(); } catch (_) {}
      }, 30000);
      const res = await hotelsAPI.search({
        destination: trip.destination, checkin: trip.start_date,
        checkout: trip.end_date, budget: trip.budget, max_results: 5,
      });
      setHotels(res.data);
    } catch (e) {
      const msg = (e?.code === 'ECONNABORTED' || e?.message?.includes('timeout'))
        ? 'Hotel search is taking longer than expected. Please try again!'
        : e?.response?.data?.detail || 'Hotel search failed. Please try again.';
      alert(msg);
    } finally {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      setSearchingHotels(false);
    }
  };

  const generateItinerary = async () => {
    setGeneratingItinerary(true);
    try {
      const res = await itinerariesAPI.generate(id);
      setItinerary(res.data);
      setActiveTab('itinerary');
    } catch (e) { alert('Failed to generate itinerary.'); }
    finally { setGeneratingItinerary(false); }
  };

  const regenerateItinerary = async () => {
    setRegenerating(true);
    try {
      await itinerariesAPI.delete(id);
      const res = await itinerariesAPI.generate(id);
      setItinerary(res.data);
    } catch (e) { alert('Failed to regenerate.'); }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 style={{ width: 40, height: 40, animation: 'spin 1s linear infinite', color: 'var(--accent-blue)', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-sub)', fontWeight: 600 }}>Loading your trip…</p>
        </div>
      </div>
    );
  }
  if (!trip) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-sub)' }}>Trip not found.</p>
        </div>
      </div>
    );
  }

  const nights = Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000);

  // ── Hotels panel ─────────────────────────────────────────────
  const hotelsLeft = (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Hotel size={18} style={{ color: 'var(--accent-blue)' }} /> Where to Stay
          </h2>
          {hotels.length > 0 && (
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)', opacity: 0.7 }}>{hotels.length} curated picks for your trip</p>
          )}
        </div>
        <RippleBtn onClick={searchHotels} disabled={searchingHotels} className="btn-secondary" style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}>
          {searchingHotels
            ? <><Loader2 style={{ width: 14, height: 14, marginRight: 6, animation: 'spin 1s linear infinite', display: 'inline' }} />Searching…</>
            : <><RefreshCw size={13} style={{ marginRight: 6, display: 'inline' }} />Search Hotels</>
          }
        </RippleBtn>
      </div>

      {hotels.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: mapCollapsed
            ? 'repeat(auto-fill, minmax(220px, 1fr))'
            : '1fr',
          gap: mapCollapsed ? '1rem' : '0.85rem',
        }}>
          {hotels.map((hotel, hi) => (
            <HotelCard key={hotel.id || hi} hotel={hotel} index={hi} isGridMode={mapCollapsed} />
          ))}
        </div>
      ) : (
        <div style={{
          borderRadius: '1rem', border: '1px dashed rgba(56,168,245,0.18)',
          background: 'var(--glass-card)', padding: '3.5rem 2rem', textAlign: 'center',
        }}>
          <Hotel style={{ width: 40, height: 40, margin: '0 auto 0.75rem', color: 'rgba(13,141,232,0.4)' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>No hotels yet</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', opacity: 0.7, margin: 0 }}>
            Click "Search Hotels" to find the best accommodations
          </p>
        </div>
      )}
    </section>
  );

  // ── Itinerary panel ──────────────────────────────────────────
  const itineraryLeft = (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-blue)' }} /> Your Itinerary
          </h2>
          {itinerary && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)', opacity: 0.7 }}>AI-crafted day-by-day plan</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {itinerary && (
            <RippleBtn onClick={regenerateItinerary} disabled={regenerating} className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.42rem 0.85rem' }}>
              {regenerating ? <><Loader2 size={13} style={{ marginRight: 5, animation: 'spin 1s linear infinite', display: 'inline' }} />Regenerating…</> : <><RefreshCw size={13} style={{ marginRight: 5, display: 'inline' }} />Regenerate</>}
            </RippleBtn>
          )}
          {!itinerary && (
            <RippleBtn onClick={generateItinerary} disabled={generatingItinerary} className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>
              {generatingItinerary ? <><Loader2 size={14} style={{ marginRight: 6, animation: 'spin 1s linear infinite', display: 'inline' }} />Generating…</> : 'Generate Itinerary'}
            </RippleBtn>
          )}
        </div>
      </div>

      {generatingItinerary && !itinerary && (
        <div style={{ borderRadius: '1rem', border: '1px solid rgba(56,168,245,0.15)', background: 'var(--glass-card)', padding: '3.5rem 2rem', textAlign: 'center' }}>
          <Waves style={{ width: 36, height: 36, animation: 'float 2s ease-in-out infinite', color: '#0d8de8', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.4rem' }}>Crafting your itinerary…</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', opacity: 0.7, margin: 0 }}>Usually takes 15–30 seconds.</p>
        </div>
      )}

      {itinerary && sections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {highlightSection && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7ec8f6', borderBottom: '1px solid rgba(56,168,245,0.12)' }}>
                <span>{highlightSection.emoji}</span>
                {highlightSection.title.replace(/^[^\w]+/, '')}
              </h2>
              <MarkdownBody body={highlightSection.body.trim()} />
            </div>
          )}

          {daySections.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7ec8f6', borderBottom: '1px solid rgba(56,168,245,0.12)' }}>
                <span>🗓️</span> Day-by-Day Plan
              </h2>
              <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {daySections.map((section, idx) => (
                  <TimelineDayCard key={`day-${idx}`} section={section} idx={idx} />
                ))}
              </div>
            </div>
          )}

          {budgetSection && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7ec8f6', borderBottom: '1px solid rgba(56,168,245,0.12)' }}>
                <span>{budgetSection.emoji}</span>{budgetSection.title.replace(/^[^\w]+/, '')}
              </h2>
              <MarkdownBody body={budgetSection.body.trim()} />
            </div>
          )}

          {knowSection && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7ec8f6', borderBottom: '1px solid rgba(56,168,245,0.12)' }}>
                <span>{knowSection.emoji}</span>{knowSection.title.replace(/^[^\w]+/, '')}
              </h2>
              <MarkdownBody body={knowSection.body.trim()} />
            </div>
          )}
        </div>
      )}

      {itinerary && sections.length === 0 && (
        <div className="card" style={{ padding: '2rem' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.85rem', lineHeight: 1.8, color: 'rgba(189,227,255,0.75)' }}>
            {itinerary.content}
          </pre>
        </div>
      )}

      {!itinerary && !generatingItinerary && (
        <div style={{ borderRadius: '1rem', border: '1px dashed rgba(56,168,245,0.18)', background: 'var(--glass-card)', padding: '3.5rem 2rem', textAlign: 'center' }}>
          <Navigation style={{ width: 36, height: 36, margin: '0 auto 0.75rem', color: 'rgba(13,141,232,0.45)' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.35rem' }}>No itinerary yet</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', opacity: 0.7, margin: 0 }}>
            Click "Generate Itinerary" and we'll map out your whole trip
          </p>
        </div>
      )}
    </section>
  );

  // ── Right panel (map + images) ───────────────────────────────
  const mapPanel = (
    <>
      <div style={{
        flex: activeTab === 'itinerary' ? '0 0 55%' : '1 1 100%',
        minHeight: '300px',
        borderRadius: '1rem',
        overflow: 'hidden',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 6px 28px rgba(0,0,0,0.2)',
      }}>
        {activeTab === 'hotels'
          ? <HotelMap hotels={hotels} destination={destination} />
          : <ItineraryMap destination={destination} />
        }
      </div>

      {activeTab === 'itinerary' && (
        <div className="card" style={{ padding: '1rem', flex: '1 1 auto' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem', color: 'var(--color-ocean-500)' }}>
            <Camera size={12} style={{ display: 'inline', marginRight: 5 }} />
            {destination} Snapshots
          </p>
          <PlaceImagesPanel destination={destination} />
        </div>
      )}
    </>
  );

  return (
    <div style={{ minHeight: '100vh', padding: '2.5rem 1rem', willChange: 'auto' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* ── Trip Header ── */}
        <div style={{
          marginBottom: '2rem',
          borderRadius: '1.5rem',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            padding: '2.5rem 2.5rem',
            position: 'relative', overflow: 'hidden',
            background: isDarkMode
              ? 'linear-gradient(135deg, #001c5e 0%, #003a9e 45%, #0d8de8 100%)'
              : 'linear-gradient(135deg, #0369a1 0%, #0d8de8 60%, #22d3ee 100%)',
          }}>
            {/* Decorative blobs */}
            <div style={{ position: 'absolute', top: '-4rem', right: '-4rem', width: '18rem', height: '18rem', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-5rem', left: '-3rem', width: '22rem', height: '22rem', borderRadius: '50%', background: 'rgba(0,0,0,0.12)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <Waves size={14} style={{ color: 'rgba(200,235,255,0.55)' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,235,255,0.5)' }}>Trip to</span>
              </div>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, color: '#fff', margin: '0 0 1.5rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {trip.destination}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                <StatChip icon={Calendar} label="Dates" value={`${format(new Date(trip.start_date), 'MMM d')} – ${format(new Date(trip.end_date), 'MMM d, yyyy')}`} />
                <StatChip icon={Calendar} label="Duration" value={`${nights} night${nights !== 1 ? 's' : ''}`} />
                <StatChip icon={Users} label="Travelers" value={trip.travelers} />
                <StatChip icon={IndianRupee} label="Budget" value={trip.budget} />
                {trip.interests && <StatChip icon={MapPin} label="Interests" value={trip.interests} />}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab switcher ── */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { key: 'hotels', label: 'Hotels', emoji: '🏨' },
            { key: 'itinerary', label: 'Itinerary', emoji: '📅' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '10px',
              fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
              transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
              border: activeTab === tab.key ? '1px solid rgba(56,168,245,0.4)' : '1px solid var(--glass-border)',
              background: activeTab === tab.key
                ? 'linear-gradient(135deg, rgba(0,96,199,0.7), rgba(13,141,232,0.5))'
                : 'var(--glass-card)',
              color: activeTab === tab.key ? '#fff' : 'var(--text-sub)',
              boxShadow: activeTab === tab.key ? '0 4px 18px rgba(13,141,232,0.3)' : 'none',
              transform: activeTab === tab.key ? 'translateY(-1px)' : 'none',
            }}>
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Split panel ── */}
        <div style={{ minHeight: '70vh' }}>
          <SplitPanel
            mapCollapsed={mapCollapsed}
            onToggleCollapse={() => setMapCollapsed(c => !c)}
            left={
              <div key={activeTab} style={{ animation: 'tabSlideIn 0.28s cubic-bezier(0.16,1,0.3,1) both' }}>
                {activeTab === 'hotels' ? hotelsLeft : itineraryLeft}
              </div>
            }
            right={mapPanel}
          />
        </div>

      </div>
    </div>
  );
}
