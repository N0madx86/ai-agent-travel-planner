import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tabi-c5cx.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Trips API
export const tripsAPI = {
  create: (tripData) => api.post('/api/trips/', tripData),
  getAll: () => api.get('/api/trips/'),
  getOne: (id) => api.get(`/api/trips/${id}`),
  update: (id, tripData) => api.put(`/api/trips/${id}`, tripData),
  delete: (id) => api.delete(`/api/trips/${id}`),
};

// Hotels API
export const hotelsAPI = {
  search: (searchParams) => api.post('/api/hotels/search', searchParams),
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

export default api;
