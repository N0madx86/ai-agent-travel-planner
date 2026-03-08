import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, IndianRupee, Heart, Loader2, Sparkles } from 'lucide-react';
import { tripsAPI } from '../services/api';
import { format, addDays } from 'date-fns';
import { useRipple } from '../hooks/useAnimations';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await tripsAPI.create(formData);
      navigate(`/trips/${response.data.id}`);
    } catch { alert('Failed to create trip. Please try again.'); }
    finally { setLoading(false); }
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
          <div>
            <FieldLabel icon={MapPin} label="Destination" />
            <input type="text" name="destination" value={formData.destination}
              onChange={handleChange}
              placeholder="e.g. Goa, India  ·  Kyoto, Japan  ·  Lisbon"
              className="input-field text-base" required />
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
                <span className="text-xs font-medium tracking-wide" style={{ color: 'rgba(126,200,246,0.6)' }}>Set a specific amount</span>
              </label>
              {useCustomBudget && (
                <div className="mt-2.5 relative animate-fade-in">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#0d8de8' }}>₹</span>
                  <input type="number" value={customBudget} onChange={handleCustomBudgetChange}
                    placeholder="e.g. 25000" className="input-field pl-7" min="0" />
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(126,200,246,0.35)' }}>Total budget for all travelers, in ₹</p>
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
                    background: 'linear-gradient(135deg, #0060c7, #0d8de8)',
                    color: '#e8f4ff',
                    boxShadow: '0 2px 14px rgba(13,141,232,0.45)',
                    border: '1px solid rgba(56,168,245,0.4)',
                  } : {
                    background: 'rgba(4,21,41,0.7)',
                    color: 'rgba(126,200,246,0.55)',
                    border: '1px solid rgba(56,168,245,0.14)',
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
            {loading
              ? <><Loader2 className="animate-spin w-5 h-5 mr-2 inline" />Creating your trip…</>
              : 'Create My Trip Plan →'}
          </button>
        </form>
      </div>
    </div>
  );
}
