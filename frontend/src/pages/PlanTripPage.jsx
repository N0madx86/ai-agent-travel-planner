import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, IndianRupee, Heart, Loader2, Sparkles } from 'lucide-react';
import { tripsAPI } from '../services/api';
import { format, addDays } from 'date-fns';
import { useRipple } from '../hooks/useAnimations';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tabi-uul5.onrender.com';

// Photon geocoding API (free, no key)
const PHOTON_URL = 'https://photon.komoot.io/api/';
const ALLOWED_PLACE_TYPES = new Set(['city', 'town', 'village', 'locality', 'suburb', 'district', 'borough']);


// Simple user-facing status messages (cycle while searching)
const SEARCH_PHRASES = [
  'Searching best hotels for you…',
  'Curating top picks with AI…',
  'Almost there…',
];

const interestSuggestions = [
  'Beach 🏖️', 'Mountains 🏔️', 'Culture 🎭', 'Adventure 🧗',
  'Food 🍜', 'Shopping 🛍️', 'Nightlife 🌃', 'Nature 🌿',
  'History 🏛️', 'Photography 📸',
];

function FieldLabel({ icon: Icon, label }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-2.5"
      style={{ color: 'var(--text-main)', opacity: 0.6 }}>
      <Icon className="w-3.5 h-3.5" style={{ color: 'var(--color-ocean-500)' }} />
      {label}
    </label>
  );
}

export default function PlanTripPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const phraseTimer = useRef(null);
  const eventSourceRef = useRef(null);
  const [formData, setFormData] = useState({
    destination: '',
    start_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    budget: 'Mid-range',
    interests: '',
    travelers: 2,
  });
  const [customBudget, setCustomBudget] = useState('');
  const [useCustomBudget, setUseCustomBudget] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState([]);

  // ── Photon autocomplete state ─────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef(null);
  const suggestionListRef = useRef(null);

  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`${PHOTON_URL}?q=${encodeURIComponent(query)}&limit=6&lang=en`);
      const json = await res.json();
      const results = (json.features || [])
        .filter(f => ALLOWED_PLACE_TYPES.has(f.properties?.type))
        .map(f => {
          const p = f.properties;
          const parts = [p.name, p.state, p.country].filter(Boolean);
          return { label: parts.join(', '), city: p.name, country: p.country };
        })
        .filter((v, i, arr) => arr.findIndex(x => x.label === v.label) === i) // dedupe
        .slice(0, 5);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleDestinationChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, destination: val }));
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSuggestionSelect = (label) => {
    setFormData(prev => ({ ...prev, destination: label }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleDestinationKeyDown = (e) => {
    if (e.key === 'Escape') setShowSuggestions(false);
  };


  const { rippleRef, createRipple } = useRipple();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleCustomBudgetToggle = (e) => {
    setUseCustomBudget(e.target.checked);
    if (!e.target.checked) { setFormData({ ...formData, budget: 'Mid-range' }); setCustomBudget(''); }
  };
  const handleCustomBudgetChange = (e) => {
    setCustomBudget(e.target.value);
    if (e.target.value) setFormData({ ...formData, budget: e.target.value });
  };
  const toggleInterest = (interest) => {
    const updated = selectedInterests.includes(interest)
      ? selectedInterests.filter(i => i !== interest)
      : [...selectedInterests, interest];
    setSelectedInterests(updated);
    setFormData({ ...formData, interests: updated.join(', ') });
  };

  // Cycle through friendly loading phrases
  const startPhraseRotation = () => {
    setPhraseIdx(0);
    let idx = 0;
    phraseTimer.current = setInterval(() => {
      idx = (idx + 1) % SEARCH_PHRASES.length;
      setPhraseIdx(idx);
    }, 3000);
  };

  const stopPhraseRotation = () => {
    if (phraseTimer.current) {
      clearInterval(phraseTimer.current);
      phraseTimer.current = null;
    }
  };

  // Open SSE stream to track search progress
  const openSearchStream = (onDone) => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource(`${API_BASE_URL}/api/hotels/search/stream`);
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.done) {
          es.close();
          eventSourceRef.current = null;
          onDone();
        }
      } catch {}
    };
    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
    };
  };

  // Cleanup on unmount
  useEffect(() => () => {
    stopPhraseRotation();
    if (eventSourceRef.current) eventSourceRef.current.close();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    startPhraseRotation();
    // Open SSE stream so backend can push progress (optional UX enhancement)
    openSearchStream(() => {});
    try {
      const response = await tripsAPI.create(formData);
      stopPhraseRotation();
      navigate(`/trips/${response.data.id}`);
    } catch {
      alert('Failed to create trip. Please try again.');
      stopPhraseRotation();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-5"
            style={{ background: 'var(--badge-bg)', border: '1px solid var(--badge-border)', color: 'var(--badge-color)' }}>
            <Sparkles className="w-3.5 h-3.5" /> New Trip
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-main mb-3 leading-tight">
            Where are you<br /><span className="gradient-text">headed next?</span>
          </h1>
          <p className="text-sub text-base">Fill in the details and we'll build you a plan worth following.</p>
        </div>

        <form onSubmit={handleSubmit}
          className="card p-8 sm:p-10 space-y-7 animate-slide-up">

          {/* Destination */}
          <div className="relative">
            <FieldLabel icon={MapPin} label="Destination" />
            <input
              type="text"
              name="destination"
              id="destination-input"
              value={formData.destination}
              onChange={handleDestinationChange}
              onKeyDown={handleDestinationKeyDown}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="e.g. Goa, Calangute  ·  Kyoto  ·  Lisbon"
              className="input-field text-base"
              required
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul
                ref={suggestionListRef}
                className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--badge-border)',
                }}
              >
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    onMouseDown={() => handleSuggestionSelect(s.label)}
                    className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-sm transition-colors duration-150"
                    style={{ color: 'var(--text-main)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--badge-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-ocean-500)' }} />
                    {s.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel icon={Calendar} label="Start Date" />
              <input type="date" name="start_date" value={formData.start_date}
                onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <FieldLabel icon={Calendar} label="End Date" />
              <input type="date" name="end_date" value={formData.end_date}
                onChange={handleChange} className="input-field" required />
            </div>
          </div>

          {/* Budget + Travelers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel icon={IndianRupee} label="Budget" />
              <select name="budget"
                value={useCustomBudget ? '__custom__' : formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                disabled={useCustomBudget} className="input-field disabled:opacity-40">
                {['Budget', 'Mid-range', 'Luxury'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input type="checkbox" checked={useCustomBudget}
                  onChange={handleCustomBudgetToggle}
                  className="w-3.5 h-3.5 rounded cursor-pointer accent-ocean-500" />
                <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-sub)' }}>Set a specific amount</span>
              </label>
              {useCustomBudget && (
                <div className="mt-2.5 relative animate-fade-in">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-ocean-500)' }}>₹</span>
                  <input type="number" value={customBudget} onChange={handleCustomBudgetChange}
                    placeholder="e.g. 25000" className="input-field pl-7" min="0" />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-sub)', opacity: 0.6 }}>Total budget for all travelers, in ₹</p>
                </div>
              )}
            </div>
            <div>
              <FieldLabel icon={Users} label="Travelers" />
              <input type="number" name="travelers" value={formData.travelers}
                onChange={handleChange} min="1" max="20" className="input-field" required />
            </div>
          </div>

          {/* Interests */}
          <div>
            <FieldLabel icon={Heart} label="What are you into?" />
            <div className="flex flex-wrap gap-2 mb-4">
              {interestSuggestions.map(interest => (
                <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${selectedInterests.includes(interest) ? 'scale-105' : ''}`}
                  style={selectedInterests.includes(interest) ? {
                    background: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-color)',
                    boxShadow: '0 2px 14px rgba(13,141,232,0.45)',
                    border: '1px solid var(--badge-border)',
                  } : {
                    background: 'var(--badge-bg)',
                    color: 'var(--badge-color)',
                    border: '1px solid var(--badge-border)',
                  }}>
                  {interest}
                </button>
              ))}
            </div>
            <input type="text" name="interests" value={formData.interests}
              onChange={handleChange}
              placeholder="Or type your own (e.g. diving, street art, rooftop bars)"
              className="input-field text-sm" />
          </div>

          <button type="submit" ref={rippleRef} onClick={createRipple}
            disabled={loading} className="btn-primary w-full py-4 text-base">
            {loading ? (
              <span className="flex flex-col items-center gap-1">
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span className="font-semibold">{SEARCH_PHRASES[phraseIdx]}</span>
                </span>
                <span className="text-xs opacity-60 font-normal tracking-wide">This may take a moment on first search</span>
              </span>
            ) : 'Create My Trip Plan →'}
          </button>
        </form>
      </div>
    </div>
  );
}
