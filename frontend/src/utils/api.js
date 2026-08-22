import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : 'https://kaizen-yrgj.onrender.com/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (username, password, role) => 
    api.post('/auth/login', { username, password, role }),
  verify: (token) => 
    api.post('/auth/verify', { token }),
  changePassword: (data) =>
    api.post('/auth/change-password', data)
};

// Contests
export const contestsAPI = {
  getAll: () => api.get('/contests'),
  create: (data) => api.post('/contests', data),
  update: (id, data) => api.put(`/contests/${id}`, data),
  delete: (id) => api.delete(`/contests/${id}`),
  setScoreUpdates: (id, allowScoreUpdates) =>
    api.post(`/contests/${id}/score-updates`, { allowScoreUpdates }),
  publish: (id) => api.post(`/contests/${id}/publish`),
  unpublish: (id) => api.post(`/contests/${id}/unpublish`)
};

// Juries
export const juriesAPI = {
  getAll: () => api.get('/juries'),
  create: (data) => api.post('/juries', data),
  update: (id, data) => api.put(`/juries/${id}`, data),
  delete: (id) => api.delete(`/juries/${id}`)
};

// Teams
export const teamsAPI = {
  getAll: () => api.get('/teams'),
  create: (data) => api.post('/teams', data),
  bulkCreate: (data) => api.post('/teams/bulk-import', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`)
};

// Assignments
export const assignmentsAPI = {
  getAll: () => api.get('/hall-assignments'),
  create: (data) => api.post('/hall-assignments', data),
  update: (id, data) => api.put(`/hall-assignments/${id}`, data),
  delete: (id) => api.delete(`/hall-assignments/${id}`)
};

// Evaluations
export const evaluationsAPI = {
  getAll: () => api.get('/evaluations'),
  submit: (data) => api.post('/evaluations/submit', data)
};

// State
export const stateAPI = {
  getSnapshot: () => api.get('/state/snapshot'),
  setActiveContest: (activeContestId) =>
    api.post('/state/active-contest', { activeContestId })
};

export default api;
