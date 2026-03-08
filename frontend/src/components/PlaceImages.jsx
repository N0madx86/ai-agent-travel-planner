import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Fetches a single image for a place and renders it inline.
 * Shows a shimmer placeholder while loading, fades in on load.
 */
export function InlinePlaceImage({ place, destination = '', className = '' }) {
    const [url, setUrl] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!place) return;
        let cancelled = false;
        api.get('/api/images/place', { params: { q: place, destination } })
            .then(res => { if (!cancelled) setUrl(res.data.url); })
            .catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, [place, destination]);

    if (error || (!url && !loaded)) {
        // Show shimmer until URL arrives
        return (
            <div
                className={`shimmer-bg rounded-xl ${className}`}
                style={{ minHeight: '140px' }}
            />
        );
    }

    return (
        <div className={`relative overflow-hidden rounded-xl group ${className}`}>
            {!loaded && <div className="absolute inset-0 shimmer-bg rounded-xl" />}
            <img
                src={url}
                alt={place}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                className="place-img-inline w-full h-full object-cover"
                style={{
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 0.6s ease',
                    minHeight: '140px',
                    display: 'block',
                }}
            />
            {/* Label on hover */}
            <div
                className="absolute bottom-0 left-0 right-0 p-2 rounded-b-xl"
                style={{
                    background: 'linear-gradient(to top, rgba(2,12,12,0.85), transparent)',
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
            >
                <p className="text-teal-100 text-xs font-medium truncate">{place}</p>
            </div>
        </div>
    );
}

/**
 * Gallery strip for multiple places (used in overview / highlights).
 */
export default function PlaceImages({ places, destination = '' }) {
    if (!places || places.length === 0) return null;
    return (
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {places.slice(0, 6).map((place) => (
                <InlinePlaceImage
                    key={place}
                    place={place}
                    destination={destination}
                    className="flex-shrink-0"
                    style={{ width: '180px', height: '120px' }}
                />
            ))}
        </div>
    );
}
