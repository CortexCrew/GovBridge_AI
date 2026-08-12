const API_BASE = 'http://localhost:5000/api';

// Helper to handle API requests with fallback to local state if backend is offline
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // If payload is FormData, let browser set Content-Type
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn(`[API] Connection to ${endpoint} failed. Using offline simulation response.`, err);
    return null; // Signals fallback to local component state
  }
}
