import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, ArrowRight, Loader2, Compass, Trash2, X } from 'lucide-react';
import { tripsAPI } from '../services/api';
import { format } from 'date-fns';
import { animateCards } from '../hooks/useAnimations';

// Ocean blue gradient pairs for card headers
const GRAD_PAIRS = [
  ['rgba(0,96,199,0.8)', 'rgba(13,141,232,0.55)'],
  ['rgba(7,30,56,0.9)', 'rgba(0,96,199,0.6)'],
  ['rgba(13,141,232,0.6)', 'rgba(56,168,245,0.4)'],
  ['rgba(0,60,138,0.85)', 'rgba(0,96,199,0.5)'],
  ['rgba(4,72,160,0.8)', 'rgba(13,141,232,0.45)'],
];

export default function MyTripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = () => {
    tripsAPI.getAll()
      .then(r => { setTrips(r.data); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleDeleteTrip = async (e, tripId, destination) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await tripsAPI.delete(tripId);
      setTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (err) {
      console.error('Failed to delete trip:', err);
      alert('Could not delete trip. Please try again.');
    }
  };

  // Animate cards once loaded (bonus — CSS already fades them in)
  useEffect(() => {
    if (!loading && trips.length > 0) {
      setTimeout(() => animateCards('.trip-card', 0), 80);
    }
  }, [loading, trips.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3" style={{ color: 'var(--color-ocean-500)' }} />
          <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'rgba(56,168,245,0.45)' }}>Loading trips…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-10 animate-fade-in">
          <div>
            <h1 className="text-4xl font-black mb-1" style={{ color: 'var(--text-main)' }}>My Trips</h1>
            <p className="text-xs tracking-wide uppercase font-medium" style={{ color: 'var(--text-sub)' }}>Your collection of adventures</p>
          </div>
          <Link to="/plan" className="btn-primary text-sm px-5 py-2.5">+ New Trip</Link>
        </div>

        {trips.length === 0 ? (
          <div className="card p-20 text-center">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-float"
              style={{ background: 'rgba(13,141,232,0.12)', border: '1px solid var(--glass-border)' }}>
              <Compass className="h-10 w-10" style={{ color: 'var(--color-ocean-400)' }} />
            </div>
            <p className="text-xl font-bold text-main mb-2">No trips yet</p>
            <p className="mb-8 text-sm" style={{ color: 'rgba(56,168,245,0.4)' }}>Every great journey starts with a single plan.</p>
            <Link to="/plan" className="btn-primary px-8 py-3">Plan Your First Trip</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trips.map((trip, idx) => {
              const [c1, c2] = GRAD_PAIRS[idx % GRAD_PAIRS.length];
              const nights = Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000);
              return (
                <Link key={trip.id} to={`/trips/${trip.id}`}
                  className="trip-card card card-hover group block relative animate-fade-in"
                  style={{ animationDelay: `${idx * 55}ms`, animationFillMode: 'both' }}>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteTrip(e, trip.id, trip.destination)}
                    className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-black/20 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all border border-white/5 hover:border-red-500/30"
                    title="Delete Trip"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="h-32 relative overflow-hidden rounded-t-[1.25rem] flex flex-col justify-end p-5"
                    style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)` }}>
                    <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    <h3 className="text-lg font-bold text-white leading-tight transition-colors">{trip.destination}</h3>
                    <p className="text-white/55 text-xs mt-0.5">
                      {format(new Date(trip.start_date), 'MMM d')} – {format(new Date(trip.end_date), 'MMM d, yyyy')} · {nights} nights
                    </p>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="badge">{trip.budget}</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-sub)' }}>
                        <Users className="w-3 h-3" />
                        {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all flex-shrink-0" style={{ color: 'var(--color-ocean-400)', opacity: 0.5 }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
