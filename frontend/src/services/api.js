import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tabi-uul5.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 min — Render free tier cold start + scraping + AI curation
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Session / User ID resolution ─────────────────────────────────────────
// Prefer Google user ID (set by AuthContext) over anonymous session ID
const getUserId = () => {
  const googleUid = localStorage.getItem('tabi_user_id');
  if (googleUid) return googleUid;

  // Fall back to anonymous session for unauthenticated users
  let sid = localStorage.getItem('tabi_session_id');
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('tabi_session_id', sid);
  }
  return sid;
};

// Trips API
export const tripsAPI = {
  create: (tripData) => api.post('/api/trips/', { ...tripData, session_id: getUserId() }),
  getAll: () => api.get('/api/trips/', { params: { session_id: getUserId() } }),
  getOne: (id) => api.get(`/api/trips/${id}`),
  update: (id, tripData) => api.put(`/api/trips/${id}`, tripData),
  delete: (id) => api.delete(`/api/trips/${id}`),
};

// Hotels API
export const hotelsAPI = {
  search: (searchParams) => api.post('/api/hotels/search', searchParams),
  searchStatus: () => api.get('/api/hotels/search/status'),
  getAll: () => api.get('/api/hotels/'),
  clearCache: () => api.delete('/api/hotels/cache'),
};

// Itineraries API
export const itinerariesAPI = {
  generate: (tripId) => api.post(`/api/itineraries/generate/${tripId}`),
  get: (tripId) => api.get(`/api/itineraries/${tripId}`),
  delete: (tripId) => api.delete(`/api/itineraries/${tripId}`),
};

// Images API
export const imagesAPI = {
  getPlaceImage: (query) => api.get('/api/images/place', { params: { q: query } }),
};

// ─── Keep-alive: ping backend every 13 min to prevent Render sleep ───
const KEEP_ALIVE_INTERVAL = 13 * 60 * 1000;
setInterval(() => {
  api.get('/health').catch(() => {}); // silent fail — best-effort
}, KEEP_ALIVE_INTERVAL);

export default api;
